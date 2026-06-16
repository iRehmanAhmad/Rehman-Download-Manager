import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { SETTINGS_KEY } from '@rdm/shared';

type GetSetting = (key: string) => string;

const ARCHIVE_EXTS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];

export interface PostProcessResult {
  /** Final path of the primary output, if post-processing replaced the file. */
  newFilePath?: string;
  messages: string[];
}

/**
 * Run optional post-completion steps on a finished file:
 *   1. FFmpeg conversion (when the download requested one via metadata.convertTo
 *      and an ffmpeg path is configured).
 *   2. Auto-extraction of archives (when enabled and an extractor is configured).
 *
 * All steps fail safe: any error is logged into `messages` and the original
 * download still completes. Every external process is spawned with shell:false
 * and discrete argv so paths cannot inject shell metacharacters.
 */
export async function runPostProcessing(
  filePath: string,
  metadata: Record<string, unknown> | undefined,
  getSetting: GetSetting,
): Promise<PostProcessResult> {
  const result: PostProcessResult = { messages: [] };
  if (!filePath || !fs.existsSync(filePath)) return result;

  // 1. FFmpeg conversion ----------------------------------------------------
  const convertTo = typeof metadata?.convertTo === 'string' ? (metadata.convertTo as string) : '';
  const ffmpegPath = getSetting(SETTINGS_KEY.FFMPEG_PATH);
  if (convertTo && ffmpegPath) {
    try {
      const outPath = replaceExt(filePath, convertTo);
      await runProcess(ffmpegPath, ['-y', '-i', filePath, outPath]);
      if (fs.existsSync(outPath)) {
        result.newFilePath = outPath;
        result.messages.push(`Converted to ${convertTo}`);
      }
    } catch (err) {
      result.messages.push(`FFmpeg conversion failed: ${String(err)}`);
    }
  }

  // 2. Archive auto-extraction ---------------------------------------------
  const autoExtract = getSetting(SETTINGS_KEY.AUTO_EXTRACT_ARCHIVES) === 'true';
  const extractCmd = getSetting(SETTINGS_KEY.EXTRACT_CMD);
  const target = result.newFilePath || filePath;
  if (autoExtract && extractCmd && isArchive(target)) {
    try {
      const destDir = path.join(path.dirname(target), path.parse(target).name);
      fs.mkdirSync(destDir, { recursive: true });
      // 7-Zip style argv: `x <archive> -o<dest> -y`. Discrete args, no shell.
      await runProcess(extractCmd, ['x', target, `-o${destDir}`, '-y']);
      result.messages.push(`Extracted to ${destDir}`);

      if (getSetting(SETTINGS_KEY.DELETE_ARCHIVE_AFTER_EXTRACT) === 'true') {
        try { fs.unlinkSync(target); } catch { /* best effort */ }
      }
    } catch (err) {
      result.messages.push(`Archive extraction failed: ${String(err)}`);
    }
  }

  return result;
}

function isArchive(file: string): boolean {
  const lower = file.toLowerCase();
  return ARCHIVE_EXTS.some((ext) => lower.endsWith(ext));
}

function replaceExt(file: string, newExt: string): string {
  const ext = newExt.startsWith('.') ? newExt : `.${newExt}`;
  const parsed = path.parse(file);
  return path.join(parsed.dir, parsed.name + ext);
}

function runProcess(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: false });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(cmd)} exited with code ${code}`));
    });
  });
}
