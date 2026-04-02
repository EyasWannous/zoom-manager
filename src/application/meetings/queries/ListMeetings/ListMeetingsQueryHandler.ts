import { injectable, inject } from 'tsyringe';
import { IMeetingRepository, MEETING_REPOSITORY_TOKEN } from '@domain/meetings';
import { MeetingDto } from '@application/meetings/shared/MeetingDto';
import { ListMeetingsQuery } from '@application/meetings/queries/ListMeetings/ListMeetingsQuery';
import { ILogger, I_LOGGER_TOKEN } from '@domain/common/interfaces/ILogger';

@injectable()
export class ListMeetingsQueryHandler {
    constructor(
        @inject(MEETING_REPOSITORY_TOKEN)
        private readonly meetingRepository: IMeetingRepository,
        @inject(I_LOGGER_TOKEN)
        private readonly logger: ILogger,
    ) {}

    async execute(
        query: ListMeetingsQuery,
    ): Promise<{ items: MeetingDto[]; nextPageToken?: string; totalRecords: number }> {
        this.logger.info({ userId: query.userId }, 'Processing ListMeetingsQuery');

        try {
            const result = await this.meetingRepository.getAll(query.userId, query.nextPageToken);

            const response = {
                items: result.items.map(MeetingDto.from),
                nextPageToken: result.nextPageToken,
                totalRecords: result.totalRecords,
            };

            this.logger.info(
                { userId: query.userId, count: response.items.length },
                'ListMeetingsQuery completed successfully',
            );

            return response;
        } catch (err) {
            this.logger.error({ userId: query.userId, err }, 'ListMeetingsQuery failed');
            throw err;
        }
    }
}
