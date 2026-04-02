import { MeetingType } from '@domain/meetings/MeetingType';

export interface CreateMeetingInput {
    topic: string;
    type: MeetingType;
    startTime: Date;
    durationMinutes: number;
    timezone: string;
    agenda?: string;
    password?: string;
    settings?: {
        waitingRoom?: boolean;
        joinBeforeHost?: boolean;
        muteUponEntry?: boolean;
        autoRecording?: 'none' | 'local' | 'cloud';
    };
}
