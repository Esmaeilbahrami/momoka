import { promises as fs } from 'fs';
import path from 'path';
import { ClaimableValidatorError } from '../data-availability-models/claimable-validator-errors';
import { Queue } from './base.queue';
import { failedDAProofQueue } from './known.queue';

export interface ProcessFailedProofQueueRequest {
  txId: string;
  reason: ClaimableValidatorError;
  submitter: string;
}

/**
 * Processes the failed proofs queue to save them on disk
 * @param failedQueue - The failed proofs queue
 */
export const processFailedDAProofQueue = async (
  failedQueue: Queue<ProcessFailedProofQueueRequest>
): Promise<void> => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!failedQueue.isEmpty()) {
      const failed = failedQueue.dequeue();
      if (failed) {
        try {
          await fs.writeFile(
            path.join(process.cwd(), 'lens__da', 'failed-proofs', failed.txId + '.json'),
            JSON.stringify(failed)
          );
        } catch (e) {
          console.error(
            'Error writing the disk for failed publication.. make sure you have enough disk space'
          );

          // add back in the queue in 30 seconds for retry
          failedDAProofQueue.enqueueWithDelay(failed, 30000);
        }
      }
    } else {
      // Wait for a short period before checking the queue again
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
};
