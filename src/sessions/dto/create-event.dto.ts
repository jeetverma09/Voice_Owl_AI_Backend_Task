import { IsString, IsEnum, IsObject } from 'class-validator';
import { EventType } from '../schemas/conversation-event.schema';

export class CreateEventDto {
    @IsString()
    eventId: string;

    @IsEnum(EventType)
    type: EventType;

    @IsObject()
    payload: Record<string, any>;
}
