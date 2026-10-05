export interface CacheMetricsSnapshot {
    hits: number;
    misses: number;
    negative_hits: number;
    fallback_reads: number;
    set_errors: number;
    delete_errors: number;
    serialization_failures: number;
    pool_wait_timeouts: number;
    last_ping_latency_ms: number;
    command_count: number;
    command_duration_us: number;
}

export interface RedisMetricsResponse {
    healthy: boolean;
    message: string;
    ping_latency_ms: number;
    avg_command_latency_ms: number;
    hit_ratio: number;
    metrics: CacheMetricsSnapshot;
}

export interface PostgresPoolStats {
    max_open_connections: number;
    open_connections: number;
    in_use: number;
    idle: number;
    wait_count: number;
    wait_duration_ms: number;
    max_idle_closed: number;
    max_idle_time_closed: number;
    max_lifetime_closed: number;
}

export interface MetricsResponse {
    redis: RedisMetricsResponse;
    database_pool: PostgresPoolStats | null;
}
