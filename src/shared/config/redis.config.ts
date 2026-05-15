
import logger from "../utils/logger.js"
import { createClient } from 'redis'


export const client = createClient({
    url: process.env.REDIS_URL as string
})

client.on('error', (err: any) => logger.error('Redis error:', err))


export async function connectRedis() {
    await client.connect()
}

// ── Key helpers
export const keys = {
    refreshToken: (userId: string) => `refresh:${userId}`,
    emailOTP: (email: string) => `otp:email:${email}`,
    hubEmailOTP: (userId: string, hubId: string) => `otp:hub:${userId}:${hubId}`,
    resetToken: (token: string) => `reset:${token}`,
    feedCache: (userId: string) => `feed:${userId}`,
    aiUsage: (userId: string, date: string) => `ai:usage:${userId}:${date}`,
    typingStatus: (convId: string) => `typing:${convId}`,
    onlineUsers: () => `online:users`,
    hubMemberCount: (hubId: string) => `hub:members:${hubId}`
}

// ── Common operations
export async function setEx(key: string, seconds: number, value: any) {
    return client.setEx(key, seconds, JSON.stringify(value))
}

export async function set(key: string, seconds: number, value: any) {
    return client.set(key, JSON.stringify(value), {
        EX: seconds
    })
}
export async function get(key: string) {
    const val = await client.get(key)
    if (!val) return null
    try { return JSON.parse(val) } catch { return val }
}

export async function del(key: string) {
    return client.del(key)
}

export async function incr(key: string) {
    return client.incr(key)
}

export async function expire(key: string, seconds: number) {
    return client.expire(key, seconds)
}


