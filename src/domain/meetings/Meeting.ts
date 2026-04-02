import { MeetingStatus } from '@domain/meetings/MeetingStatus';
import { MeetingType } from '@domain/meetings/MeetingType';

export interface Meeting {
    readonly id: string;
    readonly topic: string;
    readonly type: MeetingType;
    readonly startTime: Date;
    readonly durationMinutes: number;
    readonly timezone: string;
    readonly joinUrl: string;
    readonly status: MeetingStatus;
    readonly createdAt: Date;
}
