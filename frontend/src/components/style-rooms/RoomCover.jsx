import { cn } from '../../lib/utils';
import { getRoomCoverGradient, hasRoomCoverImage } from '../../lib/roomCovers';

/**
 * Renders a StyleRoom cover: the real uploaded image when one exists, or a
 * premium deterministic gradient otherwise. `className` fills the space the
 * same way for both (object-cover / sizing utilities).
 */
const RoomCover = ({ room, className }) => {
  if (hasRoomCoverImage(room)) {
    return <img src={room.cover} alt={room.title || ''} loading="lazy" className={className} />;
  }
  return <div data-testid="room-cover-gradient" className={cn(className, getRoomCoverGradient(room))} />;
};

export default RoomCover;