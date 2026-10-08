import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Logger } from '@nestjs/common';

const execFileAsync = promisify(execFile);
const logger = new Logger('PostThumbnails');

/**
 * Extracts a single frame from a video and writes it as a JPG.
 * Uses ffmpeg (installed in the Docker image).
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
    const timestamp = options.timestamp ?? '00:00:01';
    const scale = options.scale ?? '-1:720';

    try {
        await execFileAsync(
            'ffmpeg',
            [
                '-y',
                '-ss', timestamp,
                '-i', videoPath,
                '-vframes', '1',
                '-vf', `scale=${scale}`,
                '-q:v', '3',
                outputPath,
            ],
            { maxBuffer: 10 * 1024 * 1024 },
        );
        return true;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'unknown error';
        logger.warn(`Failed to extract thumbnail from ${videoPath}: ${message}`);
        return false;
    }
}