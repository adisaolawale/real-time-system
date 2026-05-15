import { client, setEx, del } from "../../shared/config/redis.config.js"

const PRESENCE_TTL = 35 // seconds — slightly above ping interval

// ─── Write ────────────────────────────────────────────────────────────────────

export async function setOnline(userId: string) {
    await setEx(`presence:${userId}`, PRESENCE_TTL, "1")
}

export async function setOffline(userId: string) {
    await del(`presence:${userId}`)
}

export async function refreshPresence(userId: string) {
    await setEx(`presence:${userId}`, PRESENCE_TTL, "1")
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function isOnline(userId: string): Promise<boolean> {
    const val = await client.get(`presence:${userId}`)
    return val !== null
}

export async function getBulkOnlineStatus(
    userIds: string[]
): Promise<Record<string, boolean>> {
    if (userIds.length === 0) return {}

    // Use pipelining — one round trip for all keys
    const pipeline = client.multi()
    for (const id of userIds) pipeline.get(`presence:${id}`)
    const results = await pipeline.exec()

    return Object.fromEntries(
        userIds.map((id, i) => [id, results[i] !== null])
    )
}