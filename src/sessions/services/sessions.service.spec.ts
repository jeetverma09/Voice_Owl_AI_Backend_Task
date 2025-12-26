import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { SessionRepository } from '../repositories/session.repository';
import { EventRepository } from '../repositories/event.repository';
import { NotFoundException } from '@nestjs/common';
import { SessionStatus } from '../schemas/conversation-session.schema';
import { EventType } from '../schemas/conversation-event.schema';

describe('SessionsService', () => {
    let service: SessionsService;
    let sessionRepository: SessionRepository;
    let eventRepository: EventRepository;

    const mockSessionRepository = {
        createOrGet: jest.fn(),
        findBySessionId: jest.fn(),
        completeSession: jest.fn(),
    };

    const mockEventRepository = {
        createEvent: jest.fn(),
        findBySessionId: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionsService,
                {
                    provide: SessionRepository,
                    useValue: mockSessionRepository,
                },
                {
                    provide: EventRepository,
                    useValue: mockEventRepository,
                },
            ],
        }).compile();

        service = module.get<SessionsService>(SessionsService);
        sessionRepository = module.get<SessionRepository>(SessionRepository);
        eventRepository = module.get<EventRepository>(EventRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createOrGetSession', () => {
        it('should create a new session', async () => {
            const createSessionDto = {
                sessionId: 'session-123',
                language: 'en',
                status: SessionStatus.INITIATED,
            };

            const mockSession = {
                ...createSessionDto,
                startedAt: new Date(),
                endedAt: null,
                metadata: {},
            };

            mockSessionRepository.createOrGet.mockResolvedValue(mockSession);

            const result = await service.createOrGetSession(createSessionDto);

            expect(result).toEqual(mockSession);
            expect(sessionRepository.createOrGet).toHaveBeenCalledWith(createSessionDto);
        });

        it('should return existing session (idempotent)', async () => {
            const createSessionDto = {
                sessionId: 'session-123',
                language: 'en',
            };

            const existingSession = {
                sessionId: 'session-123',
                language: 'en',
                status: SessionStatus.ACTIVE,
                startedAt: new Date('2024-01-01'),
                endedAt: null,
                metadata: {},
            };

            mockSessionRepository.createOrGet.mockResolvedValue(existingSession);

            const result = await service.createOrGetSession(createSessionDto);

            expect(result).toEqual(existingSession);
            expect(result.status).toBe(SessionStatus.ACTIVE);
        });
    });

    describe('addEvent', () => {
        it('should add event to existing session', async () => {
            const sessionId = 'session-123';
            const createEventDto = {
                eventId: 'event-001',
                type: EventType.USER_SPEECH,
                payload: { text: 'Hello' },
            };

            const mockSession = {
                sessionId,
                status: SessionStatus.ACTIVE,
                language: 'en',
                startedAt: new Date(),
                endedAt: null,
                metadata: {},
            };

            const mockEvent = {
                ...createEventDto,
                sessionId,
                timestamp: new Date(),
            };

            mockSessionRepository.findBySessionId.mockResolvedValue(mockSession);
            mockEventRepository.createEvent.mockResolvedValue(mockEvent);

            const result = await service.addEvent(sessionId, createEventDto);

            expect(result).toEqual(mockEvent);
            expect(sessionRepository.findBySessionId).toHaveBeenCalledWith(sessionId);
            expect(eventRepository.createEvent).toHaveBeenCalledWith(sessionId, createEventDto);
        });

        it('should throw NotFoundException when session does not exist', async () => {
            const sessionId = 'non-existent-session';
            const createEventDto = {
                eventId: 'event-001',
                type: EventType.USER_SPEECH,
                payload: { text: 'Hello' },
            };

            mockSessionRepository.findBySessionId.mockResolvedValue(null);

            await expect(service.addEvent(sessionId, createEventDto)).rejects.toThrow(
                NotFoundException,
            );
            expect(sessionRepository.findBySessionId).toHaveBeenCalledWith(sessionId);
            expect(eventRepository.createEvent).not.toHaveBeenCalled();
        });
    });

    describe('getSessionWithEvents', () => {
        it('should return session with paginated events', async () => {
            const sessionId = 'session-123';
            const offset = 0;
            const limit = 10;

            const mockSession = {
                sessionId,
                status: SessionStatus.ACTIVE,
                language: 'en',
                startedAt: new Date(),
                endedAt: null,
                metadata: {},
            };

            const mockEvents = [
                {
                    eventId: 'event-001',
                    sessionId,
                    type: EventType.USER_SPEECH,
                    payload: { text: 'Hello' },
                    timestamp: new Date(),
                },
            ];

            mockSessionRepository.findBySessionId.mockResolvedValue(mockSession);
            mockEventRepository.findBySessionId.mockResolvedValue({
                events: mockEvents,
                total: 1,
            });

            const result = await service.getSessionWithEvents(sessionId, offset, limit);

            expect(result.session).toEqual(mockSession);
            expect(result.events).toEqual(mockEvents);
            expect(result.pagination).toEqual({
                offset,
                limit,
                total: 1,
                hasMore: false,
            });
        });

        it('should throw NotFoundException when session does not exist', async () => {
            const sessionId = 'non-existent-session';

            mockSessionRepository.findBySessionId.mockResolvedValue(null);

            await expect(service.getSessionWithEvents(sessionId)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should indicate hasMore when there are more events', async () => {
            const sessionId = 'session-123';
            const offset = 0;
            const limit = 10;

            const mockSession = {
                sessionId,
                status: SessionStatus.ACTIVE,
                language: 'en',
                startedAt: new Date(),
                endedAt: null,
                metadata: {},
            };

            mockSessionRepository.findBySessionId.mockResolvedValue(mockSession);
            mockEventRepository.findBySessionId.mockResolvedValue({
                events: [],
                total: 25,
            });

            const result = await service.getSessionWithEvents(sessionId, offset, limit);

            expect(result.pagination.hasMore).toBe(true);
        });
    });

    describe('completeSession', () => {
        it('should complete an existing session', async () => {
            const sessionId = 'session-123';
            const completedSession = {
                sessionId,
                status: SessionStatus.COMPLETED,
                language: 'en',
                startedAt: new Date('2024-01-01'),
                endedAt: new Date(),
                metadata: {},
            };

            mockSessionRepository.completeSession.mockResolvedValue(completedSession);

            const result = await service.completeSession(sessionId);

            expect(result).toEqual(completedSession);
            expect(result.status).toBe(SessionStatus.COMPLETED);
            expect(result.endedAt).toBeDefined();
        });

        it('should throw NotFoundException when session does not exist', async () => {
            const sessionId = 'non-existent-session';

            mockSessionRepository.completeSession.mockResolvedValue(null);

            await expect(service.completeSession(sessionId)).rejects.toThrow(NotFoundException);
        });
    });
});
