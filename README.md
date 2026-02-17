# File Processing Service (Node.js)

This is a small **file processing service** project.  
The idea is simple: files are dropped into an input folder, and the service processes them and writes results into an output folder.

I built this project to practice real Node.js filesystem topics (streams, watcher, backpressure) and also try to write code in a “production style” (config, logger, layers, clean structure).

---

## Core Flow (Big Picture)

**Input folder → Detect new file → Queue → Worker pool → Stream processing → Atomic output write**

Or like this:

Watcher  
↓  
Bounded Queue  
↓  
Worker Pool (maxConcurrency = 4)  
↓  
Stream pipeline (with backpressure)  
↓  
Atomic write (tmp → rename)

---

## Why not “just watch and process immediately”?

If a lot of files appear at once (example: 500 / 1000 files), doing `fs.watch → processFile()` can cause problems like:

- too many open files (EMFILE)
- memory pressure (too many pipelines running)
- disk thrashing
- unstable behavior (random failures under load)

So the project is designed around **controlled concurrency**:

- the watcher should be lightweight
- files go into a queue
- only a limited number of workers process files at the same time

---

## What I’m practicing in this project

- **fs.watch** (folder watcher)
- **Streams** (`createReadStream` / `createWriteStream`)
- **Backpressure** (streams slow down automatically when the destination is slow)
- **Queue + Worker Pool** (controlled concurrency)
- **Atomic output writes** (write to temp file, then rename)
- **Failure handling** basics (retry logic, quarantine folder later)
- Clean code structure (separation of concerns)

---

## Project Layers

I’m building the project in layers, not all at once.

### Layer 1: Bootstrap + Config + Logger

Layer 1 goal:

- a clean entrypoint to run the service
- one place for settings (config)
- structured logs with log levels

Deliverables:

- `src/config/config.js` → config values using `process.env` with defaults
- `src/logging/logger.js` → logger with levels: `debug, info, warn, error`
- `src/index.js` → starts the service and prints “service started” + config

Example logs are JSON like:

```json
{
  "timestamp": "2026-02-17T20:07:41.969Z",
  "level": "info",
  "msg": "Configuration loaded",
  "service": "file-processing-service",
  "meta": { "config": { "...": "..." } }
}
```
