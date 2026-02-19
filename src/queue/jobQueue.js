import logger from "../logging/logger.js";

class JobQueue {
  constructor({ maxConcurrency = 4, maxSize = 100 } = {}) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrency = maxConcurrency;
    this.maxSize = maxSize;
  }

  add(job) {
    if (this.queue.length >= this.maxSize) {
      logger.warn("Queue is full");
      return false;
    }
    this.queue.push(job);

    logger.info("Job added to the queue");
    this.processNext();

    return true;
  }

  processNext() {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    this.running++;

    Promise.resolve()
      .then(() => job())
      .catch((err) => {
        logger.error("Job failed", { error: err?.message || String(err) });
      })
      .finally(() => {
        this.running--;
        this.processNext();
      });
  }
}
export default JobQueue;
