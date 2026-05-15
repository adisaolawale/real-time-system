import dotenv from "dotenv";

const envFile =
    process.env.NODE_ENV === "production"
        ? ".env.production"
        : ".env";

dotenv.config({ path: envFile });

export const ENV = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT || "3000",
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_URL: process.env.REDIS_URL!,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
};