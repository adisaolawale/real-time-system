import { Server, Socket } from "socket.io"
import { client, keys, setEx, del } from "../../shared/config/redis.config.js"
import { room } from "../helpers/rooms.js"

const TYPING_TTL = 5

export function registerTypingHandlers(_io: unknown, socket: Socket) {
  const userId = socket.data.userId

  socket.on("typing:start", ({ conversationId }: { conversationId: string }) =>
    handleTypingStart(socket, userId, conversationId)
  )
  socket.on("typing:stop", ({ conversationId }: { conversationId: string }) =>
    handleTypingStop(socket, userId, conversationId)
  )
}

async function handleTypingStart(socket: Socket, userId: string, conversationId: string) {
  const key = `${keys.typingStatus(conversationId)}:${userId}`
  const alreadyTyping = await client.get(key)

  await setEx(key, TYPING_TTL, "1")

  if (!alreadyTyping) {
    socket.to(room.conversation(conversationId)).emit("typing:update", {
      userId,
      conversationId,
      isTyping: true,
    })
  }
}

async function handleTypingStop(socket: Socket, userId: string, conversationId: string) {
  await del(`${keys.typingStatus(conversationId)}:${userId}`)

  socket.to(room.conversation(conversationId)).emit("typing:update", {
    userId,
    conversationId,
    isTyping: false,
  })
}