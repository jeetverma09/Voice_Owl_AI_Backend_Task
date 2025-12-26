import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsController } from './controllers/sessions.controller';
import { SessionsService } from './services/sessions.service';
import { SessionRepository } from './repositories/session.repository';
import { EventRepository } from './repositories/event.repository';
import { ConversationSession, ConversationSessionSchema } from './schemas/conversation-session.schema';
import { ConversationEvent, ConversationEventSchema } from './schemas/conversation-event.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ConversationSession.name, schema: ConversationSessionSchema },
            { name: ConversationEvent.name, schema: ConversationEventSchema },
        ]),
    ],
    controllers: [SessionsController],
    providers: [SessionsService, SessionRepository, EventRepository],
    exports: [SessionsService],
})
export class SessionsModule { }
