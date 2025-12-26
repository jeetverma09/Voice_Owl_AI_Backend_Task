import { IsString, IsEnum, IsOptional, IsObject, IsDateString } from 'class-validator';
import { SessionStatus } from '../schemas/conversation-session.schema';

export class CreateSessionDto {
    @IsString()
    sessionId: string;

    @IsEnum(SessionStatus)
    @IsOptional()
    status?: SessionStatus;

    @IsString()
    language: string;

    @IsDateString()
    @IsOptional()
    startedAt?: Date;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
