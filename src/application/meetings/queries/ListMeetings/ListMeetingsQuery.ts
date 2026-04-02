import { z } from 'zod';

export const ListMeetingsQuerySchema = z.object({
    userId: z.string({ required_error: 'User ID is required.' }).min(1),
    nextPageToken: z.string().optional(),
});

export type ListMeetingsQuery = z.infer<typeof ListMeetingsQuerySchema>;
