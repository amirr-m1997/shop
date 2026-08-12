import axios from 'axios';

const API_BASE_URL = '/api';
const SESSION_KEY = 'guest_session_id';
let sessionExpiryDispatched = false;

export const resetSessionExpirySignal = () => {
  sessionExpiryDispatched = false;
};

export const getGuestSessionId = () => localStorage.getItem(SESSION_KEY);

export const setGuestSessionId = (id) => {
  if (id) localStorage.setItem(SESSION_KEY, id);
};

export const clearGuestSessionId = () => localStorage.removeItem(SESSION_KEY);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Authentication uses an HttpOnly cookie; only the guest cart id is readable here.
api.interceptors.request.use((config) => {
  const sessionId = getGuestSessionId();
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  return config;
});

// Persist a guest session id returned by the backend and handle 401 responses
api.interceptors.response.use(
  (response) => {
    const sid = response.headers?.['x-session-id'];
    if (sid) {
      setGuestSessionId(sid);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const pathname = window.location.pathname;
    const isAuthPage = pathname.includes('/login') || pathname.includes('/register') || pathname.includes('/forgot-password') || pathname.includes('/reset-password');

    if (status === 401 && error.config?.authRequired === true) {
      if (!isAuthPage && !sessionExpiryDispatched) {
        sessionExpiryDispatched = true;
        window.dispatchEvent(new CustomEvent('auth:session-expired', {
          detail: { url },
        }));
      }
    } else if (status === 429) {
      // A 429 is a throttle, not an auth failure — never wipe the session.
      // Surface a global event so the app can show a friendly message
      // instead of silently breaking polling.
      const retryAfter = error.response?.headers?.['retry-after'];
      window.dispatchEvent(new CustomEvent('api:throttled', {
        detail: { url, retryAfter: retryAfter ? Number(retryAfter) : null },
      }));
    }
    return Promise.reject(error);
  }
);

export default api;

// Products API
export const productsAPI = {
  getProducts: (params, config = {}) => api.get('/products/products/', { ...config, params }),
  getProduct: (slug, config = {}) => api.get(`/products/products/${slug}/`, config),
  getCategories: (config = {}) => api.get('/products/categories/', config),
  getBrands: (config = {}) => api.get('/products/brands/', config),
  getColors: (config = {}) => api.get('/products/colors/', config),
  getSizes: (config = {}) => api.get('/products/sizes/', config),
  getFabrics: (config = {}) => api.get('/products/fabrics/', config),
  getReviews: (productId) => api.get(`/products/reviews/?product=${productId}`),
  submitReview: (data) => api.post('/products/reviews/', data),
  getSizeGuide: (categoryId) => api.get(`/products/size-guides/?category=${categoryId}`),
  getSizeRecommendation: (data) => api.post('/products/size-recommendation/', data),
  getMeasurementGuide: (params) => api.get('/products/measurement-guide/', { params }),
  getHomepageSections: () => api.get('/products/homepage-sections/'),
  getBanners: () => api.get('/products/banners/'),
  getStyles: () => api.get('/products/styles/'),
  getStyle: (slug) => api.get(`/products/styles/${slug}/`),
  getRecommendations: (params) => api.get('/products/recommendations/', { params }),
  getMaxPrice: (config = {}) => api.get('/products/max-price/', config),
  // Wishlist
  getWishlist: () => api.get('/products/wishlist/'),
  addToWishlist: (productId) => api.post('/products/wishlist/', { product_id: productId }),
  removeFromWishlist: (wishlistId) => api.delete(`/products/wishlist/${wishlistId}/`),
};

export const pagesAPI = {
  getFaq: () => api.get('/pages/faq/'),
  getContactInfo: (config = {}) => api.get('/pages/contact-info/', config),
  sendMessage: (data) => api.post('/pages/contact-messages/', data),
  getLookbook: (params) => api.get('/pages/lookbook/', { params }),
  getSettings: () => api.get('/pages/settings/'),
  getTestimonials: () => api.get('/pages/testimonials/'),
  submitTestimonial: (data) => api.post('/pages/testimonials/', data),
  getFeatures: () => api.get('/pages/features/'),
  getAboutStats: () => api.get('/pages/about-stats/'),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart/'),
  addToCart: (data) => api.post('/cart/add_item/', data),
  updateCartItem: (data) => api.put('/cart/update_item/', data),
  removeCartItem: (itemId) => api.delete('/cart/remove_item/', { params: { item_id: itemId } }),
  clearCart: () => api.delete('/cart/clear/'),
  applyCoupon: (code) => api.post('/cart/apply_coupon/', { code }),
};

// Orders API
export const ordersAPI = {
  getOrders: () => api.get('/orders/orders/'),
  getOrder: (id) => api.get(`/orders/orders/${id}/`),
  createOrder: (data) => api.post('/orders/orders/create_order/', data),
  cancelOrder: (id) => api.post(`/orders/orders/${id}/cancel/`),
  getShippingAddresses: () => api.get('/orders/shipping-addresses/'),
  createShippingAddress: (data) => api.post('/orders/shipping-addresses/', data),
  updateShippingAddress: (id, data) => api.put(`/orders/shipping-addresses/${id}/`, data),
  deleteShippingAddress: (id) => api.delete(`/orders/shipping-addresses/${id}/`),
};

// Blog API
export const blogAPI = {
  getPosts: (params) => api.get('/blog/posts/', { params }),
  getPost: (slug) => api.get(`/blog/posts/${encodeURIComponent(slug)}/`),
  getCategories: () => api.get('/blog/categories/'),
};

// Welcome Offer API
export const welcomeOfferAPI = {
  getOffer: () => api.get('/orders/welcome-offer/'),
  claimOffer: () => api.post('/orders/welcome-offer/claim/'),
};

// Home API (aggregated endpoint)
export const homeAPI = {
  getHomeData: () => api.get('/pages/home/'),
};
export const paymentsAPI = {
  initiate: (data) => api.post('/payments/initiate/', data),
  getStatus: (paymentId) => api.get(`/payments/${paymentId}/status/`),
};

// Auth API
export const authAPI = {
  ensureCsrf: () => api.get('/auth/csrf/'),
  login: (data) => api.post('/auth/login/', data),
  register: (data) => api.post('/auth/register/', data),
  guestRegister: (data) => api.post('/auth/guest-register/', data),
  getUser: () => api.get('/auth/user/'),
  updateUser: (data) => {
    // File uploads (avatar) must be sent as multipart/form-data.
    if (data instanceof FormData) {
      return api.put('/auth/user/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.put('/auth/user/', data);
  },
  changePassword: (data) => api.post('/auth/change-password/', data),
  logout: () => api.post('/auth/logout/'),
  passwordReset: (data) => api.post('/auth/password-reset/', data),
  passwordResetConfirm: (data) => api.post('/auth/password-reset-confirm/', data),
  sendVerification: (data) => api.post('/auth/send-verification/', data),
  verifyCode: (data) => api.post('/auth/verify-code/', data),
  getLoginHistory: () => api.get('/auth/login-history/'),
  getAddresses: () => api.get('/auth/addresses/'),
  createAddress: (data) => api.post('/auth/addresses/', data),
  updateAddress: (id, data) => api.put(`/auth/addresses/${id}/`, data),
  deleteAddress: (id) => api.delete(`/auth/addresses/${id}/`),
};

// Chat API (Style Chat / Friend Recommendation)
export const chatAPI = {
  searchUsers: (q) => api.get('/chat/users/search/', { params: { q }, authRequired: true }),
  getConversations: () => api.get('/chat/conversations/', { authRequired: true }),
  getConversation: (id) => api.get(`/chat/conversations/${id}/`, { authRequired: true }),
  createConversation: (data) => api.post('/chat/conversations/', data, { authRequired: true }),
  acceptConversation: (id) => api.post(`/chat/conversations/${id}/accept/`, {}, { authRequired: true }),
  declineConversation: (id) => api.post(`/chat/conversations/${id}/decline/`, {}, { authRequired: true }),
  cancelConversation: (id) => api.post(`/chat/conversations/${id}/cancel/`, {}, { authRequired: true }),
  clearConversation: (id) => api.post(`/chat/conversations/${id}/clear/`, {}, { authRequired: true }),
  blockConversation: (id) => api.post(`/chat/conversations/${id}/block/`, {}, { authRequired: true }),
  unblockConversation: (id) => api.post(`/chat/conversations/${id}/unblock/`, {}, { authRequired: true }),
  getMessages: (conversationId) => api.get(`/chat/conversations/${conversationId}/messages/`, { authRequired: true }),
  sendMessage: (conversationId, data) => api.post(`/chat/conversations/${conversationId}/send_message/`, data, { authRequired: true }),
  sendProduct: (conversationId, data) => api.post(`/chat/conversations/${conversationId}/send_product/`, data, { authRequired: true }),
  markRead: (conversationId) => api.post(`/chat/conversations/${conversationId}/mark_read/`, {}, { authRequired: true }),
  react: (messageId, reaction) => api.post(`/chat/messages/${messageId}/react/`, { reaction }, { authRequired: true }),
  favorite: (messageId) => api.post(`/chat/messages/${messageId}/favorite/`, {}, { authRequired: true }),
  getNotifications: () => api.get('/chat/notifications/', { authRequired: true }),
  getUnreadCount: (config = {}) => api.get('/chat/notifications/unread_count/', { ...config, authRequired: true }),
  markAllNotificationsRead: () => api.post('/chat/notifications/mark_all_read/', {}, { authRequired: true }),
};
