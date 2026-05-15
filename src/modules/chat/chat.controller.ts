import type { Request, Response, NextFunction } from "express"
import * as chatService from "./chat.service.js"

// ─── Conversations ────────────────────────────────────────────────────────────

export async function startDM(req: Request, res: Response, next: NextFunction) {
  try {
    const myId = req.user!.id
    const { targetUserId } = req.body

    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId is required" })
    }
    if (targetUserId === myId) {
      return res.status(400).json({ error: "Cannot DM yourself" })
    }

    const conversation = await chatService.getOrCreateDM(myId, targetUserId)
    res.status(200).json({ conversation })
  } catch (err) {
    next(err)
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const myId = req.user!.id
    const { name, memberIds } = req.body

    if (!name || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: "name and memberIds[] are required" })
    }

    const conversation = await chatService.createGroup(myId, name, memberIds)
    res.status(201).json({ conversation })
  } catch (err) {
    next(err)
  }
}

export async function listConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const conversations = await chatService.getUserConversations(req.user!.id)
    res.json({ conversations })
  } catch (err) {
    next(err)
  }
}

export async function getConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const conversation = await chatService.getConversation(
      req.params.id as string,
      req.user!.id
    )
    res.json({ conversation })
  } catch (err) {
    next(err)
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { cursor, limit } = req.query
    const { id } = req.params
    const result = await chatService.getMessages(
      id as string,
      req.user!.id,
      cursor as string | undefined,
      limit ? Number(limit) : undefined
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    await chatService.deleteMessage(req.params.messageId as string, req.user!.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export async function getOnlineStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { userIds } = req.query

    if (!userIds) {
      return res.status(400).json({ error: "userIds query param required" })
    }

    const ids = (userIds as string).split(",").map((s) => s.trim())
    const status = await chatService.getOnlineStatus(ids)
    res.json({ status })
  } catch (err) {
    next(err)
  }
}