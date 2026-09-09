// radius-frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "./useAuth";
import { getToken } from "@/utils/token";
import {
    ConnectionStatus,
    WSMessage,
    WSEvent,
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

/**
 * Derive WebSocket endpoint URL from base HTTP API URL.
 * Converts http:// -> ws:// and https:// -> wss://, appending /api/v1/ws with token and store_id.
 */
export function getWebSocketUrl(baseUrl: string, token: string, storeId: number): string {
    const cleanBase = (baseUrl || "http://localhost:8080").trim().replace(/\/+$/, "");
    const wsProtocol = cleanBase.startsWith("https://")
        ? cleanBase.replace(/^https:\/\//i, "wss://")
        : cleanBase.replace(/^http:\/\//i, "ws://");

    return `${wsProtocol}/api/v1/ws?token=${encodeURIComponent(token)}&store_id=${encodeURIComponent(storeId.toString())}`;
}

/**
 * Exponential backoff schedule: 1s, 2s, 4s, 8s, max 15s.
 */
export function calculateBackoffDelay(attempt: number): number {
    const delay = 1000 * Math.pow(2, attempt);
    return Math.min(delay, 15000);
}

export interface UseWebSocketOptions {
    /** Override default API URL */
    url?: string;
    /** Override target store ID (defaults to user.store_id) */
    storeId?: number;
    /** Automatically connect on mount when authenticated (default: true) */
    autoConnect?: boolean;
    /** Maximum number of events to retain in reactive history (default: 50) */
    maxHistorySize?: number;
    /** Catch-all listener for every received typed event */
    onEvent?: (event: TypedWSEvent) => void;
    /** Dedicated listener for order created events */
    onOrderCreated?: (payload: OrderCreatedPayload, raw: OrderCreatedEvent) => void;
    /** Dedicated listener for order status changes */
    onOrderStatusUpdated?: (payload: OrderStatusUpdatedPayload, raw: OrderStatusUpdatedEvent) => void;
    /** Dedicated listener for cycle count progress and state changes */
    onCycleCountUpdated?: (payload: CycleCountUpdatedPayload, raw: CycleCountUpdatedEvent) => void;
    /** Dedicated listener for store activity events */
    onStoreActivity?: (payload: StoreActivityPayload, raw: StoreActivityEvent) => void;
    /** Listener for connection status transitions */
    onStatusChange?: (status: ConnectionStatus) => void;
}

export interface UseWebSocketReturn {
    /** Current real-time connection status */
    connectionStatus: ConnectionStatus;
    /** Alias for connectionStatus */
    status: ConnectionStatus;
    /** Boolean shorthand: true when status === 'connected' */
    isConnected: boolean;
    /** Array of recent events (bounded by maxHistorySize, newest first) */
    events: TypedWSEvent[];
    /** The single most recent event received */
    lastEvent: TypedWSEvent | null;
    /** The most recent OrderCreated payload */
    latestOrderCreated: OrderCreatedPayload | null;
    /** The most recent OrderStatusUpdated payload */
    latestOrderStatusUpdated: OrderStatusUpdatedPayload | null;
    /** The most recent CycleCountUpdated payload */
    latestCycleCountUpdated: CycleCountUpdatedPayload | null;
    /** The most recent StoreActivity payload */
    latestStoreActivity: StoreActivityPayload | null;
    /** Manually initiate or force-reconnect the WebSocket */
    reconnect: () => void;
    /** Manually close and disconnect the WebSocket */
    disconnect: () => void;
    /** Send arbitrary payload or raw message over the socket */
    sendMessage: (data: unknown) => boolean;
    /** Alias for sendMessage */
    send: (data: unknown) => boolean;
    /** Send an application-level ping frame */
    sendPing: () => boolean;
    /** Subscribe dynamically to a specific event type with auto-cleanup */
    subscribe: <T = unknown>(
        eventType: WSEventType | "*",
        handler: (event: WSMessage<T>) => void
    ) => () => void;
    /** Clear the in-memory event history buffer */
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

    // Reactive states
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
    const [events, setEvents] = useState<TypedWSEvent[]>([]);
    const [lastEvent, setLastEvent] = useState<TypedWSEvent | null>(null);
    const [latestOrderCreated, setLatestOrderCreated] = useState<OrderCreatedPayload | null>(null);
    const [latestOrderStatusUpdated, setLatestOrderStatusUpdated] = useState<OrderStatusUpdatedPayload | null>(null);
    const [latestCycleCountUpdated, setLatestCycleCountUpdated] = useState<CycleCountUpdatedPayload | null>(null);
    const [latestStoreActivity, setLatestStoreActivity] = useState<StoreActivityPayload | null>(null);

    // Refs to keep track of mutable socket lifecycle without triggering unneeded re-renders
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptRef = useRef<number>(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef<boolean>(true);
    const isIntentionallyClosedRef = useRef<boolean>(false);
    const isSuspendedRef = useRef<boolean>(false);
    const optionsRef = useRef<UseWebSocketOptions>(options);
    optionsRef.current = options;

    // Subscriptions registry for dynamic listener registration: eventType -> Set of handlers
    const listenersRef = useRef<Map<WSEventType | "*", Set<(event: TypedWSEvent) => void>>>(new Map());

    // Update connection status helper with callback notification
    const updateStatus = useCallback((newStatus: ConnectionStatus) => {
        if (!isMountedRef.current) return;
        setConnectionStatus((prev) => {
            if (prev !== newStatus) {
                optionsRef.current.onStatusChange?.(newStatus);
            }
            return newStatus;
        });
    }, []);

    // Cleanly cancel any pending reconnect timeout
    const clearReconnectTimeout = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    // Send payload helper
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

    // Ping helper
    const sendPing = useCallback((): boolean => {
        const storeId = customStoreId ?? user?.store_id ?? 2;
        return sendMessage({
            type: "ping",
            store_id: storeId,
            timestamp: new Date().toISOString(),
        });
    }, [customStoreId, user?.store_id, sendMessage]);

    // Dynamic subscription handler
    const subscribe = useCallback(<T = unknown>(
        eventType: WSEventType | "*",
        handler: (event: WSMessage<T>) => void
    ): (() => void) => {
        if (!listenersRef.current.has(eventType)) {
            listenersRef.current.set(eventType, new Set());
        }
        const set = listenersRef.current.get(eventType)!;
        const castedHandler = handler as (event: TypedWSEvent) => void;
        set.add(castedHandler);

        return () => {
            set.delete(castedHandler);
            if (set.size === 0) {
                listenersRef.current.delete(eventType);
            }
        };
    }, []);

    // Clear history helper
    const clearHistory = useCallback(() => {
        setEvents([]);
        setLastEvent(null);
    }, []);

    // Disconnect method
    const disconnect = useCallback(() => {
        isIntentionallyClosedRef.current = true;
        clearReconnectTimeout();
        if (wsRef.current) {
            wsRef.current.close(1000, "Client disconnected intentionally");
            wsRef.current = null;
        }
        updateStatus("disconnected");
    }, [clearReconnectTimeout, updateStatus]);

    // Primary Connect method
    const connect = useCallback(async () => {
        // Guard: check authentication
        if (!isAuthenticated) {
            updateStatus("disconnected");
            return;
        }

        // Resolve token from context or fallback to SecureStore
        let activeToken = authContextToken;
        if (!activeToken) {
            activeToken = await getToken();
        }

        const targetStoreId = customStoreId ?? user?.store_id ?? 2;

        if (!activeToken || !targetStoreId) {
            updateStatus("disconnected");
            return;
        }

        // Avoid duplicate concurrent connections
        if (
            wsRef.current &&
            (wsRef.current.readyState === WebSocket.OPEN ||
                wsRef.current.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }

        isIntentionallyClosedRef.current = false;
        clearReconnectTimeout();

        // Status update: reconnecting vs connecting
        updateStatus(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");

        const baseUrl = customUrl || process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";
        const wsUrl = getWebSocketUrl(baseUrl, activeToken, targetStoreId);

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMountedRef.current) {
                    ws.close();
                    return;
                }
                reconnectAttemptRef.current = 0;
                updateStatus("connected");
            };

            ws.onmessage = (event: WebSocketMessageEvent) => {
                if (!isMountedRef.current) return;
                try {
                    const rawData = typeof event.data === "string" ? event.data : "";
                    if (!rawData) return;

                    const parsed: TypedWSEvent = JSON.parse(rawData);

                    // Automatic Heartbeat Handling
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

                    // Update history states
                    setLastEvent(parsed);
                    setEvents((prev) => [parsed, ...prev].slice(0, maxHistorySize));

                    // Dispatch to specialized state hooks & options callbacks
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

                    // Dispatch to generic onEvent callback
                    optionsRef.current.onEvent?.(parsed);

                    // Dispatch to dynamic imperative listeners
                    const specificListeners = listenersRef.current.get(parsed.type);
                    specificListeners?.forEach((fn) => fn(parsed));

                    const wildcardListeners = listenersRef.current.get("*");
                    wildcardListeners?.forEach((fn) => fn(parsed));
                } catch (err) {
                    console.warn("[useWebSocket] Failed to parse message:", err);
                }
            };

            ws.onerror = (err) => {
                console.warn("[useWebSocket] Socket error:", err);
            };

            ws.onclose = (e: WebSocketCloseEvent) => {
                wsRef.current = null;
                if (!isMountedRef.current) return;

                // If closure was intentional (unmount, logout, backgrounded, or code 1000), do not reconnect
                if (isIntentionallyClosedRef.current || e.code === 1000) {
                    updateStatus("disconnected");
                    return;
                }

                // If app is currently suspended, mark disconnected and wait for foreground resume
                if (isSuspendedRef.current) {
                    updateStatus("disconnected");
                    return;
                }

                // Schedule auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 15s)
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

    // Force-reconnect wrapper (resets attempt counter)
    const reconnect = useCallback(() => {
        reconnectAttemptRef.current = 0;
        if (wsRef.current) {
            isIntentionallyClosedRef.current = true;
            wsRef.current.close(1000, "Manual reconnect triggered");
            wsRef.current = null;
        }
        connect();
    }, [connect]);

    // AppState lifecycle listener (active -> reconnect, background -> clean disconnect/suspend)
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === "active") {
                isSuspendedRef.current = false;
                // Reconnect if currently disconnected or socket is null
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
                    wsRef.current.close(1000, "App backgrounded");
                    wsRef.current = null;
                }
                updateStatus("disconnected");
            }
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, [isAuthenticated, connect, clearReconnectTimeout, updateStatus]);

    // Reconnect when customStoreId changes dynamically
    const prevStoreIdRef = useRef<number | undefined>(customStoreId);
    useEffect(() => {
        if (prevStoreIdRef.current !== undefined && prevStoreIdRef.current !== customStoreId) {
            prevStoreIdRef.current = customStoreId;
            reconnect();
        } else {
            prevStoreIdRef.current = customStoreId;
        }
    }, [customStoreId, reconnect]);

    // Auto-connect on mount and cleanup on unmount
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
                wsRef.current.close(1000, "Component unmounted");
                wsRef.current = null;
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
