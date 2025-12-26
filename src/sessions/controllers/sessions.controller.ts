import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    ValidationPipe,
} from '@nestjs/common';
import { SessionsService } from '../services/sessions.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { CreateEventDto } from '../dto/create-event.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

@Controller('sessions')
export class SessionsController {
    constructor(private readonly sessionsService: SessionsService) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    async createOrGetSession(@Body(ValidationPipe) createSessionDto: CreateSessionDto) {
        return this.sessionsService.createOrGetSession(createSessionDto);
    }

    @Post(':sessionId/events')
    @HttpCode(HttpStatus.CREATED)
    async addEvent(
        @Param('sessionId') sessionId: string,
        @Body(ValidationPipe) createEventDto: CreateEventDto,
    ) {
        return this.sessionsService.addEvent(sessionId, createEventDto);
    }

    @Get(':sessionId')
    async getSession(
        @Param('sessionId') sessionId: string,
        @Query(ValidationPipe) paginationQuery: PaginationQueryDto,
    ) {
        return this.sessionsService.getSessionWithEvents(
            sessionId,
            paginationQuery.offset,
            paginationQuery.limit,
        );
    }

    @Post(':sessionId/complete')
    @HttpCode(HttpStatus.OK)
    async completeSession(@Param('sessionId') sessionId: string) {
        return this.sessionsService.completeSession(sessionId);
    }
}
