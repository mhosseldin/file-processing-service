import config from "../config/config.js";

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level) {
  const currentLevel = config.logLevel.toLowerCase();
  const currentValue = LEVELS[currentLevel] ?? LEVELS.info;
  return LEVELS[level] >= currentValue;
}

function writeLog(level, msg, meta) {
  if (!shouldLog(level)) return;

  const log = {
    timestamp: new Date().toISOString(),
    level,
    msg,
    service: config.serviceName,
  };

  if (meta && typeof meta === "object" && Object.keys(meta).length > 0) {
    log.meta = meta;
  }

  if (level === "error") {
    console.error(JSON.stringify(log));
  } else {
    console.log(JSON.stringify(log));
  }
}

const logger = {
  info(message, meta) {
    writeLog("info", message, meta);
  },

  warn(message, meta) {
    writeLog("warn", message, meta);
  },

  debug(message, meta) {
    writeLog("debug", message, meta);
  },

  error(message, meta) {
    writeLog("error", message, meta);
  },
};
export default logger;
