import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

const OrderSuccessPage = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-lg text-center">
      <Card>
        <CardContent className="p-8">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">سفارش شما ثبت شد!</h1>
          <p className="text-muted-foreground mb-2">
            ممنون از خرید شما. سفارش شما با موفقیت ثبت شد.
          </p>
          <p className="text-muted-foreground mb-8">
            یک ایمیل تایید به آدرس ایمیل شما ارسال خواهد شد.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link to="/">
                بازگشت به خانه <ArrowLeft className="h-4 w-4 mr-2" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/products">ادامه خرید</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSuccessPage;
