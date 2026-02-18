import fsp from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "timers/promises";
import config from "../config/config.js";

const DEBOUNCE_MS = 250;
const STABILITY_INTERVAL_MS = 120;
const STABILITY_ROUNDS = 3;

const debounceTimers = new Map();

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
  const watcher = fsp.watch(config.inputDir);

  for await (const { eventType, filename } of watcher) {
    if (!filename) continue;

    const fullPath = path.join(config.inputDir, filename);

    clearTimeout(debounceTimers.get(filename));

    const timer = setTimeout(async () => {
      debounceTimers.delete(filename);

      const stable = await waitUntilStable(fullPath);
      if (!stable) return;

      console.log("File ready:", fullPath);
    }, DEBOUNCE_MS);

    debounceTimers.set(filename, timer);
  }
}

export default createWatcher;
