import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';
import { EventRepository } from '../repositories/event.repository';
import { CreateSessionDto } from '../dto/create-session.dto';
import { CreateEventDto } from '../dto/create-event.dto';
import { ConversationSessionDocument } from '../schemas/conversation-session.schema';
import { ConversationEventDocument } from '../schemas/conversation-event.schema';

@Injectable()
export class SessionsService {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly eventRepository: EventRepository,
    ) { }

    async createOrGetSession(createSessionDto: CreateSessionDto): Promise<ConversationSessionDocument> {
        return this.sessionRepository.createOrGet(createSessionDto);
    }

    async addEvent(
        sessionId: string,
        createEventDto: CreateEventDto,
    ): Promise<ConversationEventDocument> {
        const session = await this.sessionRepository.findBySessionId(sessionId);
        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        return this.eventRepository.createEvent(sessionId, createEventDto);
    }

    async getSessionWithEvents(
        sessionId: string,
        offset: number = 0,
        limit: number = 50,
    ): Promise<{
        session: ConversationSessionDocument;
        events: ConversationEventDocument[];
        pagination: {
            offset: number;
            limit: number;
            total: number;
            hasMore: boolean;
        };
    }> {
        const session = await this.sessionRepository.findBySessionId(sessionId);
        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        const { events, total } = await this.eventRepository.findBySessionId(sessionId, offset, limit);

        return {
            session,
            events,
            pagination: {
                offset,
                limit,
                total,
                hasMore: offset + limit < total,
            },
        };
    }

    async completeSession(sessionId: string): Promise<ConversationSessionDocument> {
        const session = await this.sessionRepository.completeSession(sessionId);
        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }
        return session;
    }
}
