import 'reflect-metadata';
import { IMeetingRepository } from '../../../../src/domain/meetings/IMeetingRepository';
import { Meeting } from '../../../../src/domain/meetings/Meeting';
import { MeetingType } from '../../../../src/domain/meetings/MeetingType';
import { MeetingStatus } from '../../../../src/domain/meetings/MeetingStatus';
import { CreateMeetingCommandHandler } from '../../../../src/application/meetings/commands/CreateMeeting/CreateMeetingCommandHandler';
import { DeleteMeetingCommandHandler } from '../../../../src/application/meetings/commands/DeleteMeeting/DeleteMeetingCommandHandler';
import { ListMeetingsQueryHandler } from '../../../../src/application/meetings/queries/ListMeetings/ListMeetingsQueryHandler';
import { ILogger } from '../../../../src/domain/common/interfaces/ILogger';

describe('Meetings CQRS Handlers', () => {
    let mockRepository: jest.Mocked<IMeetingRepository>;
    let mockLogger: jest.Mocked<ILogger>;

    const mockMeeting: Meeting = {
        id: '123',
        topic: 'Test Meeting',
        type: MeetingType.Scheduled,
        startTime: new Date('2024-01-01T10:00:00Z'),
        durationMinutes: 60,
        timezone: 'UTC',
        joinUrl: 'https://zoom.us/j/123',
        status: MeetingStatus.Waiting,
        createdAt: new Date(),
    };

    beforeEach(() => {
        mockRepository = {
            getAll: jest.fn(),
            getById: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        };

        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            child: jest.fn().mockReturnThis(),
        };
    });

    describe('CreateMeetingCommandHandler', () => {
        it('should create a meeting with minimal fields and return MeetingDto', async () => {
            mockRepository.create.mockResolvedValue(mockMeeting);

            const handler = new CreateMeetingCommandHandler(mockRepository, mockLogger);

            const command = {
                topic: 'Test Meeting',
                startTime: '2024-01-01T10:00:00Z',
                durationMinutes: 60,
                timezone: 'UTC',
                type: MeetingType.Scheduled,
            };

            const result = await handler.execute(command);
            expect(mockRepository.create).toHaveBeenCalledWith({
                topic: command.topic,
                type: MeetingType.Scheduled,
                startTime: new Date(command.startTime),
                durationMinutes: command.durationMinutes,
                timezone: command.timezone,
                agenda: undefined,
                password: undefined,
                settings: undefined,
            });
            expect(result.id).toBe('123');
        });

        it('should create a meeting with password and settings', async () => {
            mockRepository.create.mockResolvedValue(mockMeeting);

            const handler = new CreateMeetingCommandHandler(mockRepository, mockLogger);

            const command = {
                topic: 'Private Meeting',
                startTime: '2024-01-01T10:00:00Z',
                durationMinutes: 30,
                timezone: 'UTC',
                type: MeetingType.Scheduled,
                password: 'abc123',
                settings: {
                    waitingRoom: true,
                    muteUponEntry: true,
                    joinBeforeHost: false,
                    autoRecording: 'none' as const,
                },
            };

            await handler.execute(command);
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    password: 'abc123',
                    settings: expect.objectContaining({ waitingRoom: true, muteUponEntry: true }),
                }),
            );
        });
    });

    describe('DeleteMeetingCommandHandler', () => {
        it('should call delete on repository', async () => {
            mockRepository.delete.mockResolvedValue(undefined);

            const handler = new DeleteMeetingCommandHandler(mockRepository, mockLogger);

            await handler.execute({ meetingId: '123' });
            expect(mockRepository.delete).toHaveBeenCalledWith('123');
        });
    });

    describe('ListMeetingsQueryHandler', () => {
        it('should return a list of MeetingDtos in a paginated object', async () => {
            mockRepository.getAll.mockResolvedValue({
                items: [mockMeeting],
                totalRecords: 1,
                nextPageToken: undefined,
            });

            const handler = new ListMeetingsQueryHandler(mockRepository, mockLogger);

            const result = await handler.execute({ userId: 'me', nextPageToken: undefined });
            expect(mockRepository.getAll).toHaveBeenCalledWith('me', undefined);
            expect(result.items).toHaveLength(1);
            expect(result.items[0]!.id).toBe('123');
            expect(result.totalRecords).toBe(1);
        });
    });
});
