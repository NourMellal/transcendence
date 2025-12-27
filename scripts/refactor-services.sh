#!/bin/bash

# Refactoring script for Transcendence microservices
# Creates hexagonal architecture structure with messaging infrastructure

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICES=("user-service" "game-service" "chat-service" "tournament-service")

echo "🚀 Starting Transcendence services refactoring..."
echo "================================================"

# Function to create service structure
create_service_structure() {
    local service=$1
    local service_path="$PROJECT_ROOT/services/$service"

    echo "📁 Refactoring $service..."

    # Create domain layer
    mkdir -p "$service_path/src/domain/entities"
    mkdir -p "$service_path/src/domain/events"
    mkdir -p "$service_path/src/domain/repositories"
    mkdir -p "$service_path/src/domain/value-objects"

    # Create application layer
    mkdir -p "$service_path/src/application/use-cases"
    mkdir -p "$service_path/src/application/services"
    mkdir -p "$service_path/src/application/dto"

    # Create infrastructure layer
    mkdir -p "$service_path/src/infrastructure/messaging/config"
    mkdir -p "$service_path/src/infrastructure/messaging/handlers"
    mkdir -p "$service_path/src/infrastructure/messaging/serialization"
    mkdir -p "$service_path/src/infrastructure/database/repositories"
    mkdir -p "$service_path/src/infrastructure/database/migrations"
    mkdir -p "$service_path/src/infrastructure/http/routes"
    mkdir -p "$service_path/src/infrastructure/http/controllers"
    mkdir -p "$service_path/src/infrastructure/http/middlewares"

    # Create empty messaging infrastructure files
    touch "$service_path/src/infrastructure/messaging/RabbitMQConnection.ts"
    touch "$service_path/src/infrastructure/messaging/RabbitMQPublisher.ts"
    touch "$service_path/src/infrastructure/messaging/RabbitMQConsumer.ts"
    touch "$service_path/src/infrastructure/messaging/config/messaging.config.ts"
    touch "$service_path/src/infrastructure/messaging/serialization/EventSerializer.ts"

    # Create domain layer files
    touch "$service_path/src/domain/entities/.gitkeep"
    touch "$service_path/src/domain/events/.gitkeep"
    touch "$service_path/src/domain/repositories/.gitkeep"
    touch "$service_path/src/domain/value-objects/.gitkeep"

    # Create application layer files
    touch "$service_path/src/application/use-cases/.gitkeep"
    touch "$service_path/src/application/services/.gitkeep"
    touch "$service_path/src/application/dto/.gitkeep"

    # Create infrastructure files
    touch "$service_path/src/infrastructure/database/repositories/.gitkeep"
    touch "$service_path/src/infrastructure/database/migrations/.gitkeep"
    touch "$service_path/src/infrastructure/http/routes/.gitkeep"
    touch "$service_path/src/infrastructure/http/controllers/.gitkeep"
    touch "$service_path/src/infrastructure/http/middlewares/.gitkeep"

    echo "✅ $service structure created"
}

# Function to create shared-messaging structure
create_shared_messaging_structure() {
    local messaging_path="$PROJECT_ROOT/packages/shared-messaging"

    echo "📦 Setting up shared-messaging package..."

    # Create event directories
    mkdir -p "$messaging_path/src/events/user"
    mkdir -p "$messaging_path/src/events/game"
    mkdir -p "$messaging_path/src/events/chat"
    mkdir -p "$messaging_path/src/events/tournament"

    # Create base directory (already exists, ensure it's there)
    mkdir -p "$messaging_path/src/base"
    mkdir -p "$messaging_path/src/enums"

    # Create user events
    touch "$messaging_path/src/events/user/UserRegisteredIntegrationEvent.ts"
    touch "$messaging_path/src/events/user/UserProfileUpdatedIntegrationEvent.ts"
    touch "$messaging_path/src/events/user/UserDeletedIntegrationEvent.ts"
    touch "$messaging_path/src/events/user/UserAuthenticatedIntegrationEvent.ts"
    touch "$messaging_path/src/events/user/index.ts"

    # Create game events
    touch "$messaging_path/src/events/game/GameStartedIntegrationEvent.ts"
    touch "$messaging_path/src/events/game/GameFinishedIntegrationEvent.ts"
    touch "$messaging_path/src/events/game/PlayerJoinedIntegrationEvent.ts"
    touch "$messaging_path/src/events/game/PlayerLeftIntegrationEvent.ts"
    touch "$messaging_path/src/events/game/GameScoreUpdatedIntegrationEvent.ts"
    touch "$messaging_path/src/events/game/index.ts"

    # Create chat events
    touch "$messaging_path/src/events/chat/MessageSentIntegrationEvent.ts"
    touch "$messaging_path/src/events/chat/UserJoinedChatIntegrationEvent.ts"
    touch "$messaging_path/src/events/chat/UserLeftChatIntegrationEvent.ts"
    touch "$messaging_path/src/events/chat/index.ts"

    # Create tournament events
    touch "$messaging_path/src/events/tournament/TournamentCreatedIntegrationEvent.ts"
    touch "$messaging_path/src/events/tournament/TournamentStartedIntegrationEvent.ts"
    touch "$messaging_path/src/events/tournament/TournamentFinishedIntegrationEvent.ts"
    touch "$messaging_path/src/events/tournament/PlayerRegisteredIntegrationEvent.ts"
    touch "$messaging_path/src/events/tournament/index.ts"

    # Create event index
    touch "$messaging_path/src/events/index.ts"

    # Create enum files
    touch "$messaging_path/src/enums/EventType.ts"
    touch "$messaging_path/src/enums/EventStatus.ts"
    touch "$messaging_path/src/enums/index.ts"

    echo "✅ shared-messaging structure created"
}

# Main execution
echo ""
echo "Step 1: Creating shared-messaging structure"
echo "--------------------------------------------"
create_shared_messaging_structure

echo ""
echo "Step 2: Creating service structures"
echo "------------------------------------"
for service in "${SERVICES[@]}"; do
    create_service_structure "$service"
    echo ""
done

echo "================================================"
echo "✨ Refactoring complete!"
echo ""
echo "Next steps:"
echo "1. Update package.json files with messaging dependencies"
echo "2. Implement messaging infrastructure in each service"
echo "3. Define integration event contracts in shared-messaging"
echo "4. Implement event handlers in each service"
echo ""
echo "Project structure now follows hexagonal architecture with:"
echo "- Domain layer (entities, events, repositories)"
echo "- Application layer (use-cases, services, DTOs)"
echo "- Infrastructure layer (messaging, database, http)"
echo ""
echo "RabbitMQ messaging infrastructure ready for implementation."
