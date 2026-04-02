import { Application } from 'express';
import { meetingRouter } from '@presentation/routes/meetingRoutes';

export function registerRoutes(app: Application): void {
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.use('/api/meetings', meetingRouter);
}
