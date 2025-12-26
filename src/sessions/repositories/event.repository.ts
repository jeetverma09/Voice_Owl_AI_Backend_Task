import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationEvent, ConversationEventDocument } from '../schemas/conversation-event.schema';
import { CreateEventDto } from '../dto/create-event.dto';

@Injectable()
export class EventRepository {
    constructor(
        @InjectModel(ConversationEvent.name)
        private eventModel: Model<ConversationEventDocument>,
    ) { }

    async createEvent(
        sessionId: string,
        createEventDto: CreateEventDto,
    ): Promise<ConversationEventDocument> {
        const event = await this.eventModel
            .findOneAndUpdate(
                {
                    sessionId,
                    eventId: createEventDto.eventId,
                },
                {
                    $setOnInsert: {
                        sessionId,
                        eventId: createEventDto.eventId,
                        type: createEventDto.type,
                        payload: createEventDto.payload,
                        timestamp: new Date(),
                    },
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                },
            )
            .exec();

        return event;
    }

    async findBySessionId(
        sessionId: string,
        offset: number = 0,
        limit: number = 50,
    ): Promise<{ events: ConversationEventDocument[]; total: number }> {
        const [events, total] = await Promise.all([
            this.eventModel
                .find({ sessionId })
                .sort({ timestamp: 1 })
                .skip(offset)
                .limit(limit)
                .exec(),
            this.eventModel.countDocuments({ sessionId }).exec(),
        ]);

        return { events, total };
    }
}
