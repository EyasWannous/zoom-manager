import { Request, Response, NextFunction } from 'express';
import { injectable } from 'tsyringe';
import { CreateMeetingCommandSchema } from '@application/meetings/commands/CreateMeeting/CreateMeetingCommand';
import { MeetingAppService } from '@application/meetings/MeetingAppService';

@injectable()
export class MeetingController {
    constructor(private readonly meetingAppService: MeetingAppService) {}

    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.query['userId'] as string;
            const nextPageToken = req.query['nextPageToken'] as string | undefined;
            const result = await this.meetingAppService.getAll(userId, nextPageToken);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const parsed = CreateMeetingCommandSchema.safeParse(req.body);

            if (!parsed.success) {
                res.status(422).json({
                    status: 422,
                    title: 'Validation Failed',
                    errors: parsed.error.flatten().fieldErrors,
                });

                return;
            }

            const meeting = await this.meetingAppService.create(parsed.data);
            res.status(201).json(meeting);
        } catch (err) {
            next(err);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params as { id: string };
            await this.meetingAppService.delete(id);
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    }
}
