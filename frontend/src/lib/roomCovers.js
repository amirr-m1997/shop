/**
 * StyleRoom cover presentation.
 *
 * The backend `cover` is an ImageField (real file upload); new rooms created
 * from the UI no longer upload a file, so `cover` stays null. For rooms
 * without a real cover we render one of these premium gradients instead.
 *
 * Selection is deterministic (hash of the room id) instead of Math.random so
 * that the room card and the room detail page always agree and the cover is
 * stable across renders — while still giving different rooms different covers.
 */

export const ROOM_COVER_GRADIENTS = [
  'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500',
  'bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-600',
  'bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600',
  'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600',
  'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600',
  'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500',
  'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900',
  'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-violet-600',
];

const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const getRoomCoverGradient = (room) => {
  const id = String(room?.id ?? '');
  return ROOM_COVER_GRADIENTS[hashCode(id) % ROOM_COVER_GRADIENTS.length];
};

export const hasRoomCoverImage = (room) => Boolean(room?.cover);