import path from "node:path";

function readString(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return defaultValue;
  return value.trim();
}

function readInt(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return defaultValue;

  const numValue = Number.parseInt(value, 10);
  if (Number.isNaN(numValue)) {
    throw new Error(`Config error: ${name} must be a number. Got "${value}"`);
  }
  return numValue;
}

const STORAGE_DIR = path.join(process.cwd(), "storage");

const config = {
  serviceName: readString("SERVICE_NAME", "file-processing-service"),

  inputDir: readString("INPUT_DIR", path.join(STORAGE_DIR, "input")),
  outputDir: readString("OUTPUT_DIR", path.join(STORAGE_DIR, "output")),

  logLevel: readString("LOG_LEVEL", "info"),

  maxConcurrency: readInt("MAX_CONCURRENCY", 4),
};

if (config.maxConcurrency <= 0) {
  throw new Error("Config error: MAX_CONCURRENCY must be >= 1");
}

export default config;
