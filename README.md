# ⚡ Realtime Chat API

A production-grade realtime chat backend built with **Node.js**, **TypeScript**, **Express**, **PostgreSQL**, **Prisma**, **Redis**, and **Socket.io**.

Built to demonstrate a scalable, horizontally-distributable messaging system with full delivery tracking, typing indicators, and online presence — ready to plug into any frontend.

---

## ✨ Features

- 💬 **Realtime messaging** via Socket.io WebSockets
- 👁 **Message delivery receipts** — sent → delivered → read
- ✍️ **Typing indicators** with auto-expiry via Redis TTL
- 🟢 **Online presence** with heartbeat-based refresh
- 📬 **Offline message delivery** — queued messages delivered on reconnect
- 👥 **DM and group conversations**
- 📜 **Cursor-paginated message history**
- 🔴 **Redis Pub/Sub adapter** for horizontal scaling across multiple instances
- 🔐 **JWT authentication** on both REST and WebSocket
- 🧪 **Built-in browser test UI** — open two tabs and test everything live

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express |
| Realtime | Socket.io |
| Database | PostgreSQL via Prisma ORM |
| Cache / Pub-Sub | Redis (node-redis v4) |
| Auth | JWT (jsonwebtoken) |
| Validation | Joi |

---

## 📁 Project Structure

```
src/
├── app.ts                          # Entry point — Express + HTTP server + boot
├── server.ts                       # Entry point — Express + HTTP server + boot
├── seed.ts                         # Seed users + print JWT tokens for testing  
├── config/
│   └── redis.ts                    # Redis client, key helpers, common operations
├── middleware/
│   └── authenticate.ts             # JWT auth middleware for REST routes
├── utils/
│   └── AppError.ts                 # AppError class + global error handler
├── lib/
│   └── prisma.ts                   # Prisma client singleton
├── socket/
│   ├── index.ts                    # Socket.io server init + Redis adapter + JWT middleware
│   ├── helpers/
│   │   ├── presence.ts             # setOnline / setOffline / isOnline / getBulkOnlineStatus
│   │   └── rooms.ts                # Room naming + participant query helpers
│   └── handlers/
│       ├── connection.ts           # connect / disconnect / heartbeat / pending delivery
│       ├── messaging.ts            # message:send / message:read
│       └── typing.ts               # typing:start / typing:stop
└── modules/
    └── chat/
        ├── chat.routes.ts          # Route definitions
        ├── chat.controller.ts      # Request/response handling
        └── chat.service.ts         # Business logic

prisma/
└── schema.prisma                   # Database schema
           

chat-tester.html                    # Browser-based test UI (open in two tabs)
```

---

## ⚙️ Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/realtime-chat-api.git
cd realtime-chat-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/chat_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key_here
PORT=3000
CLIENT_URL=*
```

### 4. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Seed test users and get tokens

```bash
npx ts-node src/seed.ts
```

This creates three test users (Alice, Bob, Charlie), two conversations, and prints JWT tokens for each user. Copy these tokens — you'll need them for testing.

### 6. Start the server

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

Server runs at `http://localhost:3000`

---

## 🧪 Testing with the Browser UI

1. Open `chat-tester.html` in **two separate browser tabs** (or two different browsers)
2. In **Tab 1** — paste Alice's token and click **Connect**
3. In **Tab 2** — paste Bob's token and click **Connect**
4. In Tab 1 — enter Bob's user ID and click **POST /chat/dm**
5. Click the conversation that appears and start typing

You'll see messages, typing indicators, delivery receipts, and presence updates working in real time across both tabs.

---

## 📡 Socket.io Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `message:send` | `{ conversationId, content, tempId }` | Send a message |
| `message:read` | `{ conversationId, messageId }` | Mark a message as read |
| `typing:start` | `{ conversationId }` | Start typing indicator |
| `typing:stop` | `{ conversationId }` | Stop typing indicator |
| `heartbeat` | — | Refresh online presence (every 20s) |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `message:new` | `{ message }` | New incoming message |
| `message:ack` | `{ tempId, message }` | Confirmation of sent message with real DB id |
| `message:delivered` | `{ messageId, userId, deliveredAt }` | Message delivered to recipient |
| `message:read` | `{ messageId, userId, readAt }` | Message read by recipient |
| `typing:update` | `{ userId, conversationId, isTyping }` | Typing status update |
| `presence:update` | `{ userId, isOnline }` | User online/offline change |
| `error` | `{ code }` | Error from server |

### Connecting

```javascript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' },
  transports: ['websocket'],
})
```

---

## 🌐 REST API

All REST routes require `Authorization: Bearer <token>` header.

### Conversations

#### Start or get a DM
```
POST /api/chat/dm
```
```json
{ "targetUserId": "user-bob" }
```

#### Create a group conversation
```
POST /api/chat/groups
```
```json
{
  "name": "Project Team",
  "memberIds": ["user-bob", "user-charlie"]
}
```

#### List my conversations
```
GET /api/chat/conversations
```

Response includes last message and online status of participants.

#### Get a single conversation
```
GET /api/chat/conversations/:id
```

---

### Messages

#### Get message history (cursor-paginated)
```
GET /api/chat/conversations/:id/messages?limit=30&cursor=<messageId>
```

| Param | Type | Description |
|---|---|---|
| `limit` | number | Messages per page (default: 30) |
| `cursor` | string | Message ID to paginate from (for older messages) |

Response:
```json
{
  "messages": [...],
  "nextCursor": "message-id-or-null",
  "hasMore": true
}
```

#### Delete a message (soft delete)
```
DELETE /api/chat/conversations/:id/messages/:messageId
```

Only the sender can delete their own messages.

---

### Presence

#### Get online status for one or more users
```
GET /api/chat/presence?userIds=user-alice,user-bob
```

Response:
```json
{
  "status": {
    "user-alice": true,
    "user-bob": false
  }
}
```

---

## 📮 Postman Collection

### Setup

1. Create a new collection called **Realtime Chat API**
2. Set a collection variable `baseUrl` = `http://localhost:3000`
3. Set a collection variable `token` = paste Alice's token from the seed script
4. Under the collection **Authorization** tab → Type: **Bearer Token** → Token: `{{token}}`
5. All requests inherit this auth automatically

### Request order for a full test

```
1.  POST   {{baseUrl}}/api/chat/dm
    Body:  { "targetUserId": "user-bob" }
    → copy conversation.id into a variable `convId`

2.  GET    {{baseUrl}}/api/chat/conversations

3.  GET    {{baseUrl}}/api/chat/conversations/{{convId}}

4.  GET    {{baseUrl}}/api/chat/conversations/{{convId}}/messages

5.  GET    {{baseUrl}}/api/chat/presence?userIds=user-alice,user-bob

6.  POST   {{baseUrl}}/api/chat/groups
    Body:  { "name": "Test Group", "memberIds": ["user-bob", "user-charlie"] }

7.  DELETE {{baseUrl}}/api/chat/conversations/{{convId}}/messages/{{messageId}}
```

---

## 🐳 Docker (optional)

To run PostgreSQL and Redis locally with Docker:

```bash
docker compose up -d
```

`docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: chat_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

Then use:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chat_db
REDIS_URL=redis://localhost:6379
```

---

## 🔌 Horizontal Scaling

The server uses `@socket.io/redis-adapter` — multiple instances share socket events via Redis Pub/Sub automatically. To run two instances:

```bash
PORT=3000 node dist/app.js &
PORT=3001 node dist/app.js &
```

A user on instance 1 and a user on instance 2 will receive each other's messages without any extra configuration.

---

## 📋 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection URL |
| `JWT_SECRET` | ✅ | Secret for signing/verifying JWTs |
| `PORT` | ❌ | Server port (default: 3000) |
| `CLIENT_URL` | ❌ | CORS origin (default: *) |

---

## 📌 Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start with ts-node-dev (hot reload) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |
| `npx prisma migrate dev` | Run DB migrations |
| `npx prisma studio` | Open Prisma DB GUI |
| `npx ts-node scripts/generateTestTokens.ts` | Seed users and print tokens |

---

## 📄 License

MIT
