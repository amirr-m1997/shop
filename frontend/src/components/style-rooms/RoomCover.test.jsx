// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import RoomCover from './RoomCover';
import { getRoomCoverGradient } from '../../lib/roomCovers';

afterEach(() => cleanup());

describe('RoomCover visual cover assignment', () => {
  it('renders the real image when a room already has a cover', () => {
    const { container } = render(
      <RoomCover room={{ id: 'r1', title: 'اتاق', cover: '/media/rooms/x.jpg' }} className="h-full w-full" />
    );
    expect(container.querySelector('img')).not.toBeNull();
    expect(screen.queryByTestId('room-cover-gradient')).toBeNull();
  });

  it('renders a gradient cover for rooms without a cover', () => {
    const { container } = render(
      <RoomCover room={{ id: 'r1', title: 'اتاق', cover: null }} className="h-full w-full" />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('room-cover-gradient')).toBeTruthy();
  });

  it('assigns the same gradient to the same room (deterministic consistency)', () => {
    expect(getRoomCoverGradient({ id: 'room-a' })).toBe(getRoomCoverGradient({ id: 'room-a' }));
  });

  it('assigns different rooms different covers', () => {
    const gradients = Array.from({ length: 60 }, (_, i) => getRoomCoverGradient({ id: `room-${i}` }));
    expect(new Set(gradients).size).toBeGreaterThanOrEqual(2);
  });
});