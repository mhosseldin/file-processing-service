import { promises as fsp } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import config from "../config/config.js";

async function safeWriteFileAtomic(targetPath, content) {
  const base = path.basename(targetPath);

  const tmpDir = config.tmpDir;

  await fsp.mkdir(tmpDir, { recursive: true });

  const tmpPath = path.join(
    tmpDir,
    `.${base}.tmp-${crypto.randomBytes(6).toString("hex")}`,
  );

  try {
    await fsp.writeFile(tmpPath, content, "utf8");
    await fsp.rename(tmpPath, targetPath);
  } catch (err) {
    try {
      await fsp.unlink(tmpPath);
    } catch {}

    throw err;
  }
}

export default safeWriteFileAtomic;
