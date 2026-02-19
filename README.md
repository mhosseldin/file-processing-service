# File Processing Service (Node.js)

This is a small file processing service project.

The idea is simple:
Files are dropped into an input folder, and the service detects them, processes them, and writes the result into an output folder.

I built this project to practice real Node.js filesystem concepts (watcher, queue, concurrency control, atomic writes) and to try writing code in a more production-style structure (config, logger, layers, separation of concerns).

---

## Core Flow (Big Picture)

Input folder → Detect new file → Queue → Worker pool → Processing → Atomic output write

Or visually:

Watcher  
↓  
Bounded Queue  
↓  
Worker Pool (maxConcurrency = 4)  
↓  
Processing (with retry logic)  
↓  
Atomic write (tmp → rename)

---

## Why not just watch and process immediately?

If many files appear at once (for example 500–1000 files), doing:

fs.watch → processFile()

can cause problems like:

- too many open files (EMFILE)
- memory pressure (too many async jobs running at once)
- disk thrashing
- unstable behavior under load

So instead of processing files immediately, this project introduces:

- a bounded queue
- a worker pool
- controlled concurrency

Only a limited number of files are processed at the same time.

---

## Architecture Overview

The service is split into clear layers.

### 1) Watcher Layer

Responsible for:

- watching the input folder using fs.promises.watch
- debouncing duplicate events
- checking file stability (to avoid reading half-written files)
- emitting a clean "file:ready" event

The watcher does not process files directly.

---

### 2) Queue Layer (Worker Pool)

A custom JobQueue class that:

- stores pending jobs
- limits concurrent execution (maxConcurrency)
- prevents unbounded growth (maxSize)
- isolates job failures
- automatically schedules the next job when one finishes

This avoids overloading the system when many files arrive at once.

---

### 3) Processing Layer

processFile(filePath) is responsible for:

- reading the file
- applying a simple transform (currently: converting content to uppercase)
- writing the output using atomic write
- retrying transient errors (like EBUSY, EMFILE, EPERM)

Retry logic is limited and only applied to retryable errors.

---

### 4) Filesystem Utilities

safeWriteFileAtomic():

- writes to a temporary file
- renames it to the final target
- cleans up the temp file if something fails

This prevents partially written output files.

---

## Failure Handling Strategy

- Retry only transient errors
- Do not retry corrupted data
- Do not crash the queue when a job fails
- Log all failures in structured JSON format

In a real production system, failed files should be moved to a quarantine folder.  
For simplicity, this project only logs the error.

---

## Configuration

The service uses environment variables:

- SERVICE_NAME
- INPUT_DIR
- OUTPUT_DIR
- LOG_LEVEL
- MAX_CONCURRENCY

Defaults are provided in config.js.

Example:

LOG_LEVEL=debug MAX_CONCURRENCY=2 npm run dev

---

## Project Structure

```text
src/
├── config/
├── fs/
├── logging/
├── processing/
├── queue/
├── watcher/
└── index.js
```

Each folder has a single responsibility.

---

## Example Log Output

{
"timestamp": "2026-02-19T19:34:26.530Z",
"level": "info",
"msg": "Processing file",
"service": "file-processing-service",
"meta": {
"file": "storage/input/testInput.txt"
}
}

Logs are structured JSON to imitate production logging style.

---

## What This Project Demonstrates

- Event-driven design
- Controlled concurrency
- Bounded queue
- Retry strategy
- Atomic filesystem operations
- Clean separation of concerns
- Graceful shutdown handling

---

## Limitations (Intentional Simplifications)

- Processing currently uses readFile (not full stream pipeline)
- No quarantine folder implemented
- No metrics system
- Single-process design

These can be extended later.

---

## Final Note

This project is structured like a small service with clear responsibilities and controlled concurrency.

The main goal was to understand how real systems handle filesystem events, queueing, and failure handling in Node.js.
