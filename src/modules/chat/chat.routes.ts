import { Router } from "express"
import { authenticate } from "../../shared/middleware/auth.middleware.js"
import * as chat from "./chat.controller.js"

const router = Router()

// All chat routes require auth
router.use(authenticate)

// ─── Conversations ────────────────────────────────────────────────────────────
// POST   /chat/dm                    → start or get DM with another user
// POST   /chat/groups                → create a group conversation
// GET    /chat/conversations          → list all my conversations
// GET    /chat/conversations/:id      → get single conversation

router.post("/dm", chat.startDM)
router.post("/groups", chat.createGroup)
router.get("/conversations", chat.listConversations)
router.get("/conversations/:id", chat.getConversation)

// ─── Messages ─────────────────────────────────────────────────────────────────
// GET    /chat/conversations/:id/messages            → paginated history
// DELETE /chat/conversations/:id/messages/:messageId → soft delete

router.get("/conversations/:id/messages", chat.getMessages)
router.delete("/conversations/:id/messages/:messageId", chat.deleteMessage)

// ─── Presence ─────────────────────────────────────────────────────────────────
// GET    /chat/presence?userIds=id1,id2,id3

router.get("/presence", chat.getOnlineStatus)

export default router