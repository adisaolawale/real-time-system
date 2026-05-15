import { Server } from "socket.io"
import { createAdapter } from "@socket.io/redis-adapter"
import { createClient } from "redis"
import type { Server as HttpServer } from "http"
import jwt from "jsonwebtoken"
import { registerConnectionHandlers } from "./handlers/connection.js"
import { registerMessagingHandlers } from "./handlers/messaging.js"
import { registerTypingHandlers } from "./handlers/typing.js"

export let io: Server

export async function initSocket(httpServer: HttpServer) {
    io = new Server(httpServer, {
        cors: { origin: process.env.CLIENT_URL || "*", credentials: true },
        pingTimeout: 20000,
        pingInterval: 10000,
    })

    // ── Redis adapter (reuse same REDIS_URL from your config) ──────────────────
    // We create fresh clients here — the adapter needs its own dedicated
    // pub/sub clients and cannot share your main app client
    const pubClient = createClient({ url: process.env.REDIS_URL as string })
    const subClient = pubClient.duplicate()

    await Promise.all([pubClient.connect(), subClient.connect()])

    io.adapter(createAdapter(pubClient, subClient))

    // ── Auth middleware ────────────────────────────────────────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token
        if (!token) return next(new Error("UNAUTHORIZED"))

        try {
            const payload = jwt.verify(
                token,
                process.env.JWT_ACCESS_SECRET as string
            ) as { userId: string }
            socket.data.userId = payload.userId
            next()
        } catch {
            next(new Error("INVALID_TOKEN"))
        }
    })

    // ── Register handlers ──────────────────────────────────────────────────────
    io.on("connection", (socket) => {
        registerConnectionHandlers(io, socket)
        registerMessagingHandlers(io, socket)
        registerTypingHandlers(io, socket)
    })

    return io
}