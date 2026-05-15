import { Server, Socket } from "socket.io"
import { prisma } from "../../shared/config/prisma.config.js"
import { isOnline } from "../helpers/presence.js"
import { room, isParticipant, getOtherParticipantIds } from "../helpers/rooms.js"

interface SendMessagePayload {
    conversationId: string
    content: string
    tempId: string
}

export function registerMessagingHandlers(io: Server, socket: Socket) {
    const userId = socket.data.userId

    socket.on("message:send", (payload: SendMessagePayload) =>
        handleSendMessage(io, socket, userId, payload)
    )
    socket.on("message:read", (payload: { conversationId: string; messageId: string }) =>
        handleReadReceipt(io, socket, userId, payload)
    )
}

async function handleSendMessage(
    io: Server,
    socket: Socket,
    senderId: string,
    { conversationId, content, tempId }: SendMessagePayload
) {
    try {
        if (!(await isParticipant(conversationId, senderId))) {
            return socket.emit("error", { code: "NOT_IN_CONVERSATION" })
        }

        const message = await prisma.message.create({
            data: { conversationId, senderId, content, status: "SENT" },
            include: {
                sender: { select: { id: true, username: true, avatarUrl: true } },
            },
        })

        const otherIds = await getOtherParticipantIds(conversationId, senderId)

        await prisma.messageDelivery.createMany({
            data: otherIds.map((userId) => ({
                messageId: message.id,
                userId,
                status: "SENT",
            })),
        })

        socket.emit("message:ack", { tempId, message })
        socket.to(room.conversation(conversationId)).emit("message:new", { message })

        for (const userId of otherIds) {
            if (await isOnline(userId)) {
                await prisma.messageDelivery.update({
                    where: { messageId_userId: { messageId: message.id, userId } },
                    data: { status: "DELIVERED", deliveredAt: new Date() },
                })
                io.to(room.user(senderId)).emit("message:delivered", {
                    messageId: message.id,
                    userId,
                    deliveredAt: new Date(),
                })
            }
        }
    } catch {
        socket.emit("error", { code: "SEND_FAILED" })
    }
}

async function handleReadReceipt(
    io: Server,
    socket: Socket,
    userId: string,
    { conversationId, messageId }: { conversationId: string; messageId: string }
) {
    await prisma.messageDelivery.updateMany({
        where: { messageId, userId, status: { not: "READ" } },
        data: { status: "READ", readAt: new Date() },
    })

    await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() },
    })

    const message = await prisma.message.findUnique({ where: { id: messageId } })
    if (message) {
        io.to(room.user(message.senderId)).emit("message:read", {
            messageId,
            userId,
            readAt: new Date(),
        })
    }
}