import { defineCollection, z } from 'astro:content';

const tappeCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    order: z.number().min(1).max(12),
    description: z.string(),
    heroImage: z.string().optional(),
    gallery: z.array(z.object({
      image: z.string(),
      caption: z.string(),
      alt: z.string(),
    })).optional(),
    podcast: z.object({
      episodeTitle: z.string().optional(),
      spotifyUrl: z.string().optional(),
      applePodcastsUrl: z.string().optional(),
      mp3File: z.string().optional(),
      videoFile: z.string().optional(),
      duration: z.string().optional(),
    }).optional(),
    details: z.string().optional(),
    directions: z.object({
      address: z.string(),
      coordinates: z.string().optional(),
      // Per-mode directions (markdown). The detail page builds a segmented
      // selector from whichever of these are present.
      byFoot: z.string().optional(),     // A piedi 🚶
      byBike: z.string().optional(),     // In bici 🚴
      byCar: z.string().optional(),      // In auto 🚗
      byTransit: z.string().optional(),  // Mezzi pubblici (bus/treno) 🚌
      // Legacy single blob — kept as a fallback for content not yet split.
      instructions: z.string().optional(),
      mapsUrl: z.string().optional(),
    }).optional(),
    transcript: z.string().optional(),
    published: z.boolean().default(true),
  }),
});

const pagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    heroImage: z.string().optional(),
    intro: z.string().optional(),
    team: z.array(z.object({
      name: z.string(),
      role: z.string().optional(),
      photo: z.string().optional(),
      bio: z.string().optional(),
    })).optional(),
    contacts: z.object({
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      social: z.array(z.object({
        platform: z.string(),
        url: z.string(),
      })).optional(),
    }).optional(),
  }),
});

export const collections = {
  tappe: tappeCollection,
  pages: pagesCollection,
};
