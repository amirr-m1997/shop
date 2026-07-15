import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';

const faqData = [
  {
    question: 'چگونه می‌توانم سفارش دهم؟',
    answer: 'محصول مورد نظر خود را انتخاب کرده و به سبد خرید اضافه کنید. سپس وارد بخش پرداخت شوید و اطلاعات ارسال و پرداخت را تکمیل کنید.',
  },
  {
    question: 'هزینه ارسال چقدر است؟',
    answer: 'ارسال استاندارد ۱۰ دلار و ارسال سریع ۲۰ دلار است. ارسال برای سفارش‌های بالای ۱۰۰ دلار رایگان است.',
  },
  {
    question: 'آیا امکان بازگشت کالا وجود دارد؟',
    answer: 'بله، تا ۳۰ روز پس از دریافت سفارش می‌توانید کالا را بازگشت دهید. کالا باید در شرایط اصلی باشد.',
  },
  {
    question: 'زمان تحویل سفارش چقدر است؟',
    answer: 'ارسال استاندارد: ۳ تا ۵ روز کاری. ارسال سریع: ۱ تا ۲ روز کاری.',
  },
  {
    question: 'آیا می‌توانم سفارش خود را لغو کنم؟',
    answer: 'بله، اگر سفارش هنوز ارسال نشده باشد، می‌توانید آن را لغو کنید. با پشتیبانی تماس بگیرید.',
  },
  {
    question: 'روش‌های پرداخت چیست؟',
    answer: 'ما کارت اعتباری، کارتdebit و پرداخت در محل را قبول می‌کنیم.',
  },
  {
    question: 'آیا محصولات گارانتی دارند؟',
    answer: 'بله، تمام محصولات ما دارای گارانتی اصالت و کیفیت هستند.',
  },
];

const FaqItem = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <CardContent className="p-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 flex items-center justify-between text-right hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">{item.question}</span>
          {isOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
        </button>
        {isOpen && (
          <div className="px-4 pb-4 text-muted-foreground">
            {item.answer}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const FaqPage = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-center">سوالات متداول</h1>
      <div className="space-y-4">
        {faqData.map((item, index) => (
          <FaqItem key={index} item={item} />
        ))}
      </div>
    </div>
  );
};

export default FaqPage;
