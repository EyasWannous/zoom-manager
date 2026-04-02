export interface ZoomCreateMeetingRequest {
    topic: string;
    type: number; // 1=Instant, 2=Scheduled, 3=Recurring, 8=RecurringFixed
    start_time: string; // "yyyy-MM-ddTHH:mm:ss" in the meeting's timezone
    duration: number; // minutes
    timezone: string;
    agenda?: string;
    password?: string; // max 10 chars
    settings?: {
        waiting_room?: boolean;
        join_before_host?: boolean;
        mute_upon_entry?: boolean;
        auto_recording?: 'none' | 'local' | 'cloud';
    };
}
