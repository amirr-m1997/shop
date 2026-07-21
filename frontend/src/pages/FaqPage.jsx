import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { pagesAPI } from '../services/api';

const FaqItem = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Card>
      <CardContent className="p-0">
        <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex items-center justify-between text-right hover:bg-muted/50 transition-colors">
          <span className="font-semibold">{item.question}</span>
          {isOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
        </button>
        {isOpen && <div className="px-4 pb-4 text-muted-foreground">{item.answer}</div>}
      </CardContent>
    </Card>
  );
};

const FaqPage = () => {
  const [faqData, setFaqData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pagesAPI.getFaq().then(res => {
      setFaqData(res.data.results || res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container mx-auto px-4 py-16 text-center">در حال بارگذاری...</div>;

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-center">سوالات متداول</h1>
      <div className="space-y-4">
        {faqData.length === 0 ? (
          <p className="text-center text-muted-foreground">هنوز سوالی اضافه نشده است</p>
        ) : (
          faqData.map((item, index) => <FaqItem key={item.id || index} item={item} />)
        )}
      </div>
    </div>
  );
};

export default FaqPage;
