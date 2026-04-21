import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.BASE_URL || 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/blog', '/ledger'].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const postRoutes = getAllPosts().map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
    images: post.cover ? [`${siteUrl}${post.cover}`] : undefined,
  }));

  return [...staticRoutes, ...postRoutes];
}