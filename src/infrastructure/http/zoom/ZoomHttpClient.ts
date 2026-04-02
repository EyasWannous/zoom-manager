import axios, { AxiosInstance, AxiosError } from 'axios';
import { injectable, inject } from 'tsyringe';
import { ZOOM_OPTIONS_TOKEN } from '@infrastructure/config/IZoomOptions';
import { IZoomOptions } from '@infrastructure/config/IZoomOptions';
import { TokenCache } from '@infrastructure/http/zoom/TokenCache';
import { ZoomMeetingResponse } from '@infrastructure/http/zoom/ZoomMeetingResponse';
import { ZoomListMeetingsResponse } from '@infrastructure/http/zoom/ZoomListMeetingsResponse';
import { ZoomCreateMeetingRequest } from '@infrastructure/http/zoom/ZoomCreateMeetingRequest';
import { ILogger, I_LOGGER_TOKEN } from '@domain/common/interfaces/ILogger';

@injectable()
export class ZoomHttpClient {
    private readonly http: AxiosInstance;
    private tokenCache: TokenCache | null = null;

    constructor(
        @inject(ZOOM_OPTIONS_TOKEN) private readonly options: IZoomOptions,
        @inject(I_LOGGER_TOKEN) private readonly logger: ILogger,
    ) {
        this.http = axios.create({
            baseURL: options.baseUrl,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    private async getAccessToken(): Promise<string> {
        const now = new Date();

        if (this.tokenCache && this.tokenCache.expiresAt > now) {
            this.logger.debug('Using cached Zoom access token');
            return this.tokenCache.accessToken;
        }

        this.logger.debug('Cache miss: Requesting new Zoom access token');

        const credentials = Buffer.from(
            `${this.options.clientId}:${this.options.clientSecret}`,
        ).toString('base64');

        const response = await axios.post<{ access_token: string; expires_in: number }>(
            this.options.oAuthUrl,
            new URLSearchParams({
                grant_type: 'account_credentials',
                account_id: this.options.accountId,
            }),
            {
                headers: {
                    Authorization: `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );

        const expiresAt = new Date(now.getTime() + (response.data.expires_in - 60) * 1000);
        this.tokenCache = { accessToken: response.data.access_token, expiresAt };

        return this.tokenCache.accessToken;
    }

    private async authHeaders(): Promise<Record<string, string>> {
        const token = await this.getAccessToken();
        return { Authorization: `Bearer ${token}` };
    }

    async listMeetings(userId: string, nextPageToken?: string): Promise<ZoomListMeetingsResponse> {
        this.logger.info({ userId }, 'Fetching Zoom meetings list');
        const start = Date.now();

        try {
            const headers = await this.authHeaders();

            const params: Record<string, unknown> = { type: 'scheduled', page_size: 100 };
            if (nextPageToken) params['next_page_token'] = nextPageToken;

            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

            const scheduledRes = await this.http.get<ZoomListMeetingsResponse>(
                `/users/${userId}/meetings`,
                { headers, params },
            );

            await delay(300);
            const upcomingRes = await this.http.get<ZoomListMeetingsResponse>(
                `/users/${userId}/meetings`,
                { headers, params: { type: 'upcoming', page_size: 100 } },
            );

            await delay(300);
            const liveRes = await this.http.get<ZoomListMeetingsResponse>(
                `/users/${userId}/meetings`,
                { headers, params: { type: 'live', page_size: 100 } },
            );

            const merged = [
                ...scheduledRes.data.meetings,
                ...upcomingRes.data.meetings,
                ...liveRes.data.meetings.map(m => ({ ...m, status: 'started' })),
            ];

            const unique = Array.from(new Map(merged.map(m => [m.id, m])).values());

            const duration = Date.now() - start;
            this.logger.info(
                {
                    userId,
                    count: unique.length,
                    durationMs: duration,
                    url: `/users/${userId}/meetings`,
                },
                'Successfully retrieved Zoom meetings',
            );

            return {
                meetings: unique,
                total_records: unique.length,
                next_page_token: scheduledRes.data.next_page_token,
            };
        } catch (err) {
            this.logError(err, 'GET', `/users/${userId}/meetings`, start);
            throw err;
        }
    }

    async getMeeting(meetingId: string): Promise<ZoomMeetingResponse | null> {
        const start = Date.now();
        const url = `/meetings/${meetingId}`;

        try {
            const headers = await this.authHeaders();
            const response = await this.http.get<ZoomMeetingResponse>(url, { headers });

            this.logger.info(
                { meetingId, durationMs: Date.now() - start, statusCode: response.status, url },
                'Retrieved Zoom meeting details',
            );

            return response.data;
        } catch (err) {
            if (err instanceof AxiosError && err.response?.status === 404) {
                this.logger.info({ meetingId, url }, 'Zoom meeting not found');
                return null;
            }
            this.logError(err, 'GET', url, start);
            throw err;
        }
    }

    async createMeeting(
        userId: string,
        request: ZoomCreateMeetingRequest,
    ): Promise<ZoomMeetingResponse> {
        const start = Date.now();
        const url = `/users/${userId}/meetings`;

        try {
            const headers = await this.authHeaders();
            const response = await this.http.post<ZoomMeetingResponse>(url, request, { headers });

            this.logger.info(
                {
                    userId,
                    meetingId: response.data.id,
                    durationMs: Date.now() - start,
                    statusCode: response.status,
                    url,
                },
                'Successfully created Zoom meeting',
            );

            return response.data;
        } catch (err) {
            this.logError(err, 'POST', url, start);
            if (err instanceof AxiosError && err.response) {
                throw new Error(
                    `Zoom API Error (Create): ${err.response.data.message || err.message}`,
                );
            }
            throw err;
        }
    }

    async deleteMeeting(meetingId: string): Promise<void> {
        const start = Date.now();
        const url = `/meetings/${meetingId}`;

        try {
            const headers = await this.authHeaders();
            const response = await this.http.delete(url, { headers });

            this.logger.info(
                { meetingId, durationMs: Date.now() - start, statusCode: response.status, url },
                'Successfully deleted Zoom meeting',
            );
        } catch (err) {
            this.logError(err, 'DELETE', url, start);
            if (err instanceof AxiosError && err.response) {
                throw new Error(
                    `Zoom API Error (Delete): ${err.response.data.message || 'Cannot delete this meeting right now.'}`,
                );
            }
            throw err;
        }
    }

    private logError(err: any, method: string, url: string, start: number): void {
        const durationMs = Date.now() - start;
        const statusCode = err instanceof AxiosError ? err.response?.status : undefined;

        this.logger.error(
            { method, url, durationMs, statusCode, err },
            `Zoom API request failed: ${err.message}`,
        );
    }
}
