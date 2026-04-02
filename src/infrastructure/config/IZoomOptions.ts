export const ZOOM_OPTIONS_TOKEN = 'IZoomOptions';

export interface IZoomOptions {
    readonly accountId: string;
    readonly clientId: string;
    readonly clientSecret: string;
    readonly targetUserId: string;
    readonly baseUrl: string;
    readonly oAuthUrl: string;
}
