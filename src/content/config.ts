import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.coerce.date(),
    draft: z.boolean().optional(),
	}),
});

const project = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.coerce.date(),
    draft: z.boolean().optional(),
    url: z.string(),
	}),
});

export const collections = { blog, project };
