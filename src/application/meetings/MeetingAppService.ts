import { injectable, inject } from 'tsyringe';
import { ListMeetingsQueryHandler } from '@application/meetings/queries/ListMeetings/ListMeetingsQueryHandler';
import { CreateMeetingCommandHandler } from '@application/meetings/commands/CreateMeeting/CreateMeetingCommandHandler';
import { DeleteMeetingCommandHandler } from '@application/meetings/commands/DeleteMeeting/DeleteMeetingCommandHandler';
import { CreateMeetingCommand } from '@application/meetings/commands/CreateMeeting/CreateMeetingCommand';
import { ZOOM_OPTIONS_TOKEN } from '@infrastructure/config/IZoomOptions';
import { IZoomOptions } from '@infrastructure/config/IZoomOptions';
import { MeetingDto } from '@application/meetings/shared/MeetingDto';

@injectable()
export class MeetingAppService {
    constructor(
        private readonly listMeetingsHandler: ListMeetingsQueryHandler,
        private readonly createMeetingHandler: CreateMeetingCommandHandler,
        private readonly deleteMeetingHandler: DeleteMeetingCommandHandler,
        @inject(ZOOM_OPTIONS_TOKEN) private readonly options: IZoomOptions,
    ) {}

    async getAll(
        userId?: string,
        nextPageToken?: string,
    ): Promise<{ items: MeetingDto[]; nextPageToken?: string; totalRecords: number }> {
        const currentUserId = userId ?? this.options.targetUserId;
        return await this.listMeetingsHandler.execute({ userId: currentUserId, nextPageToken });
    }

    async create(command: CreateMeetingCommand): Promise<MeetingDto> {
        return await this.createMeetingHandler.execute(command);
    }

    async delete(meetingId: string): Promise<void> {
        return await this.deleteMeetingHandler.execute({ meetingId });
    }
}
