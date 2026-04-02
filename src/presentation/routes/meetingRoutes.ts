import { Router } from 'express';
import { container } from 'tsyringe';
import { MeetingController } from '@presentation/controllers/MeetingController';

export const meetingRouter = Router();

meetingRouter.get('/', (req, res, next) => {
    container.resolve(MeetingController).getAll(req, res, next);
});

meetingRouter.post('/', (req, res, next) => {
    container.resolve(MeetingController).create(req, res, next);
});

meetingRouter.delete('/:id', (req, res, next) => {
    container.resolve(MeetingController).delete(req, res, next);
});
