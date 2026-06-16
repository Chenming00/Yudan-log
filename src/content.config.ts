import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './content/blog',
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    tags: z.preprocess((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
      return [];
    }, z.array(z.string())).default([]),
    cover: z.string().default('/logo.png'),
  }),
});

export const collections = { blog };
