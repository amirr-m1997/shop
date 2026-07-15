# Fashion E-Commerce Store

A modern, clean, minimalist e-commerce website for a clothing brand built with Django (backend) and React (frontend).

## Features

### Core Features
- **Homepage**: Hero section with high-quality banner, CTAs, New Arrivals, Trending Now, and category grid
- **Navigation**: Minimal sticky header, multi-level mega menu, search with auto-suggestions, cart icon, user profile
- **Product Filtering**: Advanced sidebar filters (size, color, price, brand, fabric, rating)
- **Product Detail Page**: High-res image gallery/zoom, size guide, Add to Cart/Buy Now, recommended products
- **Checkout**: Seamless 3-step checkout (Cart, Shipping, Payment)

### Advanced Features
- **Size Finder Quiz**: Interactive quiz to help customers find their perfect size
- **Lookbook Section**: Minimal lookbook for outfit inspiration
- **Instagram Feed**: Integration at footer
- **Dark/Light Mode**: Toggle for modern user experience

## Tech Stack

### Backend
- Django 4.2.7
- Django REST Framework
- Django CORS Headers
- Pillow (image handling)

### Frontend
- React 18
- TailwindCSS
- shadcn/ui components
- Lucide icons

## Color Palette

### Light Mode
- **Primary**: #1a1a1a (Black)
- **Secondary**: #f5f5f5 (Light Gray)
- **Accent**: #c9a227 (Gold)
- **Background**: #ffffff (White)
- **Text**: #1a1a1a (Black)
- **Muted**: #666666 (Gray)

### Dark Mode
- **Primary**: #ffffff (White)
- **Secondary**: #2a2a2a (Dark Gray)
- **Accent**: #c9a227 (Gold)
- **Background**: #1a1a1a (Black)
- **Text**: #ffffff (White)
- **Muted**: #a0a0a0 (Light Gray)

## Project Structure

```
shop/
├── backend/                 # Django backend
│   ├── manage.py
│   ├── shop/               # Main Django project
│   ├── products/           # Products app
│   ├── cart/               # Shopping cart app
│   ├── orders/             # Orders app
│   └── users/              # User management app
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
└── requirements.txt
```

## Setup Instructions

**IMPORTANT: PowerShell Execution Policy**

You may encounter PowerShell execution policy errors when running npm commands. To fix this:

```powershell
# Run PowerShell as Administrator and execute:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Backend Setup

1. **Install Python Dependencies**
```bash
cd backend
pip install -r ../requirements.txt
```

2. **Run Migrations**
```bash
python manage.py migrate
```

3. **Create Superuser**
```bash
python manage.py createsuperuser
```

4. **Run Development Server**
```bash
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Install Node.js Dependencies**
```bash
cd frontend
npm install
```

2. **Run Development Server**
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Products API
- `GET /api/products/products/` - List all products
- `GET /api/products/products/:id/` - Get product details
- `GET /api/products/categories/` - List categories
- `GET /api/products/brands/` - List brands
- `GET /api/products/colors/` - List colors
- `GET /api/products/sizes/` - List sizes
- `GET /api/products/fabrics/` - List fabrics
- `GET /api/products/reviews/` - List reviews
- `GET /api/products/size-guides/` - Get size guides

### Cart API
- `GET /api/cart/cart/` - Get user's cart
- `POST /api/cart/cart/add_item/` - Add item to cart
- `PUT /api/cart/cart/update_item/` - Update cart item
- `DELETE /api/cart/cart/remove_item/` - Remove item from cart
- `DELETE /api/cart/cart/clear/` - Clear cart

### Orders API
- `GET /api/orders/orders/` - List user's orders
- `POST /api/orders/orders/create_order/` - Create new order
- `GET /api/orders/shipping-addresses/` - List shipping addresses
- `POST /api/orders/shipping-addresses/` - Create shipping address

## Admin Panel

Access the Django admin panel at `http://localhost:8000/admin` to manage:
- Products and variants
- Categories and brands
- Orders and shipping
- Reviews and ratings

## Wireframe Layout

### Homepage
1. **Header** (Sticky)
   - Logo (left)
   - Mega Menu (center)
   - Search, Cart, Profile, Dark Mode (right)

2. **Hero Section**
   - Full-width banner image
   - Headline text overlay
   - CTA buttons (Shop Now, New Arrivals)

3. **Category Grid**
   - 3-column grid (Men, Women, Kids)
   - Category images with hover effects

4. **New Arrivals**
   - Horizontal scroll or grid
   - Product cards with quick view

5. **Trending Now**
   - Featured products
   - Best sellers highlight

6. **Lookbook Section**
   - Minimal grid of outfit photos
   - Shop the look buttons

7. **Instagram Feed**
   - Grid of Instagram posts
   - Follow button

8. **Footer**
   - Newsletter signup
   - Links (About, Contact, FAQ)
   - Social media icons

### Product Listing Page
1. **Sidebar Filters**
   - Categories
   - Size checkboxes
   - Color swatches
   - Price range slider
   - Brand checkboxes
   - Fabric checkboxes
   - Rating stars

2. **Product Grid**
   - Sort dropdown
   - Product cards with:
     - Image
     - Name
     - Price
     - Quick add to cart
     - Wishlist button

### Product Detail Page
1. **Image Gallery**
   - Main image with zoom
   - Thumbnail gallery
   - Image switcher

2. **Product Info**
   - Title
   - Price
   - Rating
   - Size selector
   - Color selector
   - Quantity
   - Add to Cart / Buy Now buttons
   - Size Guide popup
   - Product description
   - Fabric details

3. **Recommended Products**
   - "Complete the Look" section
   - Related products

### Checkout Flow
1. **Step 1: Cart**
   - Cart items list
   - Quantity adjustments
   - Remove items
   - Subtotal, shipping, total

2. **Step 2: Shipping**
   - Shipping address form
   - Shipping method selection

3. **Step 3: Payment**
   - Payment method selection
   - Card details form
   - Order summary
   - Place Order button
