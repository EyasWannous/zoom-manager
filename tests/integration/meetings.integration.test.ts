import 'reflect-metadata';
import request from 'supertest';
import express, { Application } from 'express';
import { container } from 'tsyringe';
import {
    MEETING_REPOSITORY_TOKEN,
    IMeetingRepository,
} from '../../src/domain/meetings/IMeetingRepository';
import { Meeting } from '../../src/domain/meetings/Meeting';
import { MeetingType } from '../../src/domain/meetings/MeetingType';
import { MeetingStatus } from '../../src/domain/meetings/MeetingStatus';
import { MeetingNotFoundError } from '../../src/domain/meetings/MeetingErrors';
import { ILogger } from '../../src/domain/common/interfaces/ILogger';
import { ZOOM_OPTIONS_TOKEN } from '../../src/infrastructure/config/IZoomOptions';
import { registerRoutes } from '../../src/presentation/routes/registerRoutes';
import { ExceptionHandlingMiddleware } from '../../src/presentation/middleware/ExceptionHandlingMiddleware';
import { CreateMeetingCommandHandler } from '../../src/application/meetings/commands/CreateMeeting/CreateMeetingCommandHandler';
import { DeleteMeetingCommandHandler } from '../../src/application/meetings/commands/DeleteMeeting/DeleteMeetingCommandHandler';
import { ListMeetingsQueryHandler } from '../../src/application/meetings/queries/ListMeetings/ListMeetingsQueryHandler';
import { MeetingAppService } from '../../src/application/meetings/MeetingAppService';
import { MeetingController } from '../../src/presentation/controllers/MeetingController';

const mockMeeting: Meeting = {
    id: '123',
    topic: 'Test Meeting',
    type: MeetingType.Scheduled,
    startTime: new Date('2024-06-01T10:00:00Z'),
    durationMinutes: 60,
    timezone: 'UTC',
    joinUrl: 'https://zoom.us/j/123',
    status: MeetingStatus.Waiting,
    createdAt: new Date('2024-01-01T00:00:00Z'),
};

function makeMockRepo(): jest.Mocked<IMeetingRepository> {
    return {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
    };
}

function buildTestApp(mockRepository: jest.Mocked<IMeetingRepository>): Application {
    container.reset();

    const mockLogger: jest.Mocked<ILogger> = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        child: jest.fn().mockReturnThis(),
    };

    const mockZoomOptions = { targetUserId: 'me' };

    container.registerInstance('ILogger', mockLogger);
    container.registerInstance(MEETING_REPOSITORY_TOKEN, mockRepository);
    container.registerInstance(ZOOM_OPTIONS_TOKEN, mockZoomOptions);

    container.register(ListMeetingsQueryHandler, { useClass: ListMeetingsQueryHandler });
    container.register(CreateMeetingCommandHandler, { useClass: CreateMeetingCommandHandler });
    container.register(DeleteMeetingCommandHandler, { useClass: DeleteMeetingCommandHandler });
    container.register(MeetingAppService, { useClass: MeetingAppService });
    container.register(MeetingController, { useClass: MeetingController });

    const app = express();
    app.use(express.json());
    registerRoutes(app);
    app.use(ExceptionHandlingMiddleware);

    return app;
}

describe('GET /api/meetings', () => {
    it('returns 200 with paginated meeting list', async () => {
        const repo = makeMockRepo();
        repo.getAll.mockResolvedValue({
            items: [mockMeeting],
            totalRecords: 1,
            nextPageToken: undefined,
        });

        const res = await request(buildTestApp(repo)).get('/api/meetings');

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].id).toBe('123');
        expect(res.body.items[0].topic).toBe('Test Meeting');
        expect(res.body.totalRecords).toBe(1);
    });

    it('returns 200 with empty list when no meetings exist', async () => {
        const repo = makeMockRepo();
        repo.getAll.mockResolvedValue({ items: [], totalRecords: 0, nextPageToken: undefined });

        const res = await request(buildTestApp(repo)).get('/api/meetings');

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(0);
        expect(res.body.totalRecords).toBe(0);
    });

    it('forwards nextPageToken query param to repository', async () => {
        const repo = makeMockRepo();
        repo.getAll.mockResolvedValue({ items: [], totalRecords: 0, nextPageToken: undefined });

        await request(buildTestApp(repo)).get('/api/meetings?nextPageToken=abc123');

        expect(repo.getAll).toHaveBeenCalledWith('me', 'abc123');
    });

    it('returns 500 when repository throws unexpectedly', async () => {
        const repo = makeMockRepo();
        repo.getAll.mockRejectedValue(new Error('Zoom API is down'));

        const res = await request(buildTestApp(repo)).get('/api/meetings');

        expect(res.status).toBe(500);
        expect(res.body.title).toBe('Internal Server Error');
    });
});

describe('POST /api/meetings', () => {
    const validBody = {
        topic: 'Sprint Planning',
        startTime: '2026-06-01T10:00:00.000Z',
        durationMinutes: 60,
        timezone: 'Europe/Bucharest',
    };

    it('returns 201 with created meeting on valid input', async () => {
        const repo = makeMockRepo();
        repo.create.mockResolvedValue({ ...mockMeeting, topic: 'Sprint Planning' });

        const res = await request(buildTestApp(repo)).post('/api/meetings').send(validBody);

        expect(res.status).toBe(201);
        expect(res.body.id).toBe('123');
        expect(res.body.topic).toBe('Sprint Planning');
    });

    it('returns 422 when topic is missing', async () => {
        const repo = makeMockRepo();
        const { topic, ...withoutTopic } = validBody;

        const res = await request(buildTestApp(repo)).post('/api/meetings').send(withoutTopic);

        expect(res.status).toBe(422);
        expect(res.body.title).toBe('Validation Failed');
        expect(res.body.errors).toHaveProperty('topic');
    });

    it('returns 422 when durationMinutes is below minimum', async () => {
        const repo = makeMockRepo();

        const res = await request(buildTestApp(repo))
            .post('/api/meetings')
            .send({ ...validBody, durationMinutes: 5 });

        expect(res.status).toBe(422);
        expect(res.body.errors).toHaveProperty('durationMinutes');
    });

    it('returns 422 when startTime is not a valid ISO datetime', async () => {
        const repo = makeMockRepo();

        const res = await request(buildTestApp(repo))
            .post('/api/meetings')
            .send({ ...validBody, startTime: 'not-a-date' });

        expect(res.status).toBe(422);
        expect(res.body.errors).toHaveProperty('startTime');
    });

    it('returns 422 when body is empty', async () => {
        const repo = makeMockRepo();

        const res = await request(buildTestApp(repo)).post('/api/meetings').send({});

        expect(res.status).toBe(422);
    });

    it('returns 500 when repository throws unexpectedly', async () => {
        const repo = makeMockRepo();
        repo.create.mockRejectedValue(new Error('Unexpected error'));

        const res = await request(buildTestApp(repo)).post('/api/meetings').send(validBody);

        expect(res.status).toBe(500);
    });
});

// ── DELETE /api/meetings/:id ──────────────────────────────────────────────────

describe('DELETE /api/meetings/:id', () => {
    it('returns 204 on successful delete', async () => {
        const repo = makeMockRepo();
        repo.delete.mockResolvedValue(undefined);

        const res = await request(buildTestApp(repo)).delete('/api/meetings/123');

        expect(res.status).toBe(204);
        expect(res.body).toEqual({});
    });

    it('returns 404 when meeting does not exist', async () => {
        const repo = makeMockRepo();
        repo.delete.mockRejectedValue(new MeetingNotFoundError('999'));

        const res = await request(buildTestApp(repo)).delete('/api/meetings/999');

        expect(res.status).toBe(404);
        expect(res.body.title).toBe('Not Found');
        expect(res.body.detail).toContain('999');
    });

    it('returns 500 when repository throws unexpectedly', async () => {
        const repo = makeMockRepo();
        repo.delete.mockRejectedValue(new Error('DB connection lost'));

        const res = await request(buildTestApp(repo)).delete('/api/meetings/123');

        expect(res.status).toBe(500);
    });
});

// ── GET /health ───────────────────────────────────────────────────────────────

describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
        const repo = makeMockRepo();

        const res = await request(buildTestApp(repo)).get('/health');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.timestamp).toBeDefined();
    });
});
