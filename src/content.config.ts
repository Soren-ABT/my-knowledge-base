import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const docsCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([]),
    updated: z.date().optional(),
    category: z.string().optional().default(""),
    pinned: z.boolean().optional().default(false),
  }),
});

const postsCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    published: z.date(),
    updated: z.date().optional(),
    draft: z.boolean().optional().default(false),
    description: z.string().optional().default(""),
    image: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([]),
    category: z.string().optional().default(""),
    pinned: z.boolean().optional().default(false),
  }),
});

export const collections = {
  docs: docsCollection,
  posts: postsCollection,
};
