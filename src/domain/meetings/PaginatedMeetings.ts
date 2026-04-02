import { Meeting } from '@domain/meetings/Meeting';

export interface PaginatedMeetings {
    items: Meeting[];
    nextPageToken?: string;
    totalRecords: number;
}
