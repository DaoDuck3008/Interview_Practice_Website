import { Logger } from '@nestjs/common';
import { redactSensitiveLogData } from './log-redaction.util';

interface PausableWorker {
  pause(): Promise<void>;
}

/** Ngừng nhận job mới và dành một khoảng hữu hạn để job đang chạy hoàn tất. */
export async function pauseWorkerForShutdown(
  worker: PausableWorker,
  workerName: string,
  timeoutMs: number,
  logger: Logger,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const paused = worker
    .pause()
    .then(() => true)
    .catch((error: unknown) => {
      logger.error(
        `Không thể pause worker ${workerName}: ${redactSensitiveLogData(
          error instanceof Error ? error.message : String(error),
        )}`,
      );
      return true;
    });
  const timedOut = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });

  const completed = await Promise.race([paused, timedOut]);
  if (timer) clearTimeout(timer);
  if (!completed) {
    logger.warn(
      `Worker ${workerName} vẫn đang drain sau ${timeoutMs}ms; hạ tầng sẽ áp dụng thời hạn shutdown cuối cùng.`,
    );
  }
}
