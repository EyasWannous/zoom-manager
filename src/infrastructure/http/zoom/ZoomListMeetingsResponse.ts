import { ZoomMeetingResponse } from '@infrastructure/http/zoom/ZoomMeetingResponse';

export interface ZoomListMeetingsResponse {
    meetings: ZoomMeetingResponse[];
    total_records: number;
    next_page_token?: string;
}
