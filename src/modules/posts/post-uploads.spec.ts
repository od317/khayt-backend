import { describe, expect, it } from 'vitest';
import { postImagePaths, postVideoPath } from './post-uploads';

const file = (fieldname: string, filename: string): Express.Multer.File =>
  ({ fieldname, filename }) as Express.Multer.File;

describe('post uploads', () => {
  it('maps image files to public paths', () => {
    expect(
      postImagePaths([file('images', 'a.jpg'), file('video', 'r.mp4')]),
    ).toEqual(['/uploads/posts/a.jpg']);
  });

  it('maps the video file to a public path', () => {
    expect(postVideoPath([file('images', 'a.jpg'), file('video', 'r.mp4')])).toBe(
      '/uploads/posts/r.mp4',
    );
  });
});
