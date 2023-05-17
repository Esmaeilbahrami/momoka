import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { runForever } from '../common/helpers';
import { consoleLogWithLensNodeFootprint } from '../common/logger';
import { MomokaValidatorError } from '../data-availability-models/validator-errors';
import { failedProofsPath } from '../input-output/paths';
import { shouldRetry } from '../queue/process-retry-check-da-proofs.queue';

/**
 * Watches for failed submissions written to disk
 */
export const verifierFailedSubmissionsWatcher = async (): Promise<void> => {
  consoleLogWithLensNodeFootprint('started up failed submission watcher...');

  let firstRun = true;
  await runForever(async () => {
    if (firstRun) {
      firstRun = false;
    } else {
      try {
        const failedPath = await failedProofsPath();
        const failedResults = [];
        // Count the number of failed submissions for each error reason
        for (const item in MomokaValidatorError) {
          if (isNaN(Number(item))) {
            if (!shouldRetry(item as MomokaValidatorError)) {
              const errorPath = path.join(failedPath, item);
              const errorCount = existsSync(errorPath)
                ? (await fs.readdir(path.join(failedPath, item))).length
                : 0;

              failedResults.push([item, errorCount]);
            }
          }
        }
        console.table(failedResults);
      } catch (error) {
        consoleLogWithLensNodeFootprint(
          'verifier failed watcher failed try again in 5 seconds',
          error
        );
      }
    }
  }, 60000);
};
