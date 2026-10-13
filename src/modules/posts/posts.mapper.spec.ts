import { User } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { buildCommentTree, toCommentResponse } from './posts.mapper';

const author = {
  id: 'user-1',
  name: 'أحمد',
  avatarUrl: null,
} as User;

describe('buildCommentTree', () => {
  it('nests replies under parents including reply-of-reply', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const rows = [
      {
        id: 'c1',
        body: 'root',
        createdAt,
        parentId: null,
        author,
      },
      {
        id: 'c2',
        body: 'reply',
        createdAt,
        parentId: 'c1',
        author,
      },
      {
        id: 'c3',
        body: 'nested',
        createdAt,
        parentId: 'c2',
        author,
      },
    ];

    const tree = buildCommentTree(rows, null);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe('c1');
    expect(tree[0]?.replies).toHaveLength(1);
    expect(tree[0]?.replies[0]?.id).toBe('c2');
    expect(tree[0]?.replies[0]?.replies[0]?.id).toBe('c3');
    expect(tree[0]?.replies[0]?.replies[0]?.parentId).toBe('c2');
  });

  it('toCommentResponse defaults replies to []', () => {
    const result = toCommentResponse({
      id: 'c1',
      body: 'hi',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      parentId: null,
      author,
    });
    expect(result.parentId).toBeNull();
    expect(result.replies).toEqual([]);
  });
});
