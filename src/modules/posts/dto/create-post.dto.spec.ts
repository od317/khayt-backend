import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreatePostDto } from './create-post.dto';

const base = {
  type: 'job_offering',
  title: 'مطلوب خياط',
  body: 'نبحث عن خياط ماهر',
  location: 'دمشق',
};

const collect = (errors: ValidationError[]): string[] => {
  const out: string[] = [];
  for (const error of errors) {
    if (error.constraints) out.push(...Object.values(error.constraints));
    if (error.children && error.children.length > 0) {
      out.push(...collect(error.children));
    }
  }
  return out;
};

const run = async (overrides: Record<string, unknown> = {}) => {
  const dto = plainToInstance(CreatePostDto, { ...base, ...overrides });
  const errors = await validate(dto);
  return collect(errors);
};

describe('CreatePostDto', () => {
  it('accepts a minimal valid post', async () => {
    const messages = await run();
    expect(messages).toEqual([]);
  });

  it('rejects a title shorter than 3 chars', async () => {
    const messages = await run({ title: 'ab' });
    expect(messages.length).toBeGreaterThan(0);
  });

  it('rejects an empty body', async () => {
    const messages = await run({ body: '' });
    expect(messages.length).toBeGreaterThan(0);
  });

  it('rejects a missing location', async () => {
    const messages = await run({ location: '' });
    expect(messages.length).toBeGreaterThan(0);
  });

  it('rejects specialty as an array', async () => {
    const messages = await run({ specialty: ['خياطة'] });
    expect(messages.length).toBeGreaterThan(0);
  });

  it('accepts workType as an array', async () => {
    const messages = await run({ workType: ['دوام كامل'] });
    expect(messages).toEqual([]);
  });

  it('allows a post without categories', async () => {
    const messages = await run({ categoryIds: [] });
    expect(messages).toEqual([]);
  });

  it('rejects more than 8 imageUrls', async () => {
    const messages = await run({
      media: 'image',
      imageUrls: Array.from({ length: 9 }, (_, i) => `u${i}`),
    });
    expect(messages.length).toBeGreaterThan(0);
  });
});
