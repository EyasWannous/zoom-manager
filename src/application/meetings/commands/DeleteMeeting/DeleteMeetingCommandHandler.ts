import { injectable, inject } from 'tsyringe';
import { IMeetingRepository, MEETING_REPOSITORY_TOKEN } from '@domain/meetings';
import { DeleteMeetingCommand } from '@application/meetings/commands/DeleteMeeting/DeleteMeetingCommand';
import { ILogger, I_LOGGER_TOKEN } from '@domain/common/interfaces/ILogger';

@injectable()
export class DeleteMeetingCommandHandler {
    constructor(
        @inject(MEETING_REPOSITORY_TOKEN)
        private readonly meetingRepository: IMeetingRepository,
        @inject(I_LOGGER_TOKEN)
        private readonly logger: ILogger,
    ) {}

    async execute(command: DeleteMeetingCommand): Promise<void> {
        this.logger.info({ meetingId: command.meetingId }, 'Processing DeleteMeetingCommand');

        try {
            await this.meetingRepository.delete(command.meetingId);
            this.logger.info(
                { meetingId: command.meetingId },
                'DeleteMeetingCommand completed successfully',
            );
        } catch (err) {
            this.logger.error({ meetingId: command.meetingId, err }, 'DeleteMeetingCommand failed');
            throw err;
        }
    }
}
