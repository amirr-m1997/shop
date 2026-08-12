import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { pagesAPI } from '../services/api';
import { useContactInfoQuery } from '../queries/pageQueries';
import { SEO } from '../lib/seo';

const ContactPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const { data: contactInfo } = useContactInfoQuery();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await pagesAPI.sendMessage(formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <SEO
        title="تماس با ما"
        description="اطلاعات تماس فروشگاه مد | تلفن، ایمیل، آدرس و ساعات کاری"
        url="https://fashionshop.ir/contact"
      />
      <h1 className="text-3xl font-bold mb-8 text-center">تماس با ما</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Card><CardContent className="p-6"><div className="flex items-center gap-3 mb-4"><Phone className="h-5 w-5 text-primary" /><h3 className="font-semibold">تلفن</h3></div><p className="text-muted-foreground" dir="ltr">{contactInfo?.phone1 || '۰۲۱-۱۲۳۴۵۶۷۸'}</p>{contactInfo?.phone2 && <p className="text-muted-foreground" dir="ltr">{contactInfo.phone2}</p>}</CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-3 mb-4"><Mail className="h-5 w-5 text-primary" /><h3 className="font-semibold">ایمیل</h3></div><p className="text-muted-foreground" dir="ltr">{contactInfo?.email1 || 'info@fashion.com'}</p>{contactInfo?.email2 && <p className="text-muted-foreground" dir="ltr">{contactInfo.email2}</p>}</CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-3 mb-4"><MapPin className="h-5 w-5 text-primary" /><h3 className="font-semibold">آدرس</h3></div><p className="text-muted-foreground">{contactInfo?.address || 'تهران، خیابان ولیعصر، پلاک ۱۲۳'}</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-3 mb-4"><Clock className="h-5 w-5 text-primary" /><h3 className="font-semibold">ساعات کاری</h3></div><p className="text-muted-foreground">{contactInfo?.working_hours || 'شنبه تا پنجشنبه: ۹ صبح تا ۶ عصر'}</p>{contactInfo?.working_hours_closed && <p className="text-muted-foreground">{contactInfo.working_hours_closed}</p>}</CardContent></Card>
      </div>
      <Card><CardContent className="p-6"><h3 className="font-semibold mb-4">پیام بگذارید</h3>
        {submitted && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">پیام شما با موفقیت ارسال شد.</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="text" placeholder="نام شما" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input type="email" placeholder="ایمیل شما" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <textarea placeholder="پیام شما" rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full p-3 border rounded-lg bg-background text-foreground" required />
          <Button type="submit"><Send className="ml-2 h-4 w-4" />ارسال پیام</Button>
        </form>
      </CardContent></Card>
    </div>
  );
};

export default ContactPage;
