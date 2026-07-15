import React from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';

const ContactPage = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-center">تماس با ما</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">تلفن</h3>
            </div>
            <p className="text-muted-foreground">۰۲۱-۱۲۳۴۵۶۷۸</p>
            <p className="text-muted-foreground">۰۲۱-۸۷۶۵۴۳۲۱</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">ایمیل</h3>
            </div>
            <p className="text-muted-foreground">info@fashion.com</p>
            <p className="text-muted-foreground">support@fashion.com</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">آدرس</h3>
            </div>
            <p className="text-muted-foreground">تهران، خیابان ولیعصر، پلاک ۱۲۳</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">ساعات کاری</h3>
            </div>
            <p className="text-muted-foreground">شنبه تا پنجشنبه: ۹ صبح تا ۶ عصر</p>
            <p className="text-muted-foreground">جمعه: تعطیل</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">پیام بگذارید</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="نام شما"
              className="w-full p-3 border rounded-lg"
            />
            <input
              type="email"
              placeholder="ایمیل شما"
              className="w-full p-3 border rounded-lg"
            />
            <textarea
              placeholder="پیام شما"
              rows={4}
              className="w-full p-3 border rounded-lg"
            />
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
              ارسال پیام
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactPage;
