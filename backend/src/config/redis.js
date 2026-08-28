import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
    tls: {},
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
});

redis.on("connect", () => {
    console.log("Redis connected");
});

redis.on("ready", () => {
    console.log("Redis ready");
});

redis.on("error", (err) => {
    console.error("Redis error:", err);
});

export default redis;