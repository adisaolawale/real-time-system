/**
 * Run once to seed test users + print tokens
 * npx ts-node scripts/generateTestTokens.ts
 */
import { ENV } from "./shared/config/env.js";

import { prisma } from "./shared/config/prisma.config.js"
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";



const SECRET = ENV.JWT_ACCESS_SECRET || "dev_secret_change_me";

async function main() {
    console.log("🌱 Seeding test users...\n");
    console.log("DB URL:", ENV.DATABASE_URL, "\n");

    // Upsert so you can re-run safely
    const alice = await prisma.user.upsert({
        where: { email: "alice@test.com" },
        update: {},
        create: {
            id: "user-alice",
            username: "alice",
            email: "alice@test.com",
            password: await bcrypt.hash("password123", 10),
        },
    });

    const bob = await prisma.user.upsert({
        where: { email: "bob@test.com" },
        update: {},
        create: {
            id: "user-bob",
            username: "bob",
            email: "bob@test.com",
            password: await bcrypt.hash("password123", 10),
        },
    });

    const charlie = await prisma.user.upsert({
        where: { email: "charlie@test.com" },
        update: {},
        create: {
            id: "user-charlie",
            username: "charlie",
            email: "charlie@test.com",
            password: await bcrypt.hash("password123", 10),
        },
    });

    // Seed a conversation between alice and bob
    const conversation = await prisma.conversation.upsert({
        where: { id: "convo-alice-bob" },
        update: {},
        create: {
            id: "convo-alice-bob",
            isGroup: false,
            participants: {
                create: [{ userId: alice.id }, { userId: bob.id }],
            },
        },
    });

    // Seed a group conversation
    const groupConvo = await prisma.conversation.upsert({
        where: { id: "convo-group-1" },
        update: {},
        create: {
            id: "convo-group-1",
            isGroup: true,
            name: "Test Group",
            participants: {
                create: [
                    { userId: alice.id },
                    { userId: bob.id },
                    { userId: charlie.id },
                ],
            },
        },
    });

    // Generate tokens
    const aliceToken = jwt.sign({ userId: alice.id }, SECRET, {
        expiresIn: "7d",
    });
    const bobToken = jwt.sign({ userId: bob.id }, SECRET, { expiresIn: "7d" });
    const charlieToken = jwt.sign({ userId: charlie.id }, SECRET, {
        expiresIn: "7d",
    });

    console.log("✅ Users seeded:");
    console.log(`   Alice   → id: ${alice.id}`);
    console.log(`   Bob     → id: ${bob.id}`);
    console.log(`   Charlie → id: ${charlie.id}\n`);

    console.log("✅ Conversations seeded:");
    console.log(
        `   Alice ↔ Bob  → conversationId: ${conversation.id} (DM)`
    );
    console.log(
        `   Group        → conversationId: ${groupConvo.id} (Alice, Bob, Charlie)\n`
    );

    console.log("🔑 JWT Tokens (valid 7 days):\n");
    console.log(`ALICE_TOKEN=${aliceToken}\n`);
    console.log(`BOB_TOKEN=${bobToken}\n`);
    console.log(`CHARLIE_TOKEN=${charlieToken}\n`);

    console.log("─".repeat(60));
    console.log("📋 Copy these into your test client (Postman / browser)");
    console.log(
        "   Connect with: { auth: { token: '<TOKEN>' } } in socket.io"
    );
    console.log(
        `   DM conversation ID:    convo-alice-bob`
    );
    console.log(
        `   Group conversation ID: convo-group-1`
    );
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

