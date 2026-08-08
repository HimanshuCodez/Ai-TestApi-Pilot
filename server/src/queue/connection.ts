import { Redis } from "ioredis";
import { env } from "../env.js";

// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
