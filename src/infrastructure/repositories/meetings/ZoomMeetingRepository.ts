import { injectable, inject } from 'tsyringe';
import {
    IMeetingRepository,
    CreateMeetingInput,
    Meeting,
    MeetingType,
    MeetingStatus,
    MeetingNotFoundError,
    PaginatedMeetings,
} from '@domain/meetings';
import { ZoomHttpClient } from '@infrastructure/http/zoom/ZoomHttpClient';
import { ZoomMeetingResponse } from '@infrastructure/http/zoom/ZoomMeetingResponse';
import { ZOOM_OPTIONS_TOKEN } from '@infrastructure/config/IZoomOptions';
import { IZoomOptions } from '@infrastructure/config/IZoomOptions';
import { IMemoryCache, MEMORY_CACHE_TOKEN } from '@domain/common/interfaces/IMemoryCache';

const MEETINGS_CACHE_PREFIX = 'meetings_';

@injectable()
export class ZoomMeetingRepository implements IMeetingRepository {
    constructor(
        private readonly zoomClient: ZoomHttpClient,
        @inject(ZOOM_OPTIONS_TOKEN) private readonly options: IZoomOptions,
        @inject(MEMORY_CACHE_TOKEN) private readonly cache: IMemoryCache,
    ) {}

    async getAll(userId: string, nextPageToken?: string): Promise<PaginatedMeetings> {
        const key = `${MEETINGS_CACHE_PREFIX}${userId}_${nextPageToken || 'pg1'}`;

        return this.cache.getOrCreateAsync<PaginatedMeetings>(
            key,
            async () => {
                const response = await this.zoomClient.listMeetings(userId, nextPageToken);
                return {
                    items: response.meetings.map(this.toDomain),
                    nextPageToken: response.next_page_token,
                    totalRecords: response.total_records,
                };
            },
            10,
        );
    }

    async getById(meetingId: string): Promise<Meeting | null> {
        const raw = await this.zoomClient.getMeeting(meetingId);
        if (!raw) return null;
        return this.toDomain(raw);
    }

    async create(input: CreateMeetingInput): Promise<Meeting> {
        const safeType = [3, 8].includes(input.type) ? 2 : input.type;

        const request = {
            topic: input.topic,
            type: safeType,
            start_time: this.toZoomDateString(input.startTime),
            duration: input.durationMinutes,
            timezone: input.timezone,
            agenda: input.agenda,
            password: input.password,
            settings: input.settings
                ? {
                      waiting_room: input.settings.waitingRoom ?? false,
                      join_before_host: input.settings.joinBeforeHost ?? false,
                      mute_upon_entry: input.settings.muteUponEntry ?? false,
                      auto_recording: input.settings.autoRecording ?? 'none',
                  }
                : undefined,
        };

        const raw = await this.zoomClient.createMeeting(this.options.targetUserId, request);

        this.cache.deletePrefix(`${MEETINGS_CACHE_PREFIX}${this.options.targetUserId}`);

        return this.toDomain(raw);
    }

    async delete(meetingId: string): Promise<void> {
        const existing = await this.getById(meetingId);
        if (!existing) {
            throw new MeetingNotFoundError(meetingId);
        }
        await this.zoomClient.deleteMeeting(meetingId);

        this.cache.deletePrefix(`${MEETINGS_CACHE_PREFIX}${this.options.targetUserId}`);
    }

    private readonly toDomain = (raw: ZoomMeetingResponse): Meeting => ({
        id: String(raw.id),
        topic: raw.topic || 'Zoom Meeting',
        type: this.toMeetingType(raw.type),
        startTime: raw.start_time
            ? new Date(raw.start_time)
            : raw.created_at
              ? new Date(raw.created_at)
              : new Date(),
        durationMinutes: raw.duration || 0,
        timezone: raw.timezone || 'UTC',
        joinUrl: raw.join_url || '',
        status: this.toMeetingStatus(raw.status),
        createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
    });

    private toMeetingType(rawType: number): MeetingType {
        const map: Record<number, MeetingType> = {
            1: MeetingType.Instant,
            2: MeetingType.Scheduled,
            3: MeetingType.Recurring,
            8: MeetingType.RecurringFixed,
        };

        return map[rawType] ?? MeetingType.Scheduled;
    }

    private toMeetingStatus(rawStatus: string): MeetingStatus {
        if (!rawStatus) return MeetingStatus.Waiting;

        const status = rawStatus.toLowerCase();
        const map: Record<string, MeetingStatus> = {
            waiting: MeetingStatus.Waiting,
            started: MeetingStatus.Started,
            finished: MeetingStatus.Finished,
        };

        return map[status] ?? MeetingStatus.Waiting;
    }

    private toZoomDateString(date: Date): string {
        return date.toISOString().replace('Z', '').split('.')[0]!;
    }
}
