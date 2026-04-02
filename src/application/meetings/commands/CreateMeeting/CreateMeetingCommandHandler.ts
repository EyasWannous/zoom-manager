import { injectable, inject } from 'tsyringe';
import { IMeetingRepository, MEETING_REPOSITORY_TOKEN } from '@domain/meetings';
import { CreateMeetingCommand } from '@application/meetings/commands/CreateMeeting/CreateMeetingCommand';
import { MeetingDto } from '@application/meetings/shared/MeetingDto';
import { ILogger, I_LOGGER_TOKEN } from '@domain/common/interfaces/ILogger';

@injectable()
export class CreateMeetingCommandHandler {
    constructor(
        @inject(MEETING_REPOSITORY_TOKEN)
        private readonly meetingRepository: IMeetingRepository,
        @inject(I_LOGGER_TOKEN)
        private readonly logger: ILogger,
    ) {}

    async execute(command: CreateMeetingCommand): Promise<MeetingDto> {
        this.logger.info({ topic: command.topic }, 'Processing CreateMeetingCommand');

        try {
            const meeting = await this.meetingRepository.create({
                topic: command.topic,
                type: command.type,
                startTime: new Date(command.startTime),
                durationMinutes: command.durationMinutes,
                timezone: command.timezone,
                agenda: command.agenda,
                password: command.password,
                settings: command.settings,
            });

            const dto = MeetingDto.from(meeting);

            this.logger.info(
                { meetingId: dto.id, topic: dto.topic },
                'CreateMeetingCommand completed successfully',
            );

            return dto;
        } catch (err) {
            this.logger.error({ topic: command.topic, err }, 'CreateMeetingCommand failed');
            throw err;
        }
    }
}
