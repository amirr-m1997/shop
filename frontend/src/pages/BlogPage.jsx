import React, { useState, useEffect } from 'react';
import { Calendar, User, Clock, Tag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { blogAPI } from '../services/api';
import { formatDate } from '../lib/formatDate';

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('همه');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, catsRes] = await Promise.all([
          blogAPI.getPosts({ is_published: true }),
          blogAPI.getCategories(),
        ]);
        setPosts(postsRes.data.results || postsRes.data || []);
        setCategories(catsRes.data.results || catsRes.data || []);
      } catch (error) {
        console.error('Error fetching blog data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPosts = activeCategory === 'همه'
    ? posts
    : posts.filter(p => p.category_name === activeCategory);

  const featuredPost = posts[0];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="bg-muted/50 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-black mb-4">مجله مد</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            آخرین اخبار، ترندها و نکات مد و فشن را در مجله فروشگاه مد بخوانید
          </p>
        </div>
      </section>

      {featuredPost && (
        <section className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-background rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="relative h-64 md:h-80 overflow-hidden">
              <img src={featuredPost.image} alt={featuredPost.title} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/800x400?text=Blog'; e.target.alt = 'تصویر موجود نیست'; }} />
              <Badge className="absolute top-4 right-4">ویژه</Badge>
            </div>
            <div className="p-6 md:p-8">
              <Badge variant="secondary" className="mb-3">{featuredPost.category_name || 'بدون دسته‌بندی'}</Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{featuredPost.title}</h2>
              <p className="text-muted-foreground mb-4">{featuredPost.excerpt}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><User className="h-4 w-4" /> {featuredPost.author_name || 'تیم مد'}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {formatDate(featuredPost.published_at)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 pb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant={activeCategory === 'همه' ? 'default' : 'outline'} size="sm" onClick={() => setActiveCategory('همه')}>همه</Button>
          {categories.map(cat => (
            <Button key={cat.id} variant={activeCategory === cat.name ? 'default' : 'outline'} size="sm" onClick={() => setActiveCategory(cat.name)}>{cat.name}</Button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map(post => (
            <div key={post.id} className="group block">
              <div className="bg-background rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
                <div className="relative h-48 overflow-hidden">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Blog'; e.target.alt = 'تصویر موجود نیست'; }} />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 ml-1" />
                      {post.category_name || 'بدون دسته‌بندی'}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {post.author_name || 'تیم مد'}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(post.published_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredPosts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">مقاله‌ای یافت نشد</div>
        )}
      </section>
    </div>
  );
};

export default BlogPage;
