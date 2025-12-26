# Conversation Session Service

A backend service for a Voice AI platform that manages conversation sessions and events.

## Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: MongoDB
- **ODM**: Mongoose
- **Validation**: class-validator, class-transformer

## Features

- ✅ Idempotent session creation
- ✅ Concurrent-safe event creation
- ✅ Paginated event retrieval
- ✅ Session completion
- ✅ Proper error handling
- ✅ MongoDB indexing for performance
- ✅ Clean separation of concerns (Controllers, Services, Repositories)

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v5.0 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure MongoDB

The application connects to MongoDB using the `MONGODB_URI` environment variable.

**Option A: Local MongoDB**
```bash
# Default connection (no environment variable needed)
# Connects to: mongodb://localhost:27017/conversation-service
```

**Option B: Custom MongoDB URI**
```bash
# Create a .env file in the root directory
echo "MONGODB_URI=mongodb://localhost:27017/conversation-service" > .env
```

**Option C: Docker MongoDB**
```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Use default connection string or set MONGODB_URI
```

### 3. Run the Application

**Development Mode**
```bash
npm run start:dev
```

**Production Mode**
```bash
npm run build
npm run start:prod
```

The server will start on `http://localhost:3000`

## API Endpoints

### 1. Create or Get Session (Idempotent)

**POST** `/sessions`

Creates a new session or returns existing one if `sessionId` already exists.

**Request Body:**
```json
{
  "sessionId": "session-123",
  "language": "en",
  "status": "initiated",
  "metadata": {
    "userId": "user-456",
    "channel": "phone"
  }
}
```

**Response:**
```json
{
  "_id": "...",
  "sessionId": "session-123",
  "status": "initiated",
  "language": "en",
  "startedAt": "2024-12-24T06:40:15.000Z",
  "endedAt": null,
  "metadata": {
    "userId": "user-456",
    "channel": "phone"
  }
}
```

### 2. Add Event to Session

**POST** `/sessions/:sessionId/events`

Adds an event to an existing session. Duplicate events (same `eventId`) are ignored.

**Request Body:**
```json
{
  "eventId": "event-001",
  "type": "user_speech",
  "payload": {
    "text": "Hello, how can I help you?",
    "confidence": 0.95
  }
}
```

**Response:**
```json
{
  "_id": "...",
  "eventId": "event-001",
  "sessionId": "session-123",
  "type": "user_speech",
  "payload": {
    "text": "Hello, how can I help you?",
    "confidence": 0.95
  },
  "timestamp": "2024-12-24T06:41:00.000Z"
}
```

**Error Response (Session Not Found):**
```json
{
  "statusCode": 404,
  "message": "Session with ID session-999 not found"
}
```

### 3. Get Session with Events

**GET** `/sessions/:sessionId?offset=0&limit=50`

Retrieves session details with paginated events.

**Query Parameters:**
- `offset` (optional, default: 0): Number of events to skip
- `limit` (optional, default: 50): Maximum number of events to return

**Response:**
```json
{
  "session": {
    "_id": "...",
    "sessionId": "session-123",
    "status": "active",
    "language": "en",
    "startedAt": "2024-12-24T06:40:15.000Z",
    "endedAt": null,
    "metadata": {}
  },
  "events": [
    {
      "_id": "...",
      "eventId": "event-001",
      "sessionId": "session-123",
      "type": "user_speech",
      "payload": { "text": "Hello" },
      "timestamp": "2024-12-24T06:41:00.000Z"
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 50,
    "total": 1,
    "hasMore": false
  }
}
```

### 4. Complete Session

**POST** `/sessions/:sessionId/complete`

Marks a session as completed. Idempotent - can be called multiple times.

**Response:**
```json
{
  "_id": "...",
  "sessionId": "session-123",
  "status": "completed",
  "language": "en",
  "startedAt": "2024-12-24T06:40:15.000Z",
  "endedAt": "2024-12-24T06:45:00.000Z",
  "metadata": {}
}
```

## Project Structure

```
src/
├── sessions/
│   ├── controllers/
│   │   └── sessions.controller.ts    # REST API endpoints
│   ├── services/
│   │   └── sessions.service.ts       # Business logic
│   ├── repositories/
│   │   ├── session.repository.ts     # Session data access
│   │   └── event.repository.ts       # Event data access
│   ├── schemas/
│   │   ├── conversation-session.schema.ts  # Session model
│   │   └── conversation-event.schema.ts    # Event model
│   ├── dto/
│   │   ├── create-session.dto.ts     # Session creation DTO
│   │   ├── create-event.dto.ts       # Event creation DTO
│   │   └── pagination-query.dto.ts   # Pagination DTO
│   └── sessions.module.ts            # Module definition
├── app.module.ts                     # Root module
└── main.ts                           # Application entry point
```

## MongoDB Indexes

### ConversationSession Collection
- `{ sessionId: 1 }` - Unique index for fast lookups
- `{ status: 1 }` - Filter by status
- `{ startedAt: -1 }` - Time-based queries

### ConversationEvent Collection
- `{ sessionId: 1, eventId: 1 }` - Unique compound index (prevents duplicates)
- `{ sessionId: 1, timestamp: -1 }` - Optimized for event retrieval

## Testing the API

### Using cURL

```bash
# Create a session
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "language": "en",
    "metadata": {"userId": "user-456"}
  }'

# Add an event
curl -X POST http://localhost:3000/sessions/session-123/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-001",
    "type": "user_speech",
    "payload": {"text": "Hello"}
  }'

# Get session with events
curl http://localhost:3000/sessions/session-123?offset=0&limit=10

# Complete session
curl -X POST http://localhost:3000/sessions/session-123/complete
```

### Using Postman

Import the following collection or manually create requests for each endpoint listed above.

## Assumptions

1. **Session ID Uniqueness**: The `sessionId` is provided by the client and must be globally unique
2. **Event Immutability**: Events cannot be modified or deleted once created
3. **Server-Side Timestamps**: Event timestamps are set server-side to ensure consistency
4. **MongoDB Availability**: A running MongoDB instance is required (local or Docker)
5. **No Authentication**: As per requirements, no authentication is implemented
6. **Idempotency**: All POST operations are designed to be idempotent and safe under concurrent requests

## Design Decisions

For detailed design decisions, scaling strategies, and architectural considerations, please refer to [DESIGN.md](./DESIGN.md).

## Key Implementation Highlights

### Idempotency
- Session creation uses MongoDB's `findOneAndUpdate` with `$setOnInsert`
- Event creation uses compound unique index to prevent duplicates
- All operations are safe to retry

### Concurrency Safety
- Atomic database operations prevent race conditions
- No application-level locking required
- Unique indexes enforce constraints at database level

### Performance
- Strategic indexing for common query patterns
- Pagination support for large event lists
- Efficient compound indexes for event retrieval

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution**: Ensure MongoDB is running
```bash
# Check if MongoDB is running
mongosh

# Or start MongoDB service
# Windows: net start MongoDB
# Linux: sudo systemctl start mongod
# macOS: brew services start mongodb-community
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**: Change the port
```bash
PORT=3001 npm run start:dev
```

## License

This project is created as a take-home assignment and is not licensed for production use.
