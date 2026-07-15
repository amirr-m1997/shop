import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useCart } from '../contexts/CartContext';
import { ordersAPI } from '../services/api';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const [step, setStep] = useState(1);
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [newAddress, setNewAddress] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await ordersAPI.getShippingAddresses();
      setShippingAddresses(response.data);
      if (response.data.length > 0) {
        setSelectedAddress(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleAddAddress = async () => {
    try {
      await ordersAPI.createShippingAddress(newAddress);
      await fetchAddresses();
      setNewAddress({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
      });
    } catch (error) {
      console.error('Error adding address:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      alert('Please select a shipping address');
      return;
    }

    setLoading(true);
    try {
      await ordersAPI.createOrder({
        shipping_address_id: selectedAddress,
        shipping_method: 'Standard',
        payment_method: paymentMethod,
        notes: '',
      });
      navigate('/order-success');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('خطا در ثبت سفارش. لطفا دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-2">سبد خرید شما خالی است</h2>
        <Button onClick={() => navigate('/')}>ادامه خرید</Button>
      </div>
    );
  }

  const subtotal = cart.total_price;
  const shipping = 10;
  const tax = subtotal * 0.09;
  const total = subtotal + shipping + tax;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">پرداخت</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div className={`flex items-center ${step >= s ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= s ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
              }`}>
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              <span className="ml-2 font-medium">
                {s === 1 ? 'سبد خرید' : s === 2 ? 'ارسال' : 'پرداخت'}
              </span>
            </div>
            {s < 3 && <div className={`w-16 h-0.5 mx-4 ${step > s ? 'bg-primary' : 'bg-muted-foreground'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Step 1: Cart Review */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cart.items.map(item => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b">
                      <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                        <img
                          src={item.product.primary_image || 'https://via.placeholder.com/100x100'}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.product.name}</h3>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        <p className="font-bold mt-1">${item.total_price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-6" onClick={() => setStep(2)}>
                  Continue to Shipping
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {shippingAddresses.map(address => (
                    <div
                      key={address.id}
                      className={`p-4 border rounded-lg cursor-pointer ${
                        selectedAddress === address.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedAddress(address.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{address.full_name}</p>
                          <p className="text-sm text-muted-foreground">{address.phone}</p>
                          <p className="text-sm mt-1">
                            {address.address_line1}
                            {address.address_line2 && `, ${address.address_line2}`}
                          </p>
                          <p className="text-sm">
                            {address.city}, {address.state} {address.postal_code}
                          </p>
                        </div>
                        {address.is_default && <Badge>Default</Badge>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Add New Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Full Name"
                      value={newAddress.full_name}
                      onChange={e => setNewAddress({...newAddress, full_name: e.target.value})}
                      className="col-span-2"
                    />
                    <Input
                      placeholder="Phone"
                      value={newAddress.phone}
                      onChange={e => setNewAddress({...newAddress, phone: e.target.value})}
                    />
                    <Input
                      placeholder="City"
                      value={newAddress.city}
                      onChange={e => setNewAddress({...newAddress, city: e.target.value})}
                    />
                    <Input
                      placeholder="Address Line 1"
                      value={newAddress.address_line1}
                      onChange={e => setNewAddress({...newAddress, address_line1: e.target.value})}
                      className="col-span-2"
                    />
                    <Input
                      placeholder="Address Line 2 (Optional)"
                      value={newAddress.address_line2}
                      onChange={e => setNewAddress({...newAddress, address_line2: e.target.value})}
                      className="col-span-2"
                    />
                    <Input
                      placeholder="State"
                      value={newAddress.state}
                      onChange={e => setNewAddress({...newAddress, state: e.target.value})}
                    />
                    <Input
                      placeholder="Postal Code"
                      value={newAddress.postal_code}
                      onChange={e => setNewAddress({...newAddress, postal_code: e.target.value})}
                    />
                  </div>
                  <Button onClick={handleAddAddress} className="mt-4">
                    Add Address
                  </Button>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(3)} disabled={!selectedAddress}>
                    Continue to Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
                    { id: 'debit_card', label: 'Debit Card', icon: CreditCard },
                    { id: 'cash_on_delivery', label: 'Cash on Delivery', icon: Truck },
                  ].map(method => (
                    <div
                      key={method.id}
                      className={`p-4 border rounded-lg cursor-pointer flex items-center gap-4 ${
                        paymentMethod === method.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      <method.icon className="h-6 w-6" />
                      <span className="font-medium">{method.label}</span>
                      {paymentMethod === method.id && <Check className="h-5 w-5 ml-auto text-primary" />}
                    </div>
                  ))}
                </div>

                {paymentMethod === 'credit_card' && (
                  <div className="mt-6 space-y-4">
                    <Input placeholder="Card Number" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input placeholder="MM/YY" />
                      <Input placeholder="CVV" />
                    </div>
                    <Input placeholder="Cardholder Name" />
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handlePlaceOrder} disabled={loading}>
                    {loading ? 'Processing...' : 'Place Order'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (9%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
