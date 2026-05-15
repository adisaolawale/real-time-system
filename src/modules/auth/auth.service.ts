import { prisma } from "../../shared/config/prisma.config.js";
import AppError from "../../shared/utils/appError.js";
import type { NextFunction, Request } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"






export const login = async (req: Request, next: NextFunction, data: any) => {
    const { email, password } = data
    const user = await prisma.user.findUnique({
        where: {
            email
        }
    })
    if (!user) throw new AppError("Invalid Credentials", 400)


    const isValid = bcrypt.compare(password, user.password)
    if (!isValid) {
        throw new AppError("Invalid Credentials", 401)
    }

    const payload = {
        userId: user.id
    }

    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
        expiresIn: "7d",
    });

    const { password: _, ...safeUser } = user;

    return {
        user: safeUser,
        accessToken
    }
}