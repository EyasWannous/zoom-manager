import { IZoomOptions } from '@infrastructure/config/IZoomOptions';

export class ZoomOptions implements IZoomOptions {
    readonly accountId: string;
    readonly clientId: string;
    readonly clientSecret: string;
    readonly targetUserId: string;
    readonly baseUrl: string;
    readonly oAuthUrl: string;

    private constructor(opts: IZoomOptions) {
        this.accountId = opts.accountId;
        this.clientId = opts.clientId;
        this.clientSecret = opts.clientSecret;
        this.targetUserId = opts.targetUserId;
        this.baseUrl = opts.baseUrl;
        this.oAuthUrl = opts.oAuthUrl;
    }

    static fromEnv(): ZoomOptions {
        const required: Record<string, string | undefined> = {
            ZOOM_ACCOUNT_ID: process.env['ZOOM_ACCOUNT_ID'],
            ZOOM_CLIENT_ID: process.env['ZOOM_CLIENT_ID'],
            ZOOM_CLIENT_SECRET: process.env['ZOOM_CLIENT_SECRET'],
        };

        const missing = Object.entries(required)
            .filter(([, v]) => !v)
            .map(([k]) => k);

        if (missing.length > 0) {
            throw new Error(
                `[ZoomOptions] Missing required environment variables: ${missing.join(', ')}.\n` +
                    `Copy .env.example to .env and fill in your Zoom credentials.`,
            );
        }

        return new ZoomOptions({
            accountId: required['ZOOM_ACCOUNT_ID']!,
            clientId: required['ZOOM_CLIENT_ID']!,
            clientSecret: required['ZOOM_CLIENT_SECRET']!,
            targetUserId: process.env['ZOOM_TARGET_USER_ID'] ?? 'me',
            baseUrl: process.env['ZOOM_BASE_URL'] ?? 'https://api.zoom.us/v2',
            oAuthUrl: process.env['ZOOM_OAUTH_URL'] ?? 'https://zoom.us/oauth/token',
        });
    }
}
