import React, { useEffect, useLayoutEffect, useRef, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import Header from './components/Header';
import Footer from './components/Footer';
import DiscountPopup from './components/DiscountPopup';
import LazyPageLoader from './components/LazyPageLoader';

// ── Lazy-loaded page chunks ────────────────────────────────
// Each import() becomes a separate chunk. ProductListingPage is
// shared across 5 routes so Vite deduplicates it automatically.

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListingPage = lazy(() => import('./pages/ProductListingPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const SizeFinderPage = lazy(() => import('./pages/SizeFinderPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const PaymentCallbackPage = lazy(() => import('./pages/PaymentCallbackPage'));
const OrderFailedPage = lazy(() => import('./pages/OrderFailedPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ShippingPage = lazy(() => import('./pages/ShippingPage'));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const StylePage = lazy(() => import('./pages/StylePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));


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

function AppShell() {
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');

  return (
    <div className={`min-h-screen flex flex-col ${isChat ? 'bg-[#0a0a0c]' : ''}`}>
      <Header />
      <main className={`flex-1 ${isChat ? 'overflow-hidden' : ''}`}>
        <Routes>
          <Route path="/" element={<LazyPageLoader Component={HomePage} />} />
          <Route path="/category/:category" element={<LazyPageLoader Component={ProductListingPage} />} />
          <Route path="/products" element={<LazyPageLoader Component={ProductListingPage} />} />
          <Route path="/product/:slug" element={<LazyPageLoader Component={ProductDetailPage} />} />
          <Route path="/cart" element={<LazyPageLoader Component={CartPage} />} />
          <Route path="/checkout" element={<LazyPageLoader Component={CheckoutPage} />} />
          <Route path="/size-finder" element={<LazyPageLoader Component={SizeFinderPage} />} />
          <Route path="/login" element={<LazyPageLoader Component={LoginPage} />} />
          <Route path="/register" element={<LazyPageLoader Component={RegisterPage} />} />
          <Route path="/forgot-password" element={<LazyPageLoader Component={ForgotPasswordPage} />} />
          <Route path="/reset-password" element={<LazyPageLoader Component={ResetPasswordPage} />} />
          <Route path="/profile" element={<LazyPageLoader Component={ProfilePage} />} />
          <Route path="/orders" element={<LazyPageLoader Component={OrdersPage} />} />
          <Route path="/new-arrivals" element={<LazyPageLoader Component={ProductListingPage} />} />
          <Route path="/sale" element={<LazyPageLoader Component={ProductListingPage} />} />
          <Route path="/trending" element={<LazyPageLoader Component={ProductListingPage} />} />
          <Route path="/order-success" element={<LazyPageLoader Component={OrderSuccessPage} />} />
          <Route path="/payment/callback" element={<LazyPageLoader Component={PaymentCallbackPage} />} />
          <Route path="/order-failed" element={<LazyPageLoader Component={OrderFailedPage} />} />
          <Route path="/contact" element={<LazyPageLoader Component={ContactPage} />} />
          <Route path="/shipping" element={<LazyPageLoader Component={ShippingPage} />} />
          <Route path="/returns" element={<LazyPageLoader Component={ReturnsPage} />} />
          <Route path="/faq" element={<LazyPageLoader Component={FaqPage} />} />
          <Route path="/about" element={<LazyPageLoader Component={AboutPage} />} />
          <Route path="/blog" element={<LazyPageLoader Component={BlogPage} />} />
          <Route path="/blog/:slug" element={<LazyPageLoader Component={BlogPostPage} />} />
          <Route path="/style/:slug" element={<LazyPageLoader Component={StylePage} />} />
          <Route path="/chat" element={<LazyPageLoader Component={ChatPage} />} />
          <Route path="/chat/:conversationId" element={<LazyPageLoader Component={ChatPage} />} />
          <Route path="*" element={<LazyPageLoader Component={NotFoundPage} />} />
        </Routes>
      </main>
      {!isChat && <Footer />}
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Router>
              <ScrollRestoration />
              <AuthRedirectHandler />
              <DiscountPopup />
              <AppShell />
            </Router>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
