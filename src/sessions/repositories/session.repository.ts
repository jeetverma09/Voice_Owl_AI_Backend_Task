import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationSession, ConversationSessionDocument } from '../schemas/conversation-session.schema';
import { CreateSessionDto } from '../dto/create-session.dto';

@Injectable()
export class SessionRepository {
    constructor(
        @InjectModel(ConversationSession.name)
        private sessionModel: Model<ConversationSessionDocument>,
    ) { }

    async findBySessionId(sessionId: string): Promise<ConversationSessionDocument | null> {
        return this.sessionModel.findOne({ sessionId }).exec();
    }

    async createOrGet(createSessionDto: CreateSessionDto): Promise<ConversationSessionDocument> {
        const session = await this.sessionModel
            .findOneAndUpdate(
                { sessionId: createSessionDto.sessionId },
                {
                    $setOnInsert: {
                        sessionId: createSessionDto.sessionId,
                        status: createSessionDto.status || 'initiated',
                        language: createSessionDto.language,
                        startedAt: createSessionDto.startedAt || new Date(),
                        metadata: createSessionDto.metadata || {},
                        endedAt: null,
                    },
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                },
            )
            .exec();

        return session;
    }

    async completeSession(sessionId: string): Promise<ConversationSessionDocument | null> {
        return this.sessionModel
            .findOneAndUpdate(
                { sessionId },
                {
                    $set: {
                        status: 'completed',
                        endedAt: new Date(),
                    },
                },
                { new: true },
            )
            .exec();
    }
}
