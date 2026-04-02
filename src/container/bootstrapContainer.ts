import { container } from 'tsyringe';
import { ZoomOptions } from '@infrastructure/config/ZoomOptions';
import { ZOOM_OPTIONS_TOKEN } from '@infrastructure/config/IZoomOptions';
import { ZoomHttpClient } from '@infrastructure/http/zoom/ZoomHttpClient';
import { ZoomMeetingRepository } from '@infrastructure/repositories/meetings/ZoomMeetingRepository';
import { MEETING_REPOSITORY_TOKEN } from '@domain/meetings';
import { ListMeetingsQueryHandler } from '@application/meetings/queries/ListMeetings/ListMeetingsQueryHandler';
import { CreateMeetingCommandHandler } from '@application/meetings/commands/CreateMeeting/CreateMeetingCommandHandler';
import { DeleteMeetingCommandHandler } from '@application/meetings/commands/DeleteMeeting/DeleteMeetingCommandHandler';
import { MeetingController } from '@presentation/controllers/MeetingController';
import { IMemoryCache, MEMORY_CACHE_TOKEN } from '@domain/common/interfaces/IMemoryCache';
import { NodeMemoryCache } from '@infrastructure/cache/NodeMemoryCache';
import { MeetingAppService } from '@application/meetings/MeetingAppService';
import { I_LOGGER_TOKEN } from '@domain/common/interfaces/ILogger';
import { logger } from '@infrastructure/logging/Logger';

export function bootstrapContainer(): void {
    container.registerInstance(I_LOGGER_TOKEN, logger);

    const zoomOptions = ZoomOptions.fromEnv();
    container.registerInstance(ZOOM_OPTIONS_TOKEN, zoomOptions);

    container.registerSingleton(ZoomHttpClient);

    container.registerSingleton<IMemoryCache>(MEMORY_CACHE_TOKEN, NodeMemoryCache);

    container.register(MEETING_REPOSITORY_TOKEN, { useClass: ZoomMeetingRepository });

    container.register(ListMeetingsQueryHandler, { useClass: ListMeetingsQueryHandler });
    container.register(CreateMeetingCommandHandler, { useClass: CreateMeetingCommandHandler });
    container.register(DeleteMeetingCommandHandler, { useClass: DeleteMeetingCommandHandler });

    container.register(MeetingAppService, { useClass: MeetingAppService });

    container.register(MeetingController, { useClass: MeetingController });

    logger.info('[DI] Container bootstrapped successfully.');
}
