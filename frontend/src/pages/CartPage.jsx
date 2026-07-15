import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useCart } from '../contexts/CartContext';

const CartPage = () => {
  const { cart, loading, updateCartItem, removeCartItem } = useCart();

  const handleQuantityChange = async (itemId, newQuantity) => {
    try {
      await updateCartItem({ item_id: itemId, quantity: newQuantity });
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await removeCartItem(itemId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">در حال بارگذاری سبد خرید...</div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">سبد خرید شما خالی است</h2>
        <p className="text-muted-foreground mb-6">برای شروع چند محصول اضافه کنید</p>
        <Link to="/">
          <Button>ادامه خرید</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">سبد خرید ({cart.items.length} کالا)</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden shrink-0">
                    <img
                      src={item.product.primary_image || 'https://via.placeholder.com/100x100'}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold">{item.product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.variant ? `${item.variant.size_name} - ${item.variant.color_name}` : 'استاندارد'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <span className="font-bold">${item.total_price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">خلاصه سفارش</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">جمع کل</span>
                  <span>${cart.total_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ارسال</span>
                  <span>$10.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مالیات (۹٪)</span>
                  <span>${(cart.total_price * 0.09).toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>مجموع</span>
                  <span>${(cart.total_price + 10 + cart.total_price * 0.09).toFixed(2)}</span>
                </div>
              </div>

              <Link to="/checkout">
                <Button className="w-full" size="lg">
                  ادامه به پرداخت
                </Button>
              </Link>

              <Link to="/" className="block mt-4 text-center text-sm text-muted-foreground hover:underline">
                ادامه خرید
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
