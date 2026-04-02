import { Request, Response, NextFunction } from 'express';
import {
    MeetingNotFoundError,
    MeetingValidationError,
    MeetingConflictError,
    MeetingDomainError,
} from '@domain/meetings';
import { container } from 'tsyringe';
import { ILogger, I_LOGGER_TOKEN } from '@domain/common/interfaces/ILogger';

export function ExceptionHandlingMiddleware(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
): void {
    const logger = container.resolve<ILogger>(I_LOGGER_TOKEN);

    let statusCode = 500;
    let title = 'Internal Server Error';
    let detail =
        process.env['NODE_ENV'] === 'development' ? err.message : 'An unexpected error occurred.';

    if (err instanceof MeetingNotFoundError) {
        statusCode = 404;
        title = 'Not Found';
        detail = err.message;
    } else if (err instanceof MeetingValidationError) {
        statusCode = 422;
        title = 'Validation Failed';
        detail = err.message;
    } else if (err instanceof MeetingConflictError) {
        statusCode = 409;
        title = 'Conflict';
        detail = err.message;
    } else if (err instanceof MeetingDomainError) {
        statusCode = 400;
        title = 'Bad Request';
        detail = err.message;
    }

    logger.error(
        {
            method: req.method,
            path: req.path,
            statusCode,
            err, // Pino's standard key for errors (unwraps stack traces)
        },
        `Request failed: ${err.message}`,
    );

    const responseBody: any = { status: statusCode, title, detail };
    if (err instanceof MeetingValidationError) {
        responseBody.errors = err.errors;
    }

    res.status(statusCode).json(responseBody);
}
