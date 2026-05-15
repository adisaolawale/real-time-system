import { prisma } from "../../shared/config/prisma.config.js"

// ─── Room name conventions (single source of truth) ──────────────────────────

export const room = {
    conversation: (convId: string) => `conversation:${convId}`,
    user: (userId: string) => `user:${userId}`,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All conversation IDs a user belongs to */
export async function getUserConversationIds(userId: string): Promise<string[]> {
    const rows = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
    })
    return rows.map((r) => r.conversationId)
}

/** All participant user IDs in a conversation (excluding a given user) */
export async function getOtherParticipantIds(
    conversationId: string,
    excludeUserId: string
): Promise<string[]> {
    const rows = await prisma.conversationParticipant.findMany({
        where: { conversationId, userId: { not: excludeUserId } },
        select: { userId: true },
    })
    return rows.map((r) => r.userId)
}

/** Check if a user is a participant in a conversation */
export async function isParticipant(
    conversationId: string,
    userId: string
): Promise<boolean> {
    const row = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
    })
    return row !== null
}