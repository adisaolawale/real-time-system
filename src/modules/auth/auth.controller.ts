import type { Response, Request, NextFunction } from "express"
import * as service from "./auth.service.js"

import AppError from "../../shared/utils/appError.js"



export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        console.log(req.body)
        const result = await service.login(req, next, req.body)
        res.cookie("accessToken", result.accessToken, {
            httpOnly: true,
            //secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        return res.status(200).json({
            result
        })
    } catch (err) {
        next(err)
    }
}
