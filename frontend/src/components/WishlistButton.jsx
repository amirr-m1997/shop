import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useWishlistItem } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const WishlistButton = ({ productId, size = 'h-5 w-5', className = '', style = {} }) => {
  const { isWishlisted: isLiked, toggleWishlist } = useWishlistItem(productId);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [animating, setAnimating] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setAnimating(true);
    await toggleWishlist(productId);
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      className={`absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-white/90 dark:bg-black/70 flex items-center justify-center transition-transform hover:scale-110 ${className}`}
      style={style}
      title={isLiked ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
    >
      <Heart
        className={`${size} transition-[transform,color,fill] ${
          isLiked
            ? 'fill-red-500 text-red-500'
            : 'text-gray-600 dark:text-gray-300'
        } ${animating ? 'scale-125' : 'scale-100'}`}
      />
    </button>
  );
};

export default WishlistButton;
