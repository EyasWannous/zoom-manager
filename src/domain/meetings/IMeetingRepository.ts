import { CreateMeetingInput } from '@domain/meetings/CreateMeetingInput';
import { Meeting } from '@domain/meetings/Meeting';
import { PaginatedMeetings } from '@domain/meetings/PaginatedMeetings';

export const MEETING_REPOSITORY_TOKEN = 'IMeetingRepository';

export interface IMeetingRepository {
    getAll(userId: string, nextPageToken?: string): Promise<PaginatedMeetings>;
    getById(meetingId: string): Promise<Meeting | null>;
    create(input: CreateMeetingInput): Promise<Meeting>;
    delete(meetingId: string): Promise<void>;
}
