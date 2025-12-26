import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationSessionDocument = ConversationSession & Document;

export enum SessionStatus {
    INITIATED = 'initiated',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Schema({ timestamps: true })
export class ConversationSession {
    @Prop({ required: true, unique: true })
    sessionId: string;

    @Prop({ required: true, enum: Object.values(SessionStatus), default: SessionStatus.INITIATED })
    status: SessionStatus;

    @Prop({ required: true })
    language: string;

    @Prop({ required: true, default: () => new Date() })
    startedAt: Date;

    @Prop({ type: Date, default: null })
    endedAt: Date | null;

    @Prop({ type: Object, default: {} })
    metadata: Record<string, any>;
}

export const ConversationSessionSchema = SchemaFactory.createForClass(ConversationSession);

ConversationSessionSchema.index({ status: 1 });
ConversationSessionSchema.index({ startedAt: -1 });
