# WebSocket in Hexagonal Architecture — The Architectural Decision

## The Problem We Faced

During development of the **Chat Service**, we applied **Hexagonal (Ports & Adapters) Architecture** with
**Domain-Driven Design (DDD)**. The core rule of this architecture is that **dependencies always point
inward**: infrastructure adapters depend on the application layer, which depends on the domain layer.
The domain layer depends on nothing outside itself.

```
   [Infrastructure]  →  [Application]  →  [Domain]
         ↑                   ↑                ↑
     WebSocket           Use Cases         Entities
     HTTP, DB            Policies        Domain Events
     RabbitMQ             DTOs           Repositories
```

HTTP and database adapters fit this rule naturally: a controller calls a use case, a repository
implements an interface defined in the domain — the dependency arrow always points inward.

**WebSocket broke that clean picture.**

### Why WebSocket Is Different

An HTTP response is synchronous and scoped to a single request:

```
Client ──── request ───▶  Controller ──▶ UseCase  ──▶ DB
Client ◀─── response ───  Controller ◀─ UseCase  ◀─── DB
```

WebSocket broadcasting is **not scoped to the request that triggered it**.  
When User A sends a message, the server must push it to User B — a completely different socket
connection. This means the use case needs to reach out to a WebSocket server that lives in the
infrastructure layer. In a naive implementation that looks like this:

```typescript
// ❌ WRONG — use case directly emits via Socket.IO
class SendMessageUseCase {
    constructor(private io: SocketIOServer) {} // ← import of infrastructure inside application layer!

    async execute(dto: SendMessageRequestDTO) {
        // ... save message ...
        this.io.to(`user:${recipientId}`).emit('new_message', payload); // ← infrastructure leak
    }
}
```

This violates the architecture in two ways:

1. **Dependency inversion is broken**: `SendMessageUseCase` (application layer) now imports and
   depends on `socket.io` (infrastructure layer). The arrow points the wrong way.

2. **Testability is destroyed**: every unit test for the use case needs a real (or mocked) Socket.IO
   server, even tests that have nothing to do with real-time delivery.

---

## The Solution: Domain Events + In-Process Observer (Event Bus)

The key insight was to **separate the act of sending a message from the act of broadcasting it**.
A message being sent is a *fact* that belongs to the domain.  Broadcasting that fact over WebSocket
is a *delivery mechanism* that belongs to infrastructure.

We solved it by introducing an **`IEventBus` port** in the domain layer and subscribing to that bus
from the WebSocket adapter in the infrastructure layer.

### Step 1 — Define `IEventBus` in the Domain Layer

```
services/chat-service/src/domain/events/IeventBus.ts
```

```typescript
export interface IEventBus {
    publish(event: DomainEvent): Promise<void>;
    subscribe<T extends DomainEvent>(
        eventType: new (...args: any[]) => T,
        handler: EventHandler<T>
    ): void;
}
```

`IEventBus` is a **port** (an interface). It lives in the domain layer and contains zero
infrastructure knowledge. The domain knows *what* it can do (publish events), not *how* it is done.

### Step 2 — The Use Case Publishes a Domain Event (not a WebSocket frame)

```
services/chat-service/src/application/use-cases/sendMessageUseCase.ts
```

```typescript
export class SendMessageUseCase {
    constructor(
        private readonly messageRepository: IMessageRepository,
        private readonly conversationRepository: IconversationRepository,
        private readonly friendshipPolicy: IFriendshipPolicy,
        private readonly gameChatPolicy: IGameChatPolicy,
        private readonly eventBus: IEventBus   // ← only the interface, not socket.io
    ) {}

    async execute(dto: SendMessageRequestDTO): Promise<SendMessageResponseDTO> {
        // ... validate, create message, persist to DB ...

        // ✅ Publish a domain event — zero WebSocket knowledge
        await this.eventBus.publish(new MessageSentEvent(
            message.id.toString(),
            conversation.id.toString(),
            message.senderId,
            message.senderUsername,
            message.content.getValue(),
            message.type,
            message.recipientId,
            message.gameId
        ));

        return this.toResponseDTO(message);
    }
}
```

The use case **never imports socket.io**. It only knows about `IEventBus` — an interface it received
through dependency injection. The dependency arrow still points inward.

### Step 3 — The WebSocket Adapter Subscribes to Domain Events

```
services/chat-service/src/infrastructure/websocket/ChatWebSocketServer.ts
```

```typescript
export class ChatWebSocketServer {
    constructor(httpServer: HttpServer, deps: ChatWebSocketServerDeps) {
        // deps.eventBus is typed as IEventBus (the port)
        this.io = new SocketIOServer(httpServer, { ... });
        this.configure();
        this.subscribeToEvents();  // ← wire up the bridge
    }

    private subscribeToEvents(): void {
        // Infrastructure subscribes to domain events and does the broadcasting
        this.deps.eventBus.subscribe(MessageSentEvent, async (event) => {
            const payload = { /* map event fields to frontend shape */ };

            if (event.messageType === 'GAME' && payload.gameId) {
                this.io.to(`game:${payload.gameId}`).emit('new_message', payload);
            } else if (event.recipientId) {
                this.io.to(`user:${event.senderId}`).emit('new_message', payload);
                this.io.to(`user:${event.recipientId}`).emit('new_message', payload);
            }
        });

        this.deps.eventBus.subscribe(InviteCreatedEvent, async (event) => {
            this.io.to(`user:${event.recipientId}`).emit('invite_received', { ... });
        });

        // ... InviteAcceptedEvent, InviteDeclinedEvent ...
    }
}
```

`ChatWebSocketServer` lives in the infrastructure layer and *depends on* `IEventBus` — the dependency
arrow still points inward. The domain and application layers remain completely ignorant of WebSocket.

### Step 4 — Concrete `EventBus` Implementation

```
services/chat-service/src/domain/events/EventBus.ts
```

```typescript
export class EventBus implements IEventBus {
    private handlers: Map<string, EventHandler<any>[]> = new Map();

    subscribe<T extends DomainEvent>(
        eventType: new (...args: any[]) => T,
        handler: EventHandler<T>
    ): void {
        const eventName = eventType.name;
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, []);
        }
        this.handlers.get(eventName)?.push(handler);
    }

    async publish(event: DomainEvent): Promise<void> {
        const handlers = this.handlers.get(event.eventName) || [];
        await Promise.all(
            handlers.map(handler =>
                Promise.resolve(handler(event)).catch(err =>
                    console.error(`Error in event handler for ${event.eventName}:`, err)
                )
            )
        );
    }
}
```

The concrete `EventBus` class is a simple in-memory pub/sub map. It could equally be swapped for a
Redis-backed bus or any other mechanism without touching a single line of domain or application code.

### Step 5 — Wired Together in the DI Container

```
services/chat-service/src/dependency-injection/container.ts
```

```typescript
const eventBus = new EventBus();                       // concrete implementation

const sendMessageUseCase = new SendMessageUseCase(
    messageRepository,
    conversationRepository,
    friendshipPolicy,
    gameChatPolicy,
    eventBus                                           // injected as IEventBus
);

const wsServer = new ChatWebSocketServer(httpServer, {
    ...handlers,
    eventBus,                                          // same instance → subscriptions fire
});
```

The same `EventBus` instance is injected into both the use case (as the publisher) and the WebSocket
server (which registers subscribers). Because it is the same object, when the use case publishes an
event the WebSocket subscriptions fire immediately in-process.

---

## Full Data Flow

```
Browser (User A)
    │
    │  WebSocket event: 'send_message'
    ▼
SendMessageHandler (infrastructure/websocket/handlers)
    │  delegates to use case (no direct socket emit)
    ▼
SendMessageUseCase (application/use-cases)
    │  saves Message to DB
    │  saves Conversation to DB
    │  publishes MessageSentEvent → IEventBus
    ▼
EventBus.publish(MessageSentEvent)   ← in-process, synchronous-like
    │
    │  all registered handlers called
    ▼
ChatWebSocketServer.subscribeToEvents handler
    │  maps MessageSentEvent → { id, conversationId, senderId, ... }
    ├──▶  io.to('user:<senderId>').emit('new_message', payload)
    └──▶  io.to('user:<recipientId>').emit('new_message', payload)

Browser (User B)  ◀──── receives 'new_message' event
```

Notice that `SendMessageUseCase` **never emits to a socket**. It only publishes a domain event.
The WebSocket adapter picks that up and does the broadcasting. This means the exact same use case
is called identically from the HTTP REST endpoint and from the WebSocket handler, with no branching.

---

## Why This Correctly Satisfies Hexagonal Architecture

| Concern | Layer | Dependency |
|---|---|---|
| `IEventBus` interface | Domain | nothing |
| `MessageSentEvent` | Domain | nothing |
| `SendMessageUseCase` | Application | `IEventBus` (port) |
| `EventBus` (concrete) | Domain (or infra) | `IEventBus` |
| `ChatWebSocketServer` | Infrastructure | `IEventBus` (port) + `socket.io` |
| `SendMessageHandler` | Infrastructure | `SendMessageUseCase` |

All arrows point toward the domain. No infrastructure class is imported by any domain or application
class. ✅

---

## Alternative Approaches Considered

### Option A — Inject a `IRealtimeNotifier` port into the use case

Define a second outbound port:

```typescript
// application/ports/realtime-notifier.ts
export interface IRealtimeNotifier {
    notifyNewMessage(payload: MessagePayload): Promise<void>;
}
```

Have the use case call `this.notifier.notifyNewMessage(...)` and implement it with Socket.IO in
infrastructure.

**Why we chose EventBus instead:**  
The EventBus approach naturally handles multiple subscribers (broadcasting to both sender and
recipient room, logging, analytics, etc.) without touching the use case. Adding a new reaction to
"message sent" means adding one `eventBus.subscribe(MessageSentEvent, ...)` call — zero changes to
the use case. With a dedicated port you would need to extend the `IRealtimeNotifier` interface and
update the use case every time.

### Option B — Emit directly from the handler after calling the use case

```typescript
// SendMessageHandler
const result = await this.sendMessageUseCase.execute(dto);
socket.to(`user:${result.recipientId}`).emit('new_message', result); // ← in handler, not use case
```

**Why we rejected this:**  
The handler only has access to the incoming socket. For a use case called from the HTTP adapter
there is no socket, so this logic would not run. The EventBus approach ensures broadcasting happens
regardless of which adapter triggered the use case.

---

## Key Takeaways for the Interview

1. **The constraint**: Hexagonal architecture requires all dependencies to point inward. A use case
   cannot import or call infrastructure.

2. **The conflict**: Real-time broadcasting (WebSocket push) needs to happen *after* a use case
   completes, but the use case cannot directly reference the WebSocket server.

3. **The solution**: Introduce an `IEventBus` **port** (interface) in the domain layer. Use cases
   publish **domain events**; the WebSocket adapter subscribes to those events and does the
   broadcasting. The dependency direction is preserved: infrastructure depends on the port, not
   the other way around.

4. **The pattern combination**: This is the **Observer / Pub-Sub pattern** applied at the domain
   event level, combined with the **Ports & Adapters** pattern to keep infrastructure out of the
   domain.

5. **The bonus**: Because the use case only publishes an event, the same business logic is
   reachable from any adapter (HTTP, WebSocket, RabbitMQ consumer) without modification or
   duplication.
