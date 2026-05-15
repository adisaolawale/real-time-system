import "dotenv/config"
import express from "express"

import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'


import { createServer } from "http"
import { connectRedis } from "./shared/config/redis.config.js"
import { initSocket } from "./socket/index.js"
import { errorMiddleware } from "./shared/middleware/error.middleware.js"
import chatRoutes from "./modules/chat/chat.routes.js"
import authRoutes from "./modules/auth/auth.routes.js"
import logger from "./shared/utils/logger.js"



const app = express()
app.use(express.json())

// ── Security middleware
app.use(helmet())
app.use(cors({
  origin: '*', // For testing, or specify your Expo local origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));


app.use(express.urlencoded({ extended: true }))
app.use(compression())
app.use(cookieParser())

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/chat", chatRoutes)
app.use("/api/auth", authRoutes)

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true }))

// ─── Error handler (must be last) ────────────────────────────────────────────
app.use(errorMiddleware)

// ─── Boot ─────────────────────────────────────────────────────────────────────
const httpServer = createServer(app)


// const PORT = process.env.PORT || 3000

// async function boot() {
//   await connectRedis()
//   await initSocket(httpServer)
//   httpServer.listen(PORT, () => {
//     logger.info(`\n🚀 Server running on http://localhost:${PORT}`)
//     logger.info(`\n📬 REST:`)
//     logger.info(`   POST   /api/chat/dm`)
//     logger.info(`   POST   /api/chat/groups`)
//     logger.info(`   GET    /api/chat/conversations`)
//     logger.info(`   GET    /api/chat/conversations/:id`)
//     logger.info(`   GET    /api/chat/conversations/:id/messages`)
//     logger.info(`   DELETE /api/chat/conversations/:id/messages/:messageId`)
//     logger.info(`   GET    /api/chat/presence?userIds=id1,id2`)
//     logger.info(`\n📡 Socket events (emit from client):`)
//     logger.info(`   message:send  { conversationId, content, tempId }`)
//     logger.info(`   message:read  { conversationId, messageId }`)
//     logger.info(`   typing:start  { conversationId }`)
//     logger.info(`   typing:stop   { conversationId }`)
//     logger.info(`   heartbeat`)
//   })
// }

// boot().catch((err) => {
//   logger.error("Boot failed:", err)
//   process.exit(1)
// })


export default httpServer;