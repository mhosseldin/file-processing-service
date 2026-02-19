import fsp from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "timers/promises";
import config from "../config/config.js";
import logger from "../logging/logger.js";
import { EventEmitter } from "node:events";

const DEBOUNCE_MS = 250;
const STABILITY_INTERVAL_MS = 120;
const STABILITY_ROUNDS = 3;

async function safeStat(filepath) {
  try {
    return await fsp.stat(filepath);
  } catch {
    return null;
  }
}

async function waitUntilStable(filePath) {
  let stableCount = 0;
  let lastSize = -1;

  while (stableCount < STABILITY_ROUNDS) {
    await delay(STABILITY_INTERVAL_MS);

    const stats = await safeStat(filePath);
    if (!stats) return false;

    if (stats.size === lastSize) {
      stableCount++;
    } else {
      stableCount = 0;
      lastSize = stats.size;
    }
  }

  return true;
}

async function createWatcher() {
  const emitter = new EventEmitter();
  const controller = new AbortController();
  const debounceTimers = new Map();

  const watcher = fsp.watch(config.inputDir, {
    signal: controller.signal,
  });

  (async () => {
    try {
      for await (const { eventType, filename } of watcher) {
        if (!filename) continue;

        if (!["rename", "change"].includes(eventType)) continue;

        if (filename.endsWith(".tmp")) continue;

        const fullPath = path.join(config.inputDir, filename);

        clearTimeout(debounceTimers.get(filename));

        const timer = setTimeout(() => {
          (async () => {
            try {
              debounceTimers.delete(filename);

              const stable = await waitUntilStable(fullPath);
              if (!stable) return;

              emitter.emit("file:ready", fullPath);
            } catch (err) {
              logger.error("Watcher error", { error: err.message });
            }
          })();
        }, DEBOUNCE_MS);

        debounceTimers.set(filename, timer);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        logger.error("Watcher crashed", { error: err.message });
      }
    }
  })();

  return Object.assign(emitter, {
    stop() {
      controller.abort();

      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }

      debounceTimers.clear();
      logger.info("Watcher stopped");
    },
  });
}

export default createWatcher;
