import pino from 'pino';
import { ILogger } from '@domain/common/interfaces/ILogger';

const isDevelopment = process.env.NODE_ENV === 'development';

const pinoInstance = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: isDevelopment
        ? {
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
              },
          }
        : undefined,
});

export class Logger implements ILogger {
    constructor(private readonly logger: pino.Logger = pinoInstance) {}

    info(msg: string): void;
    info(obj: object, msg?: string): void;
    info(objOrMsg: any, msg?: string): void {
        if (typeof objOrMsg === 'string') {
            this.logger.info(objOrMsg);
        } else {
            this.logger.info(objOrMsg, msg);
        }
    }

    error(msg: string): void;
    error(obj: object, msg?: string): void;
    error(objOrMsg: any, msg?: string): void {
        if (typeof objOrMsg === 'string') {
            this.logger.error(objOrMsg);
        } else {
            this.logger.error(objOrMsg, msg);
        }
    }

    debug(msg: string): void;
    debug(obj: object, msg?: string): void;
    debug(objOrMsg: any, msg?: string): void {
        if (typeof objOrMsg === 'string') {
            this.logger.debug(objOrMsg);
        } else {
            this.logger.debug(objOrMsg, msg);
        }
    }

    warn(msg: string): void;
    warn(obj: object, msg?: string): void;
    warn(objOrMsg: any, msg?: string): void {
        if (typeof objOrMsg === 'string') {
            this.logger.warn(objOrMsg);
        } else {
            this.logger.warn(objOrMsg, msg);
        }
    }

    child(bindings: object): ILogger {
        return new Logger(this.logger.child(bindings));
    }
}

export const logger = new Logger();
