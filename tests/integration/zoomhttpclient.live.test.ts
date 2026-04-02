import 'reflect-metadata';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

import axios from 'axios';
import { ZoomHttpClient } from '../../src/infrastructure/http/zoom/ZoomHttpClient';
import { ZoomOptions } from '../../src/infrastructure/config/ZoomOptions';
import { ILogger } from '../../src/domain/common/interfaces/ILogger';
import { MeetingType } from '../../src/domain/meetings/MeetingType';

const requiredEnvVars = ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    throw new Error(
        `[Live Test] Missing required env vars: ${missingVars.join(', ')}.\n` +
            `Create a .env.test file in the project root. See .env.example for reference.`,
    );
}

const nullLogger: ILogger = {
    info: () => {},
    debug: () => {},
    warn: () => {},
    error: () => {},
    child: function () {
        return this;
    },
};

function buildClient(): ZoomHttpClient {
    const options = ZoomOptions.fromEnv();
    return new ZoomHttpClient(options, nullLogger);
}

describe('ZoomHttpClient — Live Integration', () => {
    jest.setTimeout(30000);
    let client: ZoomHttpClient;
    const userId = process.env['ZOOM_TARGET_USER_ID'] ?? 'me';

    const createdMeetingIds: string[] = [];

    beforeEach(() => {
        client = buildClient();
    });

    afterEach(async () => {
        for (const id of createdMeetingIds) {
            try {
                await client.deleteMeeting(String(id));
            } catch {}
        }
        createdMeetingIds.length = 0;
    });

    describe('OAuth token', () => {
        it('fetches a real access token on the first API call', async () => {
            const result = await client.listMeetings(userId);

            expect(result).toBeDefined();
            expect(Array.isArray(result.meetings)).toBe(true);
        });

        it('uses the cached token on a second call without hitting the token endpoint', async () => {
            const postSpy = jest.spyOn(axios, 'post');

            await client.listMeetings(userId);
            expect(postSpy).toHaveBeenCalledTimes(1);

            await client.listMeetings(userId);

            postSpy.mockRestore();
        });
    });

    describe('listMeetings', () => {
        it('returns a valid response shape', async () => {
            const result = await client.listMeetings(userId);

            expect(result).toHaveProperty('meetings');
            expect(result).toHaveProperty('total_records');
            expect(Array.isArray(result.meetings)).toBe(true);
            expect(typeof result.total_records).toBe('number');
        });

        it('each meeting in the list has the expected fields', async () => {
            const result = await client.listMeetings(userId);

            for (const meeting of result.meetings) {
                expect(meeting).toHaveProperty('id');
                expect(meeting).toHaveProperty('topic');
                expect(meeting).toHaveProperty('type');
                expect(meeting).toHaveProperty('start_time');
                expect(meeting).toHaveProperty('duration');
                expect(meeting).toHaveProperty('timezone');
                expect(meeting).toHaveProperty('join_url');
            }
        });

        it('accepts a nextPageToken without throwing', async () => {
            const firstPage = await client.listMeetings(userId);

            if (firstPage.next_page_token) {
                const secondPage = await client.listMeetings(userId, firstPage.next_page_token);
                expect(secondPage).toHaveProperty('meetings');
            } else {
                expect(firstPage.next_page_token).toBeFalsy();
            }
        });
    });

    describe('getMeeting', () => {
        it('returns null for a meeting ID that does not exist', async () => {
            const result = await client.getMeeting('0000000001');

            expect(result).toBeNull();
        });

        it('returns the full meeting object for a real meeting ID', async () => {
            const created = await client.createMeeting(userId, {
                topic: '[Live Test] getMeeting lookup',
                type: MeetingType.Scheduled,
                start_time: futureDateString(60),
                duration: 30,
                timezone: 'UTC',
            });
            createdMeetingIds.push(String(created.id));

            const result = await client.getMeeting(String(created.id));

            expect(result).not.toBeNull();
            expect(result!.id).toBe(created.id);
            expect(result!.topic).toBe('[Live Test] getMeeting lookup');
        });
    });

    describe('createMeeting', () => {
        it('creates a scheduled meeting and returns the Zoom response shape', async () => {
            const result = await client.createMeeting(userId, {
                topic: '[Live Test] createMeeting basic',
                type: MeetingType.Scheduled,
                start_time: futureDateString(60),
                duration: 30,
                timezone: 'UTC',
            });
            createdMeetingIds.push(String(result.id));

            expect(result.id).toBeDefined();
            expect(result.topic).toBe('[Live Test] createMeeting basic');
            expect(result.join_url).toMatch(/zoom\.us\/j\//); // Zoom uses regional subdomains e.g. us05web.zoom.us
            expect(result.duration).toBe(30);
            expect(result.timezone).toBe('UTC');
        });

        it('creates a meeting with an agenda', async () => {
            const result = await client.createMeeting(userId, {
                topic: '[Live Test] createMeeting with agenda',
                type: MeetingType.Scheduled,
                start_time: futureDateString(120),
                duration: 45,
                timezone: 'UTC',
                agenda: 'Test agenda for live integration test',
            });
            createdMeetingIds.push(String(result.id));

            expect(result.agenda).toBe('Test agenda for live integration test');
        });
    });

    describe('deleteMeeting', () => {
        it('deletes a meeting without throwing', async () => {
            const created = await client.createMeeting(userId, {
                topic: '[Live Test] deleteMeeting target',
                type: MeetingType.Scheduled,
                start_time: futureDateString(60),
                duration: 30,
                timezone: 'UTC',
            });

            await expect(client.deleteMeeting(String(created.id))).resolves.not.toThrow();
        });

        it('after deletion getMeeting returns null', async () => {
            const created = await client.createMeeting(userId, {
                topic: '[Live Test] deleteMeeting verify gone',
                type: MeetingType.Scheduled,
                start_time: futureDateString(60),
                duration: 30,
                timezone: 'UTC',
            });

            await client.deleteMeeting(String(created.id));

            const result = await client.getMeeting(String(created.id));
            expect(result).toBeNull();
        });
    });
});

function futureDateString(minutesFromNow: number): string {
    const date = new Date(Date.now() + minutesFromNow * 60 * 1000);
    return date.toISOString().replace('Z', '').split('.')[0]!;
}
