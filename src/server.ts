import dotenv from 'dotenv';
dotenv.config();


import { connectRedis } from "./shared/config/redis.config.js"
import { initSocket } from "./socket/index.js"

import logger from './shared/utils/logger.js';
import httpServer from './app.js';



// app.listen(5000, () => {
//     console.log(`Server running on port 5000`)
// });


const PORT = process.env.PORT || 5000

async function boot() {
    await connectRedis()
    await initSocket(httpServer)


    httpServer.listen(PORT, () => {
        logger.info(`\n🚀 Server running on http://localhost:${PORT}`)
        logger.info(`\n📬 REST:`)
        logger.info(`   POST   /api/chat/dm`)
        logger.info(`   POST   /api/chat/groups`)
        logger.info(`   GET    /api/chat/conversations`)
        logger.info(`   GET    /api/chat/conversations/:id`)
        logger.info(`   GET    /api/chat/conversations/:id/messages`)
        logger.info(`   DELETE /api/chat/conversations/:id/messages/:messageId`)
        logger.info(`   GET    /api/chat/presence?userIds=id1,id2`)
        logger.info(`\n📡 Socket events (emit from client):`)
        logger.info(`   message:send  { conversationId, content, tempId }`)
        logger.info(`   message:read  { conversationId, messageId }`)
        logger.info(`   typing:start  { conversationId }`)
        logger.info(`   typing:stop   { conversationId }`)
        logger.info(`   heartbeat`)
    })
}

boot()

