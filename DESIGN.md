# Design Document

## 1. How did you ensure idempotency?

### Session Creation (POST /sessions)
- Used MongoDB's `findOneAndUpdate` with `$setOnInsert` operator
- The `upsert: true` option creates the document only if it doesn't exist
- If the session already exists, it returns the existing document without modification
- This is atomic at the database level, ensuring no race conditions

### Event Creation (POST /sessions/:sessionId/events)
- Used compound unique index on `(sessionId, eventId)`
- Implemented `findOneAndUpdate` with `$setOnInsert` for atomic upsert
- Duplicate event requests return the existing event without creating a new one
- Events are immutable - once created, they cannot be modified

### Session Completion (POST /sessions/:sessionId/complete)
- Uses `findOneAndUpdate` to atomically set status and endedAt
- Multiple completion requests result in the same final state
- No validation prevents completing an already completed session

## 2. How does your design behave under concurrent requests?

### Database-Level Atomicity
- All critical operations use MongoDB's atomic operations (`findOneAndUpdate`)
- Unique indexes prevent duplicate documents at the database level
- No application-level locking required

### Concurrent Session Creation
- Multiple simultaneous requests with the same `sessionId` will result in only one document being created
- The `$setOnInsert` operator ensures fields are only set on insert, not on subsequent finds
- All concurrent requests receive the same session document

### Concurrent Event Creation
- Compound unique index `(sessionId, eventId)` prevents duplicates
- If two requests try to create the same event simultaneously, one succeeds and the other gets the existing event
- MongoDB handles the race condition at the database level

### Read Operations
- Session and event reads are eventually consistent
- Pagination uses skip/limit which is simple but may have performance implications at scale

## 3. What MongoDB indexes did you choose and why?

### ConversationSession Collection
```javascript
{ sessionId: 1 } - unique index
{ status: 1 }
{ startedAt: -1 }
```

**Rationale:**
- `sessionId` (unique): Primary lookup field, ensures uniqueness, supports fast O(1) lookups
- `status`: Enables efficient filtering by session status (e.g., finding all active sessions)
- `startedAt`: Supports time-based queries and sorting (descending for recent-first)

### ConversationEvent Collection
```javascript
{ sessionId: 1, eventId: 1 } - unique compound index
{ sessionId: 1, timestamp: -1 }
```

**Rationale:**
- `(sessionId, eventId)` unique compound: Ensures event uniqueness per session, supports idempotent event creation
- `(sessionId, timestamp)`: Optimizes the primary query pattern - fetching events for a session ordered by time
- The compound index covers both the filter (`sessionId`) and sort (`timestamp`) operations

## 4. How would you scale this system for millions of sessions per day?

### Immediate Optimizations (No Architecture Change)
1. **Connection Pooling**: Configure MongoDB connection pool size appropriately
2. **Index Optimization**: Monitor slow queries and add covering indexes
3. **Pagination**: Current offset/limit approach works but consider cursor-based pagination for better performance
4. **Caching**: Add Redis for frequently accessed sessions (active sessions)

### Medium-Term Scaling (Horizontal Scaling)
1. **MongoDB Sharding**:
   - Shard key: `sessionId` (provides even distribution)
   - Ensures queries by sessionId hit a single shard
   - Events naturally co-located with their session

2. **Application Scaling**:
   - Stateless NestJS instances behind load balancer
   - Horizontal pod autoscaling in Kubernetes
   - No application state means easy scaling

3. **Read Replicas**:
   - Route read operations to MongoDB replicas
   - Write operations go to primary
   - Reduces load on primary database

### Long-Term Scaling (Architectural Changes)
1. **Event Sourcing**:
   - Store events in a separate, append-only event store
   - Use message queue (Kafka/RabbitMQ) for event ingestion
   - Decouple event writes from session reads

2. **CQRS Pattern**:
   - Separate write model (command) from read model (query)
   - Materialized views for common query patterns
   - Event-driven updates to read models

3. **Time-Series Optimization**:
   - Use MongoDB time-series collections for events (MongoDB 5.0+)
   - Better compression and query performance for time-ordered data
   - Automatic bucketing and retention policies

4. **Data Archival**:
   - Move completed sessions older than X days to cold storage
   - Keep hot data (active/recent sessions) in primary database
   - Use TTL indexes for automatic cleanup

5. **Microservices Split**:
   - Separate service for session management
   - Separate service for event ingestion
   - API Gateway for routing

## 5. What did you intentionally keep out of scope, and why?

### Authentication & Authorization
- **Why**: Assignment explicitly stated no auth required
- **Production Need**: Would add JWT-based auth with role-based access control

### Comprehensive Testing
- **Why**: Tests are optional, focused on core implementation
- **Production Need**: Unit tests for services, integration tests for repositories, E2E tests for API endpoints

### Advanced Error Handling
- **Why**: Basic error handling (NotFoundException) is sufficient for demo
- **Production Need**: Custom exception filters, structured error responses, error tracking (Sentry)

### Logging & Monitoring
- **Why**: Kept simple to focus on core functionality
- **Production Need**: Structured logging (Winston/Pino), metrics (Prometheus), tracing (OpenTelemetry)

### Configuration Management
- **Why**: Simple environment variable approach
- **Production Need**: Config service with validation, different configs per environment

### API Documentation
- **Why**: Time constraint, API is straightforward
- **Production Need**: Swagger/OpenAPI documentation

### Rate Limiting & Throttling
- **Why**: Not required for assignment
- **Production Need**: Essential for production to prevent abuse

### Data Validation Edge Cases
- **Why**: Basic validation with class-validator is sufficient
- **Production Need**: More comprehensive validation, sanitization, business rule validation

### Background Jobs
- **Why**: Assignment explicitly excluded
- **Production Need**: Session cleanup, analytics aggregation, archival jobs

### Soft Deletes
- **Why**: No delete operations in requirements
- **Production Need**: Soft delete for sessions/events with audit trail

### Multi-tenancy
- **Why**: Single-tenant assumption
- **Production Need**: Tenant isolation, separate databases or tenant-aware queries

### Performance Optimizations
- **Why**: Correctness over premature optimization
- **Production Need**: Query optimization, caching strategy, connection pooling tuning

---

## Technology Choices

### Why NestJS?
- Enterprise-grade framework with excellent TypeScript support
- Built-in dependency injection
- Modular architecture promotes separation of concerns
- Extensive ecosystem and community support

### Why Mongoose?
- Type-safe MongoDB ODM with excellent TypeScript support
- Schema validation at application level
- Middleware support for hooks
- Familiar API for developers

### Repository Pattern
- Abstracts data access logic
- Makes testing easier (can mock repositories)
- Centralizes database operations
- Follows SOLID principles

---

## Assumptions Made

1. **Session Uniqueness**: `sessionId` is provided by the client and is globally unique
2. **Event Ordering**: Events are ordered by timestamp, which is set server-side
3. **Immutability**: Events cannot be modified or deleted once created
4. **Session Lifecycle**: Sessions can only transition to 'completed' status via the complete endpoint
5. **Concurrent Requests**: The system should handle concurrent requests gracefully without data corruption
6. **MongoDB Availability**: MongoDB is running and accessible (local or Docker)
7. **Network Reliability**: No retry logic for failed database operations (would add in production)
8. **Data Retention**: No automatic cleanup or archival (would add TTL indexes in production)
