import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import AppError from "../utils/appError.js"

// Extend Express Request so req.user is typed everywhere
declare global {
  namespace Express {
    interface Request {
      user?: { id: string }
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401))
  }

  const token = header.split(" ")[1]
  try {
    const payload = jwt.verify(token as string, process.env.JWT_ACCESS_SECRET as string)
    const payloadObj = payload as { userId: string }
    req.user = { id: payloadObj.userId }
    next()
  } catch {
    next(new AppError("Invalid or expired token", 401))
  }
}