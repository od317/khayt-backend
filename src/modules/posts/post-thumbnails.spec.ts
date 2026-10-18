import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>(
    'node:child_process',
  );
  return {
    ...actual,
    execFile: vi.fn(),
  };
});

vi.mock('ffmpeg-static', () => ({
  default: 'C:\\fake\\ffmpeg.exe',
}));

describe('extractVideoThumbnail', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to bundled ffmpeg when system binary is missing', async () => {
    const exec = vi.mocked(execFile);
    exec.mockImplementation(((
      file: string,
      _args: readonly string[],
      _opts: unknown,
      cb: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      if (file === 'ffmpeg') {
        const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
        cb(err, '', '');
        return {} as never;
      }
      cb(null, '', '');
      return {} as never;
    }) as typeof execFile);

    const { extractVideoThumbnail } = await import('./post-thumbnails');
    const ok = await extractVideoThumbnail(
      './uploads/posts/clip.mp4',
      './uploads/posts/clip.thumb.jpg',
    );

    expect(ok).toBe(true);
    expect(exec).toHaveBeenCalledWith(
      'C:\\fake\\ffmpeg.exe',
      expect.arrayContaining(['-i', expect.stringContaining('clip.mp4')]),
      expect.any(Object),
      expect.any(Function),
    );
  });
});
