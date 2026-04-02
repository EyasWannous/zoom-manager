import 'reflect-metadata';
import * as dotenv from 'dotenv';

dotenv.config();

import express, { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';
import { bootstrapContainer } from './container/bootstrapContainer';
import { registerRoutes } from './presentation/routes/registerRoutes';
import { ExceptionHandlingMiddleware } from './presentation/middleware/ExceptionHandlingMiddleware';
import { container } from 'tsyringe';
import { ILogger, I_LOGGER_TOKEN } from '@domain/common/interfaces/ILogger';

async function main(): Promise<void> {
    bootstrapContainer();

    const logger = container.resolve<ILogger>(I_LOGGER_TOKEN);

    const app: Application = express();

    app.use(express.json());

    app.use(express.static('public'));

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    registerRoutes(app);

    app.use(ExceptionHandlingMiddleware);

    const port = process.env.PORT ?? 3000;
    const env = process.env.NODE_ENV ?? 'development';

    app.listen(port, () => {
        logger.info({ port, env }, '🚀 Zoom Meeting Manager started');
        logger.info(`   Health check: http://localhost:${port}/health`);
    });
}

main().catch(err => {
    console.error('Fatal error during startup:', err);
    process.exit(1);
});
