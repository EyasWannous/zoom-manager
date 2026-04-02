import { z } from 'zod';
import { MeetingType } from '@domain/meetings';

const MeetingTypeEnum = z.nativeEnum(MeetingType);

export const CreateMeetingCommandSchema = z.object({
    topic: z
        .string({ required_error: 'Topic is required.' })
        .min(1, 'Topic cannot be empty.')
        .max(200, 'Topic cannot exceed 200 characters.'),

    startTime: z
        .string({ required_error: 'Start time is required.' })
        .datetime({ message: 'Start time must be a valid ISO 8601 datetime string.' }),

    durationMinutes: z
        .number({ required_error: 'Duration is required.' })
        .int('Duration must be a whole number of minutes.')
        .min(15, 'Duration must be at least 15 minutes.')
        .max(1440, 'Duration cannot exceed 1440 minutes (24 hours).'),

    timezone: z
        .string({ required_error: 'Timezone is required.' })
        .min(1, 'Timezone cannot be empty.')
        .default('UTC'),

    type: MeetingTypeEnum.optional().default(MeetingType.Scheduled),

    agenda: z.string().max(2000).optional(),

    password: z.string().max(10).optional(),

    settings: z
        .object({
            waitingRoom: z.boolean().optional().default(false),

            joinBeforeHost: z.boolean().optional().default(false),

            muteUponEntry: z.boolean().optional().default(false),

            autoRecording: z.enum(['none', 'local', 'cloud']).optional().default('none'),
        })
        .optional(),
});

export type CreateMeetingCommand = z.infer<typeof CreateMeetingCommandSchema>;
