# Testing Guide

This document provides comprehensive testing instructions for the Conversation Service API.

## Prerequisites

1. **MongoDB Running**: Ensure MongoDB is running (see README.md for setup)
2. **Application Running**: Start the application with `npm run start:dev`

## Quick Start with Docker

```bash
# Start MongoDB
npm run docker:up

# Start the application
npm run start:dev

# In another terminal, follow the test scenarios below
```

## Test Scenarios

### Scenario 1: Basic Session Lifecycle

**Step 1: Create a new session**
```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "language": "en",
    "metadata": {
      "userId": "user-123",
      "channel": "phone"
    }
  }'
```

**Expected Response:**
- Status: 200 OK
- Body contains: `sessionId`, `status: "initiated"`, `startedAt`, `endedAt: null`

**Step 2: Add a user speech event**
```bash
curl -X POST http://localhost:3000/sessions/test-session-001/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-001",
    "type": "user_speech",
    "payload": {
      "text": "Hello, I need help with my account",
      "confidence": 0.95,
      "duration": 2.3
    }
  }'
```

**Expected Response:**
- Status: 201 Created
- Body contains: `eventId`, `sessionId`, `type`, `payload`, `timestamp`

**Step 3: Add a bot speech event**
```bash
curl -X POST http://localhost:3000/sessions/test-session-001/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-002",
    "type": "bot_speech",
    "payload": {
      "text": "I can help you with that. What seems to be the issue?",
      "duration": 3.1
    }
  }'
```

**Step 4: Add a system event**
```bash
curl -X POST http://localhost:3000/sessions/test-session-001/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-003",
    "type": "system",
    "payload": {
      "action": "sentiment_analysis",
      "sentiment": "neutral",
      "score": 0.5
    }
  }'
```

**Step 5: Get session with events**
```bash
curl http://localhost:3000/sessions/test-session-001
```

**Expected Response:**
- Status: 200 OK
- Body contains: `session` object, `events` array (3 events), `pagination` object

**Step 6: Complete the session**
```bash
curl -X POST http://localhost:3000/sessions/test-session-001/complete
```

**Expected Response:**
- Status: 200 OK
- Body contains: `status: "completed"`, `endedAt` is not null

---

### Scenario 2: Testing Idempotency

**Test 1: Create the same session twice**

First request:
```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "idempotent-session",
    "language": "en"
  }'
```

Second request (same sessionId, different language):
```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "idempotent-session",
    "language": "fr"
  }'
```

**Expected Behavior:**
- Both requests return 200 OK
- Both responses are identical
- Language remains "en" (from first request)
- Only one document created in database

**Test 2: Add the same event twice**

First request:
```bash
curl -X POST http://localhost:3000/sessions/idempotent-session/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "duplicate-event",
    "type": "user_speech",
    "payload": {
      "text": "Original text"
    }
  }'
```

Second request (same eventId, different payload):
```bash
curl -X POST http://localhost:3000/sessions/idempotent-session/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "duplicate-event",
    "type": "user_speech",
    "payload": {
      "text": "Modified text - should not update"
    }
  }'
```

**Expected Behavior:**
- Both requests return 201 Created
- Both responses are identical
- Payload contains "Original text" (from first request)
- Only one event document created

**Test 3: Complete session multiple times**

```bash
# First completion
curl -X POST http://localhost:3000/sessions/idempotent-session/complete

# Second completion
curl -X POST http://localhost:3000/sessions/idempotent-session/complete
```

**Expected Behavior:**
- Both requests return 200 OK
- Both responses are identical
- `endedAt` timestamp is the same in both responses

---

### Scenario 3: Pagination Testing

**Setup: Create a session with many events**

```bash
# Create session
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "pagination-test",
    "language": "en"
  }'

# Add 25 events (run this in a loop or script)
for i in {1..25}; do
  curl -X POST http://localhost:3000/sessions/pagination-test/events \
    -H "Content-Type: application/json" \
    -d "{
      \"eventId\": \"event-$i\",
      \"type\": \"user_speech\",
      \"payload\": {
        \"text\": \"Message number $i\"
      }
    }"
done
```

**Test 1: Get first page**
```bash
curl "http://localhost:3000/sessions/pagination-test?offset=0&limit=10"
```

**Expected Response:**
- `events` array has 10 items
- `pagination.total` is 25
- `pagination.hasMore` is true
- `pagination.offset` is 0
- `pagination.limit` is 10

**Test 2: Get second page**
```bash
curl "http://localhost:3000/sessions/pagination-test?offset=10&limit=10"
```

**Expected Response:**
- `events` array has 10 items
- `pagination.total` is 25
- `pagination.hasMore` is true
- `pagination.offset` is 10

**Test 3: Get last page**
```bash
curl "http://localhost:3000/sessions/pagination-test?offset=20&limit=10"
```

**Expected Response:**
- `events` array has 5 items
- `pagination.total` is 25
- `pagination.hasMore` is false
- `pagination.offset` is 20

---

### Scenario 4: Error Handling

**Test 1: Add event to non-existent session**
```bash
curl -X POST http://localhost:3000/sessions/non-existent/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-001",
    "type": "user_speech",
    "payload": {
      "text": "Hello"
    }
  }'
```

**Expected Response:**
- Status: 404 Not Found
- Body: `{"statusCode": 404, "message": "Session with ID non-existent not found"}`

**Test 2: Get non-existent session**
```bash
curl http://localhost:3000/sessions/non-existent
```

**Expected Response:**
- Status: 404 Not Found
- Body: `{"statusCode": 404, "message": "Session with ID non-existent not found"}`

**Test 3: Complete non-existent session**
```bash
curl -X POST http://localhost:3000/sessions/non-existent/complete
```

**Expected Response:**
- Status: 404 Not Found

**Test 4: Invalid request body**
```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test",
    "language": 123
  }'
```

**Expected Response:**
- Status: 400 Bad Request
- Body contains validation errors

**Test 5: Invalid event type**
```bash
curl -X POST http://localhost:3000/sessions/test-session-001/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-999",
    "type": "invalid_type",
    "payload": {}
  }'
```

**Expected Response:**
- Status: 400 Bad Request
- Body contains validation error about invalid enum value

---

### Scenario 5: Concurrent Request Testing

This scenario tests the system's behavior under concurrent requests.

**Setup: Create a script to send concurrent requests**

Create a file `concurrent-test.sh`:
```bash
#!/bin/bash

# Test concurrent session creation
for i in {1..10}; do
  curl -X POST http://localhost:3000/sessions \
    -H "Content-Type: application/json" \
    -d '{
      "sessionId": "concurrent-session",
      "language": "en"
    }' &
done
wait

# Test concurrent event creation
for i in {1..10}; do
  curl -X POST http://localhost:3000/sessions/concurrent-session/events \
    -H "Content-Type: application/json" \
    -d '{
      "eventId": "concurrent-event",
      "type": "user_speech",
      "payload": {"text": "Test"}
    }' &
done
wait
```

**Expected Behavior:**
- All session creation requests return the same session
- All event creation requests return the same event
- No duplicate documents created
- No errors or race conditions

---

## Unit Tests

Run the unit tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:cov
```

**Expected Results:**
- All 9 tests pass
- Coverage should be high for service layer

---

## Using Postman

1. Import the `postman-collection.json` file into Postman
2. Run the entire collection or individual requests
3. Use the "Test Idempotency" and "Test Duplicate Event" requests to verify idempotent behavior

---

## Database Verification

Connect to MongoDB to verify data:

```bash
# Using mongosh
mongosh mongodb://localhost:27017/conversation-service

# List all sessions
db.conversationsessions.find().pretty()

# List all events for a session
db.conversationevents.find({ sessionId: "test-session-001" }).sort({ timestamp: 1 }).pretty()

# Check indexes
db.conversationsessions.getIndexes()
db.conversationevents.getIndexes()

# Count documents
db.conversationsessions.countDocuments()
db.conversationevents.countDocuments()
```

---

## Performance Testing

For basic performance testing, you can use Apache Bench (ab) or similar tools:

```bash
# Test session creation endpoint
ab -n 1000 -c 10 -p session.json -T application/json http://localhost:3000/sessions

# Where session.json contains:
# {"sessionId":"perf-test-{{$randomInt}}","language":"en"}
```

---

## Cleanup

After testing, you can clean up the database:

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/conversation-service

# Drop all collections
db.conversationsessions.drop()
db.conversationevents.drop()

# Or drop the entire database
use conversation-service
db.dropDatabase()
```

Stop Docker containers:
```bash
npm run docker:down
```
