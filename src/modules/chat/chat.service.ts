import { prisma } from "../../shared/config/prisma.config.js"
import { getBulkOnlineStatus } from "../../socket/helpers/presence.js"
import AppError from "../../shared/utils/appError.js"

// ─── Conversations ────────────────────────────────────────────────────────────

/** Create or return existing DM between two users */
export async function getOrCreateDM(userAId: string, userBId: string) {
    // Look for an existing non-group conversation both users share
    const existing = await prisma.conversation.findFirst({
        where: {
            isGroup: false,
            participants: { every: { userId: { in: [userAId, userBId] } } },
            AND: [
                { participants: { some: { userId: userAId } } },
                { participants: { some: { userId: userBId } } },
            ],
        },
        include: { participants: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } } },
    })

    if (existing) return existing

    return prisma.conversation.create({
        data: {
            isGroup: false,
            participants: {
                create: [{ userId: userAId }, { userId: userBId }],
            },
        },
        include: { participants: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } } },
    })
}

/** Create a group conversation */
export async function createGroup(
    creatorId: string,
    name: string,
    memberIds: string[]
) {
    const allIds = Array.from(new Set([creatorId, ...memberIds]))

    return prisma.conversation.create({
        data: {
            isGroup: true,
            name,
            participants: { create: allIds.map((userId) => ({ userId })) },
        },
        include: { participants: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } } },
    })
}

/** List all conversations for a user with last message + online status */
export async function getUserConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        orderBy: { updatedAt: "desc" },
        include: {
            participants: {
                include: { user: { select: { id: true, username: true, avatarUrl: true } } },
            },
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { sender: { select: { id: true, username: true } } },
            },
        },
    })

    // Collect all unique participant IDs (excluding current user)
    const otherIds = [
        ...new Set(
            conversations.flatMap((c) =>
                c.participants.map((p) => p.userId).filter((id) => id !== userId)
            )
        ),
    ]

    const onlineMap = await getBulkOnlineStatus(otherIds as string[])

    return conversations.map((c) => ({
        ...c,
        participants: c.participants.map((p) => ({
            ...p,
            user: { ...p.user, isOnline: onlineMap[p.user.id] ?? false },
        })),
        lastMessage: c.messages[0] ?? null,
        messages: undefined, // strip raw messages array
    }))
}

/** Get single conversation (with auth check) */
export async function getConversation(conversationId: string, userId: string) {
    const convo = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
            participants: {
                include: { user: { select: { id: true, username: true, avatarUrl: true } } },
            },
        },
    })

    if (!convo) throw new AppError("Conversation not found", 404)

    const isMember = convo.participants.some((p) => p.userId === userId)
    if (!isMember) throw new AppError("Forbidden", 403)

    const otherIds = convo.participants
        .map((p) => p.userId)
        .filter((id) => id !== userId)

    const onlineMap = await getBulkOnlineStatus(otherIds)

    return {
        ...convo,
        participants: convo.participants.map((p) => ({
            ...p,
            user: { ...p.user, isOnline: onlineMap[p.user.id] ?? false },
        })),
    }
}

// ─── Messages ─────────────────────────────────────────────────────────────────

/** Cursor-paginated message history */
export async function getMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit = 30
) {
    // Auth check
    const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
    })
    if (!participant) throw new AppError("Forbidden", 403)

    let cursorDate: Date | undefined
    if (cursor) {
        const msg = await prisma.message.findUnique({ where: { id: cursor } })
        if (!msg) throw new AppError("Invalid cursor", 400)
        cursorDate = msg.createdAt
    }

    const messages = await prisma.message.findMany({
        where: {
            conversationId,
            deletedAt: null,
            ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            sender: { select: { id: true, username: true, avatarUrl: true } },
            deliveries: { select: { userId: true, status: true, readAt: true } },
        },
    })

    return {
        messages: messages.reverse(),
        nextCursor: messages.length === limit ? messages[0]?.id : null,
        hasMore: messages.length === limit,
    }
}

/** Delete a message (soft) */
export async function deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } })
    if (!message) throw new AppError("Message not found", 404)
    if (message.senderId !== userId) throw new AppError("Forbidden", 403)

    return prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date() },
    })
}

// ─── Presence ─────────────────────────────────────────────────────────────────

/** Get online status for a list of user IDs */
export async function getOnlineStatus(userIds: string[]) {
    return getBulkOnlineStatus(userIds)
}