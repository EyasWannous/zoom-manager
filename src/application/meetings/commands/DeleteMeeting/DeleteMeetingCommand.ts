import { z } from 'zod';

export const DeleteMeetingCommandSchema = z.object({
    meetingId: z.string({ required_error: 'Meeting ID is required.' }).min(1),
});

export type DeleteMeetingCommand = z.infer<typeof DeleteMeetingCommandSchema>;
