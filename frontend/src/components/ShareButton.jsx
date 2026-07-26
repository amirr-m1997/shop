import React, { useState } from 'react';
import { Share2, MessageCircle, Send } from 'lucide-react';

const ShareButton = ({ product, className = '' }) => {
  const [open, setOpen] = useState(false);

  const productUrl = `${window.location.origin}/product/${product.slug}`;
  const shareText = `${product.name} - ${product.price?.toLocaleString('fa-IR')} تومان`;

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
    setOpen(false);
  };

  const shareToInstagram = () => {
    // Instagram doesn't have a direct share URL, copy link instead
    navigator.clipboard.writeText(productUrl).then(() => {
      alert('لینک محصول کپی شد! آن را در اینستاگرام ارسال کنید.');
    });
    setOpen(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(productUrl).then(() => {
      alert('لینک محصول کپی شد!');
    });
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="absolute bottom-2 right-2 z-10 h-8 w-8 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur flex items-center justify-center transition-all hover:scale-110"
        title="اشتراک‌گذاری"
      >
        <Share2 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-12 right-0 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-2 min-w-[160px]">
            <button
              onClick={shareToTelegram}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <span>تلگرام</span>
            </button>
            <button
              onClick={shareToInstagram}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
            >
              <Send className="h-4 w-4 text-pink-500" />
              <span>اینستاگرام</span>
            </button>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
            >
              <Share2 className="h-4 w-4 text-gray-500" />
              <span>کپی لینک</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;
