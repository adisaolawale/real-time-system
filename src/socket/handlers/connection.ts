import { Server, Socket } from "socket.io"
import { prisma } from "../../shared/config/prisma.config.js"
import { client, keys, setEx, del } from "../../shared/config/redis.config.js"
import { setOnline, setOffline, refreshPresence } from "../helpers/presence.js"
import { room, getUserConversationIds } from "../helpers/rooms.js"

export function registerConnectionHandlers(io: Server, socket: Socket) {
    const userId = socket.data.userId

    onConnect(io, socket, userId)

    socket.on("heartbeat", () => refreshPresence(userId).catch(console.error))
    socket.on("disconnect", () => onDisconnect(io, socket, userId))
}

async function onConnect(io: Server, socket: Socket, userId: string) {
    await setOnline(userId)

    const convIds = await getUserConversationIds(userId)
    for (const id of convIds) socket.join(room.conversation(id))
    socket.join(room.user(userId))

    socket.broadcast.emit("presence:update", { userId, isOnline: true })

    await deliverPendingMessages(io, userId)
}

async function onDisconnect(io: Server, socket: Socket, userId: string) {
    const sockets = await io.in(room.user(userId)).fetchSockets()
    if (sockets.length === 0) {
        await setOffline(userId)
        socket.broadcast.emit("presence:update", { userId, isOnline: false })
    }
}

async function deliverPendingMessages(io: Server, userId: string) {
    const pending = await prisma.messageDelivery.findMany({
        where: { userId, status: "SENT" },
        include: { message: true },
    })

    for (const delivery of pending) {
        await prisma.messageDelivery.update({
            where: { id: delivery.id },
            data: { status: "DELIVERED", deliveredAt: new Date() },
        })
        io.to(room.user(delivery.message.senderId)).emit("message:delivered", {
            messageId: delivery.messageId,
            userId,
            deliveredAt: new Date(),
        })
    }
}