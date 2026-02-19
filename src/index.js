import config from "./config/config.js";
import logger from "./logging/logger.js";
import createWatcher from "./watcher/watcher.js";
import JobQueue from "./queue/jobQueue.js";
import processFile from "./processing/processFile.js";

async function bootstrap() {
  logger.info("Bootstrapping service...");

  const queue = new JobQueue({
    maxConcurrency: config.maxConcurrency,
    maxSize: 100,
  });

  const watcher = await createWatcher();

  watcher.on("file:ready", (filePath) => {
    const added = queue.add(() => processFile(filePath));

    if (!added) {
      logger.warn("Failed to enqueue job", { file: filePath });
    }
  });

  logger.info("Service started", {
    inputDir: config.inputDir,
    outputDir: config.outputDir,
    maxConcurrency: config.maxConcurrency,
  });

  process.on("SIGINT", () => {
    logger.info("Shutting down...");
    watcher.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("Shutting down...");
    watcher.stop();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  logger.error("Fatal error during bootstrap", {
    error: err?.message || String(err),
  });
  process.exit(1);
});
