import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { Logger } from '@nestjs/common';
import ffmpegStatic from 'ffmpeg-static';

const execFileAsync = promisify(execFile);
const logger = new Logger('PostThumbnails');

function isMissingBinary(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as NodeJS.ErrnoException & { code?: string };
  return err.code === 'ENOENT';
}

function ffmpegCandidates(): string[] {
  const out: string[] = [];
  if (process.env.FFMPEG_PATH) out.push(process.env.FFMPEG_PATH);
  // Prefer system ffmpeg in Docker (Alpine apk). Bundled binary is for local/dev.
  out.push('ffmpeg');
  if (ffmpegStatic) out.push(ffmpegStatic);
  return [...new Set(out)];
}

async function runFfmpeg(args: string[]): Promise<void> {
  let lastError: unknown;
  for (const bin of ffmpegCandidates()) {
    try {
      await execFileAsync(bin, args, { maxBuffer: 10 * 1024 * 1024 });
      return;
    } catch (error: unknown) {
      if (isMissingBinary(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error('ffmpeg binary not found');
}

/**
 * Extracts a single frame from a video and writes it as a JPG.
 * Uses system ffmpeg when available (Docker), otherwise ffmpeg-static.
 *
 * Portrait reels: the frame is scaled to 720px tall, width auto.
 *
 * Never throws on failure — logs a warning and returns false, so the
 * caller can fall back gracefully.
 */
export async function extractVideoThumbnail(
  videoPath: string,
  outputPath: string,
  options: {
    timestamp?: string;
    /** ffmpeg scale expression. Default is portrait: '-1:720'. */
    scale?: string;
  } = {},
): Promise<boolean> {
  const scale = options.scale ?? '-1:720';
  const absVideo = resolve(videoPath);
  const absOutput = resolve(outputPath);

  // Short clips often fail at 1s — try early frames first.
  const timestamps = options.timestamp
    ? [options.timestamp]
    : ['00:00:00.1', '00:00:00', '00:00:01'];

  for (const timestamp of timestamps) {
    try {
      await runFfmpeg([
        '-y',
        '-ss',
        timestamp,
        '-i',
        absVideo,
        '-vframes',
        '1',
        '-vf',
        `scale=${scale}`,
        '-q:v',
        '3',
        absOutput,
      ]);
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'unknown error';
      const stderr =
        error && typeof error === 'object' && 'stderr' in error
          ? String((error as { stderr?: Buffer | string }).stderr ?? '')
          : '';
      logger.warn(
        `Thumbnail attempt @${timestamp} failed for ${absVideo}: ${message}${
          stderr ? ` | ${stderr.slice(0, 400)}` : ''
        }`,
      );
    }
  }

  return false;
}
