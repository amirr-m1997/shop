import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ProductListingPage from './pages/ProductListingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import SizeFinderPage from './pages/SizeFinderPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import PaymentCallbackPage from './pages/PaymentCallbackPage';
import OrderFailedPage from './pages/OrderFailedPage';
import ContactPage from './pages/ContactPage';
import ShippingPage from './pages/ShippingPage';
import ReturnsPage from './pages/ReturnsPage';
import FaqPage from './pages/FaqPage';
import AboutPage from './pages/AboutPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import StylePage from './pages/StylePage';
import DiscountPopup from './components/DiscountPopup';


const MAX_SAVED_SCROLL_POSITIONS = 50;

function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousLocationRef = useRef(location);
  const positionsRef = useRef(new Map());

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useLayoutEffect(() => {
    const savedPosition = positionsRef.current.get(location.key);
    const isPop = navigationType === 'POP';

    let frameId;
    let timeoutId;
    let retryTimeoutId;
    let resizeObserver;

    let restored = false;

    const restore = () => {
      window.scrollTo({ top: savedPosition, left: 0, behavior: 'auto' });
      if (window.scrollY >= savedPosition - 2) {
        restored = true;
      }
    };

    const cleanup = () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (timeoutId) clearTimeout(timeoutId);
      if (retryTimeoutId) clearInterval(retryTimeoutId);
      resizeObserver?.disconnect();
    };

    if (isPop && typeof savedPosition === 'number') {
      frameId = requestAnimationFrame(() => {
        frameId = requestAnimationFrame(restore);
      });
      resizeObserver = new ResizeObserver(() => {
        if (!restored) restore();
      });
      resizeObserver.observe(document.body);
      retryTimeoutId = setInterval(() => {
        if (!restored) restore();
        else clearInterval(retryTimeoutId);
      }, 200);
      timeoutId = setTimeout(cleanup, 10000);
    } else if (!isPop) {
      // Only scroll to top on forward navigation, not on POP
      window.scrollTo(0, 0);
    }

    previousLocationRef.current = location;

    return () => {
      cleanup();
      positionsRef.current.set(location.key, window.scrollY);
      if (positionsRef.current.size > MAX_SAVED_SCROLL_POSITIONS) {
        positionsRef.current.delete(positionsRef.current.keys().next().value);
      }
    };
  }, [location.key, navigationType]);
}

function AuthRedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = () => navigate('/login');
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [navigate]);
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Router>
              <ScrollRestoration />
              <AuthRedirectHandler />
              <DiscountPopup />
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/category/:category" element={<ProductListingPage />} />
                    <Route path="/products" element={<ProductListingPage />} />
                    <Route path="/product/:slug" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/size-finder" element={<SizeFinderPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/new-arrivals" element={<ProductListingPage />} />
                    <Route path="/sale" element={<ProductListingPage />} />
                    <Route path="/trending" element={<ProductListingPage />} />
                    <Route path="/order-success" element={<OrderSuccessPage />} />
                    <Route path="/payment/callback" element={<PaymentCallbackPage />} />
                    <Route path="/order-failed" element={<OrderFailedPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/shipping" element={<ShippingPage />} />
                    <Route path="/returns" element={<ReturnsPage />} />
                    <Route path="/faq" element={<FaqPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/:slug" element={<BlogPostPage />} />
                    <Route path="/style/:slug" element={<StylePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </Router>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
