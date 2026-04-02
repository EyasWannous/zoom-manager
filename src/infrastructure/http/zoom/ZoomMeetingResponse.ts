export interface ZoomMeetingResponse {
    id: number;
    topic: string;
    type: number;
    start_time: string; // ISO 8601 string from Zoom
    duration: number;
    timezone: string;
    join_url: string;
    status: string;
    created_at: string;
    agenda?: string;
}
