import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "./useAuth";
import { getToken } from "@/utils/token";
import {
    ConnectionStatus,
    WSMessage,
    WSEventType,
    TypedWSEvent,
    OrderCreatedPayload,
    OrderStatusUpdatedPayload,
    CycleCountUpdatedPayload,
    StoreActivityPayload,
    OrderCreatedEvent,
    OrderStatusUpdatedEvent,
    CycleCountUpdatedEvent,
    StoreActivityEvent,
} from "@/types/websocket.types";

export function getWebSocketUrl(baseUrl: string, token: string, storeId: number): string {
    const cleanBase = (baseUrl || "http://localhost:8080").trim().replace(/\/+$/, "");
    const wsProtocol = cleanBase.startsWith("https://")
        ? cleanBase.replace(/^https:\/\//i, "wss://")
        : cleanBase.replace(/^http:\/\//i, "ws://");

    return `${wsProtocol}/api/v1/ws?token=${encodeURIComponent(token)}&store_id=${encodeURIComponent(storeId.toString())}`;
}

export function calculateBackoffDelay(attempt: number): number {
    const delay = 1000 * Math.pow(2, attempt);
    return Math.min(delay, 15000);
}

export interface UseWebSocketOptions {
    url?: string;
    storeId?: number;
    autoConnect?: boolean;
    maxHistorySize?: number;
    onEvent?: (event: TypedWSEvent) => void;
    onOrderCreated?: (payload: OrderCreatedPayload, raw: OrderCreatedEvent) => void;
    onOrderStatusUpdated?: (payload: OrderStatusUpdatedPayload, raw: OrderStatusUpdatedEvent) => void;
    onCycleCountUpdated?: (payload: CycleCountUpdatedPayload, raw: CycleCountUpdatedEvent) => void;
    onStoreActivity?: (payload: StoreActivityPayload, raw: StoreActivityEvent) => void;
    onStatusChange?: (status: ConnectionStatus) => void;
}

export interface UseWebSocketReturn {
    connectionStatus: ConnectionStatus;
    status: ConnectionStatus;
    isConnected: boolean;
    events: TypedWSEvent[];
    lastEvent: TypedWSEvent | null;
    latestOrderCreated: OrderCreatedPayload | null;
    latestOrderStatusUpdated: OrderStatusUpdatedPayload | null;
    latestCycleCountUpdated: CycleCountUpdatedPayload | null;
    latestStoreActivity: StoreActivityPayload | null;
    reconnect: () => void;
    disconnect: () => void;
    sendMessage: (data: unknown) => boolean;
    send: (data: unknown) => boolean;
    sendPing: () => boolean;
    subscribe: {
        <T = unknown>(handler: (event: WSMessage<T>) => void): () => void;
        <T = unknown>(eventType: WSEventType | "*", handler: (event: WSMessage<T>) => void): () => void;
    };
    clearHistory: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
    const {
        url: customUrl,
        storeId: customStoreId,
        autoConnect = true,
        maxHistorySize = 50,
    } = options;

    const { token: authContextToken, user, isAuthenticated } = useAuth();

    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
    const [events, setEvents] = useState<TypedWSEvent[]>([]);
    const [lastEvent, setLastEvent] = useState<TypedWSEvent | null>(null);
    const [latestOrderCreated, setLatestOrderCreated] = useState<OrderCreatedPayload | null>(null);
    const [latestOrderStatusUpdated, setLatestOrderStatusUpdated] = useState<OrderStatusUpdatedPayload | null>(null);
    const [latestCycleCountUpdated, setLatestCycleCountUpdated] = useState<CycleCountUpdatedPayload | null>(null);
    const [latestStoreActivity, setLatestStoreActivity] = useState<StoreActivityPayload | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptRef = useRef<number>(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef<boolean>(true);
    const isIntentionallyClosedRef = useRef<boolean>(false);
    const isSuspendedRef = useRef<boolean>(false);
    const optionsRef = useRef<UseWebSocketOptions>(options);
    optionsRef.current = options;

    const listenersRef = useRef<Map<WSEventType | "*", Set<(event: TypedWSEvent) => void>>>(new Map());

    const updateStatus = useCallback((newStatus: ConnectionStatus) => {
        if (!isMountedRef.current) return;
        setConnectionStatus((prev) => {
            if (prev !== newStatus) {
                optionsRef.current.onStatusChange?.(newStatus);
            }
            return newStatus;
        });
    }, []);

    const clearReconnectTimeout = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    const sendMessage = useCallback((data: unknown): boolean => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                const message = typeof data === "string" ? data : JSON.stringify(data);
                wsRef.current.send(message);
                return true;
            } catch (err) {
                console.warn("[useWebSocket] Send error:", err);
                return false;
            }
        }
        return false;
    }, []);

    const sendPing = useCallback((): boolean => {
        const storeId = customStoreId ?? user?.store_id ?? 2;
        return sendMessage({
            type: "ping",
            store_id: storeId,
            timestamp: new Date().toISOString(),
        });
    }, [customStoreId, user?.store_id, sendMessage]);

    const subscribe = useCallback(<T = unknown>(
        eventTypeOrHandler: WSEventType | "*" | ((event: WSMessage<T>) => void),
        maybeHandler?: (event: WSMessage<T>) => void
    ): (() => void) => {
        let eventType: WSEventType | "*";
        let handler: (event: TypedWSEvent) => void;

        if (typeof eventTypeOrHandler === "function") {
            eventType = "*";
            handler = eventTypeOrHandler as (event: TypedWSEvent) => void;
        } else {
            eventType = eventTypeOrHandler;
            handler = (maybeHandler || (() => {})) as (event: TypedWSEvent) => void;
        }

        if (!listenersRef.current.has(eventType)) {
            listenersRef.current.set(eventType, new Set());
        }
        const set = listenersRef.current.get(eventType)!;
        set.add(handler);

        return () => {
            set.delete(handler);
            if (set.size === 0) {
                listenersRef.current.delete(eventType);
            }
        };
    }, []) as UseWebSocketReturn["subscribe"];

    const clearHistory = useCallback(() => {
        setEvents([]);
        setLastEvent(null);
    }, []);

    const disconnect = useCallback(() => {
        isIntentionallyClosedRef.current = true;
        clearReconnectTimeout();
        if (wsRef.current) {
            wsRef.current.close(1000, "Client disconnected intentionally");
            wsRef.current = null;
        }
        updateStatus("disconnected");
    }, [clearReconnectTimeout, updateStatus]);

    const connect = useCallback(async () => {
        if (!isAuthenticated) {
            updateStatus("disconnected");
            return;
        }

        let activeToken = authContextToken;
        if (!activeToken) {
            activeToken = await getToken();
        }

        const targetStoreId = customStoreId ?? user?.store_id ?? 2;

        if (!activeToken || !targetStoreId) {
            updateStatus("disconnected");
            return;
        }

        if (
            wsRef.current &&
            (wsRef.current.readyState === WebSocket.OPEN ||
                wsRef.current.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }

        isIntentionallyClosedRef.current = false;
        clearReconnectTimeout();

        updateStatus(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");

        const baseUrl = customUrl || process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";
        const wsUrl = getWebSocketUrl(baseUrl, activeToken, targetStoreId);

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMountedRef.current || wsRef.current !== ws) {
                    ws.close();
                    return;
                }
                reconnectAttemptRef.current = 0;
                updateStatus("connected");
            };

            ws.onmessage = (event: WebSocketMessageEvent) => {
                if (!isMountedRef.current || wsRef.current !== ws) return;
                try {
                    const rawData = typeof event.data === "string" ? event.data : "";
                    if (!rawData) return;

                    const parsed: TypedWSEvent = JSON.parse(rawData);

                    if (parsed.type === "ping") {
                        ws.send(
                            JSON.stringify({
                                type: "pong",
                                store_id: targetStoreId,
                                timestamp: new Date().toISOString(),
                            })
                        );
                        return;
                    }
                    if (parsed.type === "pong") {
                        return;
                    }

                    setLastEvent(parsed);
                    setEvents((prev) => [parsed, ...prev].slice(0, maxHistorySize));

                    switch (parsed.type) {
                        case "order_created": {
                            const p = parsed.payload as OrderCreatedPayload;
                            setLatestOrderCreated(p);
                            optionsRef.current.onOrderCreated?.(p, parsed as OrderCreatedEvent);
                            break;
                        }
                        case "order_status_updated": {
                            const p = parsed.payload as OrderStatusUpdatedPayload;
                            setLatestOrderStatusUpdated(p);
                            optionsRef.current.onOrderStatusUpdated?.(p, parsed as OrderStatusUpdatedEvent);
                            break;
                        }
                        case "cycle_count_updated": {
                            const p = parsed.payload as CycleCountUpdatedPayload;
                            setLatestCycleCountUpdated(p);
                            optionsRef.current.onCycleCountUpdated?.(p, parsed as CycleCountUpdatedEvent);
                            break;
                        }
                        case "store_activity": {
                            const p = parsed.payload as StoreActivityPayload;
                            setLatestStoreActivity(p);
                            optionsRef.current.onStoreActivity?.(p, parsed as StoreActivityEvent);
                            break;
                        }
                    }

                    optionsRef.current.onEvent?.(parsed);

                    const specificListeners = listenersRef.current.get(parsed.type);
                    specificListeners?.forEach((fn) => fn(parsed));

                    const wildcardListeners = listenersRef.current.get("*");
                    wildcardListeners?.forEach((fn) => fn(parsed));
                } catch (err) {
                    console.warn("[useWebSocket] Failed to parse message:", err);
                }
            };

            ws.onerror = (err) => {
                if (!isMountedRef.current || wsRef.current !== ws) return;
                console.warn("[useWebSocket] Socket error:", err);
            };

            ws.onclose = (e: WebSocketCloseEvent) => {
                if (wsRef.current === ws) {
                    wsRef.current = null;
                }
                if (!isMountedRef.current || wsRef.current !== null) return;

                if (isIntentionallyClosedRef.current || e.code === 1000) {
                    updateStatus("disconnected");
                    return;
                }

                if (isSuspendedRef.current) {
                    updateStatus("disconnected");
                    return;
                }

                updateStatus("reconnecting");
                const delay = calculateBackoffDelay(reconnectAttemptRef.current);
                reconnectAttemptRef.current += 1;

                clearReconnectTimeout();
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current && !isSuspendedRef.current && isAuthenticated) {
                        connect();
                    }
                }, delay);
            };
        } catch (err) {
            console.warn("[useWebSocket] Connection attempt failed:", err);
            updateStatus("disconnected");
        }
    }, [
        isAuthenticated,
        authContextToken,
        customStoreId,
        user?.store_id,
        customUrl,
        maxHistorySize,
        clearReconnectTimeout,
        updateStatus,
    ]);

    const reconnect = useCallback(() => {
        reconnectAttemptRef.current = 0;
        if (wsRef.current) {
            isIntentionallyClosedRef.current = true;
            const oldWs = wsRef.current;
            wsRef.current = null;
            oldWs.onopen = null;
            oldWs.onmessage = null;
            oldWs.onerror = null;
            oldWs.onclose = null;
            oldWs.close(1000, "Manual reconnect triggered");
        }
        connect();
    }, [connect]);

    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === "active") {
                isSuspendedRef.current = false;
                if (
                    isAuthenticated &&
                    (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)
                ) {
                    reconnectAttemptRef.current = 0;
                    connect();
                }
            } else if (nextAppState === "background" || nextAppState === "inactive") {
                isSuspendedRef.current = true;
                clearReconnectTimeout();
                if (wsRef.current) {
                    const oldWs = wsRef.current;
                    wsRef.current = null;
                    oldWs.onopen = null;
                    oldWs.onmessage = null;
                    oldWs.onerror = null;
                    oldWs.onclose = null;
                    oldWs.close(1000, "App backgrounded");
                }
                updateStatus("disconnected");
            }
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, [isAuthenticated, connect, clearReconnectTimeout, updateStatus]);

    const prevStoreIdRef = useRef<number | undefined>(customStoreId);
    useEffect(() => {
        if (prevStoreIdRef.current !== undefined && prevStoreIdRef.current !== customStoreId) {
            prevStoreIdRef.current = customStoreId;
            reconnect();
        } else {
            prevStoreIdRef.current = customStoreId;
        }
    }, [customStoreId, reconnect]);

    useEffect(() => {
        isMountedRef.current = true;
        if (autoConnect && isAuthenticated) {
            connect();
        }

        return () => {
            isMountedRef.current = false;
            isIntentionallyClosedRef.current = true;
            clearReconnectTimeout();
            if (wsRef.current) {
                const oldWs = wsRef.current;
                wsRef.current = null;
                oldWs.onopen = null;
                oldWs.onmessage = null;
                oldWs.onerror = null;
                oldWs.onclose = null;
                oldWs.close(1000, "Component unmounted");
            }
        };
    }, [autoConnect, isAuthenticated, connect, clearReconnectTimeout]);

    return {
        connectionStatus,
        status: connectionStatus,
        isConnected: connectionStatus === "connected",
        events,
        lastEvent,
        latestOrderCreated,
        latestOrderStatusUpdated,
        latestCycleCountUpdated,
        latestStoreActivity,
        reconnect,
        disconnect,
        sendMessage,
        send: sendMessage,
        sendPing,
        subscribe,
        clearHistory,
    };
}
