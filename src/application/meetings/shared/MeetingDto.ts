import { Meeting } from '@domain/meetings';

export class MeetingDto {
    readonly id: string;
    readonly topic: string;
    readonly type: number;
    readonly startTime: string; // ISO 8601 string — safe for JSON serialization
    readonly durationMinutes: number;
    readonly timezone: string;
    readonly joinUrl: string;
    readonly status: string;
    readonly createdAt: string;

    private constructor(meeting: Meeting) {
        this.id = meeting.id;
        this.topic = meeting.topic;
        this.type = meeting.type;
        this.startTime = meeting.startTime.toISOString();
        this.durationMinutes = meeting.durationMinutes;
        this.timezone = meeting.timezone;
        this.joinUrl = meeting.joinUrl;
        this.status = meeting.status;
        this.createdAt = meeting.createdAt.toISOString();
    }

    static from(meeting: Meeting): MeetingDto {
        return new MeetingDto(meeting);
    }
}
