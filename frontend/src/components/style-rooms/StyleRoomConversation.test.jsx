// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mergeMessages } from '../../lib/messages';

const message = (id, createdAt) => ({ id, created_at: createdAt });

describe('StyleRoomConversation pagination merging', () => {
  it('merges pages 1 through 4 in chronological order without duplicates', () => {
    let messages = [];
    const pages = [
      [message(1, '2026-01-01T10:00:00Z'), message(2, '2026-01-01T10:01:00Z')],
      [message(2, '2026-01-01T10:01:00Z'), message(3, '2026-01-01T10:02:00Z')],
      [message(4, '2026-01-01T10:03:00Z')],
      [message(5, '2026-01-01T10:04:00Z')],
    ];

    pages.forEach((page) => {
      messages = mergeMessages(messages, page);
    });

    expect(messages.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(messages.map(({ id }) => id)).size).toBe(messages.length);
  });

  it('replaces a duplicate message with the latest representation', () => {
    const merged = mergeMessages(
      [message(7, '2026-01-01T10:00:00Z')],
      [{ ...message(7, '2026-01-01T10:00:00Z'), is_read: true }],
    );

    expect(merged).toEqual([{ id: 7, created_at: '2026-01-01T10:00:00Z', is_read: true }]);
  });
});
