import { promises as fsp } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "timers/promises";
import config from "../config/config.js";
import logger from "../logging/logger.js";
import safeWriteFileAtomic from "../fs/atomicWrite.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

function isRetryableError(err) {
  if (!err || !err.code) return false;

  const retryableCodes = ["EBUSY", "EMFILE", "EPERM"];
  return retryableCodes.includes(err.code);
}

async function doProcessing(filePath) {
  const content = await fsp.readFile(filePath, "utf8");

  const transformed = content.toUpperCase();

  const outputPath = path.join(config.outputDir, path.basename(filePath));

  await safeWriteFileAtomic(outputPath, transformed);
}

async function processFile(filePath) {
  logger.info("Processing file", { file: filePath });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await doProcessing(filePath);

      logger.info("File processed successfully", { file: filePath });
      return;
    } catch (err) {
      if (!isRetryableError(err) || attempt === MAX_RETRIES) {
        logger.error("Processing failed", {
          file: filePath,
          error: err?.message,
        });
        throw err;
      }

      logger.warn("Retrying processing", {
        file: filePath,
        attempt,
        error: err?.message,
      });

      await delay(RETRY_DELAY_MS);
    }
  }
}

export default processFile;
