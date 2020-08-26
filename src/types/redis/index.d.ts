declare namespace redis {
    export interface RedisClient {
        hgetAsync(key: string, field: string): Promise<string>;
        hsetAsync(key: string, field: string, value: string): Promise<number>;
    }
}