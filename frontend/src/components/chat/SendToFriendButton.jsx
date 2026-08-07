import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import SendToFriendModal from './SendToFriendModal';

/**
 * دکمه «ارسال به دوست» — با کلیک، مودال انتخاب دوست و ارسال محصول باز می‌شود.
 */
const SendToFriendButton = ({ product, className = '', variant = 'icon', label = 'ارسال به دوست' }) => {
  const [open, setOpen] = useState(false);

  const styles =
    variant === 'icon'
      ? `inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur shadow-sm transition-all hover:scale-110 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
      : `inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-foreground bg-white/80 dark:bg-black/60 backdrop-blur shadow-sm transition-all hover:scale-110 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={`${styles} ${className}`}
        title={label}
        aria-label={label}
      >
        <UserPlus className="h-4 w-4" />
        {variant !== 'icon' && <span>{label}</span>}
      </button>
      <SendToFriendModal
        product={product}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
};

export default SendToFriendButton;
