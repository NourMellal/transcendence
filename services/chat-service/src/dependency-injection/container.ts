import { Database } from 'sqlite3';
import { promisify } from 'util';
import { ChatServiceConfig, logger } from '../infrastructure/config';
import { SQLiteMessageRepository } from '../infrastructure/database/repositories/sqlite-message.repository';
import { SQLiteConversationRepository } from '../infrastructure/database/repositories/sqlite-conversation.repository';
import { SendMessageUseCase } from '../application/use-cases/sendMessageUseCase';
import { GetMessagesUseCase } from '../application/use-cases/get-messages.usecase';
import { GetConversationsUseCase } from '../application/use-cases/get-conversation.usecase';
import { ChatController } from '../infrastructure/http/controllers/chat.contoller';
import { HealthController } from '../infrastructure/http/controllers/health.controller';
import { RoomManager } from '../infrastructure/websocket/RoomManager';
import { ConnectionHandler } from '../infrastructure/websocket/handlers/ConnectionHandler';
import { SendMessageHandler } from '../infrastructure/websocket/handlers/SendMessageHandler';
import { DisconnectHandler } from '../infrastructure/websocket/handlers/DisconnectHandler';
import { TypingHandler } from '../infrastructure/websocket/handlers/TypingHandler';
import { WebSocketAuthService } from '../infrastructure/websocket/services/WebSocketAuthService';
import { UserServiceClient } from '../infrastructure/external/UserServiceClient';
import { GameServiceClient } from '../infrastructure/external/GameServiceClient';
import { FriendshipPolicy, GameChatPolicy } from '../application/services/chat-policies';

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
    readonly websocket: {
        readonly roomManager: RoomManager;
        readonly connectionHandler: ConnectionHandler;
        readonly sendMessageHandler: SendMessageHandler;
        readonly disconnectHandler: DisconnectHandler;
        readonly typingHandler: TypingHandler;
        readonly authService: WebSocketAuthService;
    };
}

async function initializeDatabase(dbPath: string): Promise<Database> {
    const db = new Database(dbPath);
    const runAsync = promisify(db.run.bind(db));

    await runAsync(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
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
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC)
    `);

    await runAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_direct ON messages(sender_id, recipient_id) WHERE type = 'DIRECT'
    `);

    await runAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_game ON messages(game_id) WHERE type = 'GAME'
    `);

    await runAsync(`
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            participant1_id TEXT NOT NULL,
            participant2_id TEXT NOT NULL,
            game_id TEXT,
            last_message_at TEXT NOT NULL,
            UNIQUE(participant1_id, participant2_id, type),
            UNIQUE(game_id, type)
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
    const userServiceClient = new UserServiceClient(config.userServiceBaseUrl, config.internalApiKey);
    const gameServiceClient = new GameServiceClient(config.gameServiceBaseUrl, config.internalApiKey);
    const friendshipPolicy = new FriendshipPolicy(userServiceClient);
    const gameChatPolicy = new GameChatPolicy(gameServiceClient);

    const sendMessageUseCase = new SendMessageUseCase(
        messageRepository,
        conversationRepository,
        friendshipPolicy,
        gameChatPolicy
    );
    const getMessagesUseCase = new GetMessagesUseCase(messageRepository, conversationRepository);
    const getConversationsUseCase = new GetConversationsUseCase(conversationRepository, messageRepository);
    const chatController = new ChatController(
        sendMessageUseCase,
        getMessagesUseCase,
        getConversationsUseCase
    );
    const healthController = new HealthController(); 

    const roomManager = new RoomManager();
    const authService = new WebSocketAuthService(config.jwtSecret);
    const connectionHandler = new ConnectionHandler(roomManager, gameChatPolicy);
    const sendMessageHandler = new SendMessageHandler(sendMessageUseCase);
    const disconnectHandler = new DisconnectHandler(roomManager);
    const typingHandler = new TypingHandler();

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
        websocket: {
            roomManager,
            connectionHandler,
            sendMessageHandler,
            disconnectHandler,
            typingHandler,
            authService
        }
    };
}
