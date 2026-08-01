import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { Badge } from './ui/Badge';
import { formatDate } from '../lib/formatDate';

const HomeBlogSection = ({ posts = [] }) => {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-8 sm:py-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 rounded-full bg-cyan-500" />
            <h2 className="text-xl sm:text-2xl font-bold">مجله مد</h2>
          </div>
          <Link
            to="/blog"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            مشاهده همه <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.slice(0, 3).map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="group block bg-background rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative h-44 overflow-hidden bg-muted">
                <img
                  src={post.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=500&fit=crop'}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                {post.category_name && (
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {post.category_name}
                  </Badge>
                )}
                <h3 className="font-bold text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {post.author_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.author_name}
                    </span>
                  )}
                  {post.published_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(post.published_at)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeBlogSection;
