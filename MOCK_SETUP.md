# MOCK Implementation Setup

**⚠️ This project currently uses MOCK implementations for development and testing purposes.**

## Mock Components

### Authentication Services
- **File**: `src/adapters/external/oauth42-client.ts`
- **Status**: `MOCK - FortyTwoOAuthClient`
- **Description**: Mock 42 School OAuth authentication
- **Mock Behavior**: 
  - Returns fake access tokens
  - Returns mock user data (mockuser@student.42.fr)
- **TODO**: Replace with real 42 API integration

### Database Layer
- **File**: `src/adapters/persistence/sqlite/user.repo.ts`
- **Status**: `MOCK - MockSqliteUserRepo`
- **Description**: Mock SQLite user repository
- **Mock Behavior**: 
  - Logs operations to console
  - Returns null for all queries
- **TODO**: Implement real SQLite database queries

- **File**: `src/adapters/persistence/session.store.ts`
- **Status**: `MOCK - MockSqliteSessionStore`
- **Description**: Mock session storage using in-memory Map
- **Mock Behavior**: 
  - Uses JavaScript Map for temporary storage
  - Sessions lost on server restart
- **TODO**: Implement persistent SQLite session storage

### Two-Factor Authentication
- **File**: `src/adapters/external/twofa-service.ts`
- **Status**: `MOCK - OtpTwoFAService`
- **Description**: Mock 2FA service without otplib
- **Mock Behavior**: 
  - Generates fake secrets
  - Returns dummy QR codes
  - Accepts '123456' as valid token for testing
- **TODO**: Install otplib and qrcode packages, implement real 2FA

### File Storage
- **File**: `src/adapters/external/image-store.ts`
- **Status**: `MOCK - LocalImageStore`
- **Description**: Basic local file storage (no validation/processing)
- **Mock Behavior**: 
  - Saves files directly to local filesystem
  - No image validation or processing
- **TODO**: Add image validation, cloud storage integration

## Development Servers

### Frontend (Vite)
- **Port**: 3002
- **Config**: `vite.config.ts` - includes MOCK proxy to backend
- **Status**: Development server with hot reload

### Backend (Express/Fastify)
- **Port**: 3001
- **File**: `src/adapters/web/server.ts`
- **Status**: Mock API server with placeholder endpoints

## For Production Deployment

To convert from MOCK to production:

1. **Database**: Initialize real SQLite database and implement queries
2. **42 OAuth**: Get real client credentials and implement API calls
3. **2FA**: Install `otplib` and `qrcode` packages
4. **File Storage**: Add validation and consider cloud storage
5. **Sessions**: Implement persistent session storage
6. **Environment**: Configure production environment variables

## Testing with Mock Data

- **Login**: Use any credentials (mock authentication always succeeds)
- **2FA**: Use token '123456' for testing
- **Sessions**: In-memory only (lost on restart)
- **User Data**: Returns mock user profile
