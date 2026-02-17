import config from "./config/config.js";
import logger from "./logging/logger.js";

logger.info("Service started!");
console.log();
logger.info("Configuration loaded", { config });
