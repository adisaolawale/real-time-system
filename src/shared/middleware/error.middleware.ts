import type { Request, Response, NextFunction } from 'express';
import AppError from "../utils/appError.js";
import logger from "../utils/logger.js";


const isDev = process.env.NODE_ENV === "development"

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(err); // log everything

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(isDev && { stack: err.stack })
        });
    }

    return res.status(500).json({
        success: false,
        message: isDev ? err.message : "Internal Server Error"
    });
};