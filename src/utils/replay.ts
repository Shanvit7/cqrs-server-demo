// INFRASTRUCTURE
import { eventReplayService } from '@/infrastructure/utils/event-replay';
// LOGGER
import logger from '@/utils/logger';

const main = async () => {
  const args = process.argv.slice(2);
  const aggregateId = args[0];

  try {
    if (aggregateId) {
      logger.info(`Replaying events for aggregate: ${aggregateId}`);
      await eventReplayService.replayAggregate(aggregateId);
      logger.info('Replay completed successfully');
    } else {
      logger.info('Replaying all events...');
      const result = await eventReplayService.replayEvents();
      logger.info(`Replay completed: ${result.processed} processed, ${result.errors} errors`);
    }
  } catch (error) {
    logger.error('Replay failed', error);
    process.exit(1);
  }
};

main();
