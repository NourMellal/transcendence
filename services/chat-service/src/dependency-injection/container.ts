import { Database } from 'sqlite3';
import { promisify } from 'util';
import amqp from 'amqplib';
import { ChatServiceConfig, logger } from '../infrastructure/config';
import { SQLiteMessageRepository } from '../infrastructure/database/repositories/sqlite-message.repository';
import { SQLiteConversationRepository } from '../infrastructure/database/repositories/sqlite-conversation.repository';
import { SendMessageUseCase } from '../application/use-cases/sendMessageUseCase';
import { GetMessagesUseCase } from '../application/use-cases/get-messages.usecase';
import { GetConversationsUseCase } from '../application/use-cases/get-conversation.usecase';
import { ChatController } from '../infrastructure/http/controllers/chat.contoller';
import { HealthController } from '../infrastructure/http/controllers/health.controller';
import { UserEventsHandler } from '../infrastructure/messaging/handlers/UserEventsHandler';
import { RoomManager } from '../infrastructure/websocket/RoomManager';
import { ConnectionHandler } from '../infrastructure/websocket/handlers/ConnectionHandler';
import { SendMessageHandler } from '../infrastructure/websocket/handlers/SendMessageHandler';
import { DisconnectHandler } from '../infrastructure/websocket/handlers/DisconnectHandler';
import { WebSocketAuthService } from '../infrastructure/websocket/services/WebSocketAuthService';
import { exit } from 'process';

export interface ChatServiceContainer {
    readonly repositories: {
        readonly messageRepository: SQLiteMessageRepository;
        readonly conversationRepository: SQLiteConversationRepository;
    };
    readonly useCases: {
        readonly sendMessageUseCase: SendMessageUseCase;
        readonly getMessagesUseCase: GetMessagesUseCase;
        readonly getConversationsUseCase: GetConversationsUseCase;
    };
    readonly controllers: {
        readonly chatController: ChatController;
        readonly healthController: HealthController;
    };
    readonly messaging: {
        readonly connection: any;
        readonly userEventsHandler: UserEventsHandler;
    };
    readonly websocket: {
        readonly roomManager: RoomManager;
        readonly connectionHandler: ConnectionHandler;
        readonly sendMessageHandler: SendMessageHandler;
        readonly disconnectHandler: DisconnectHandler;
        readonly authService: WebSocketAuthService;
    };
}

async function initializeDatabase(dbPath: string): Promise<Database> {
    const db = new Database(dbPath);
    const runAsync = promisify(db.run.bind(db));

    await runAsync(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            sender_username TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT NOT NULL,
            recipient_id TEXT,
            game_id TEXT,
            created_at TEXT NOT NULL
        )
    `);

    await runAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type)
    `);

    await runAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_private ON messages(sender_id, recipient_id) WHERE type = 'private'
    `);

    await runAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_game ON messages(game_id) WHERE type = 'game'
    `);

    await runAsync(`
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            participant1_id TEXT NOT NULL,
            participant2_id TEXT NOT NULL,
            last_message_at TEXT NOT NULL,
            UNIQUE(participant1_id, participant2_id)
        )
    `);

    await runAsync(`
        CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant1_id, participant2_id)
    `);

    logger.info('📦 Database initialized');
    return db;
}

export async function createContainer(config: ChatServiceConfig): Promise<ChatServiceContainer> {
    const db = await initializeDatabase(config.databasePath);

    const messageRepository = new SQLiteMessageRepository(db);
    const conversationRepository = new SQLiteConversationRepository(db);

    const sendMessageUseCase = new SendMessageUseCase(messageRepository, conversationRepository);
    const getMessagesUseCase = new GetMessagesUseCase(messageRepository);
    const getConversationsUseCase = new GetConversationsUseCase(conversationRepository);
    const chatController = new ChatController(
        sendMessageUseCase,
        getMessagesUseCase,
        getConversationsUseCase
    );
    const healthController = new HealthController(); 
    const messagingConnection = await amqp.connect(config.messaging.uri);  
    console.log("Problem in  MQ") ;     
    const userEventsHandler = new UserEventsHandler();
    const messagingChannel = await messagingConnection.createChannel();
    userEventsHandler.setChannel(messagingChannel);

    const roomManager = new RoomManager();
    const authService = new WebSocketAuthService(config.jwtSecret);
    const connectionHandler = new ConnectionHandler(roomManager, authService);
    const sendMessageHandler = new SendMessageHandler(sendMessageUseCase);
    const disconnectHandler = new DisconnectHandler(roomManager);

    logger.info('🔧 Dependency injection container created');

    return {
        repositories: {
            messageRepository,
            conversationRepository
        },
        useCases: {
            sendMessageUseCase,
            getMessagesUseCase,
            getConversationsUseCase
        },
        controllers: {
            chatController,
            healthController
        },
        messaging: {
            connection: messagingConnection,
            userEventsHandler
        },
        websocket: {
            roomManager,
            connectionHandler,
            sendMessageHandler,
            disconnectHandler,
            authService
        }
    };
}
