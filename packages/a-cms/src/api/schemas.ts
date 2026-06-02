import { z } from "zod";

export const moveSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable().optional(),
  beforeId: z.string().optional(),
  afterId: z.string().optional(),
});

export const saveSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  versionId: z.string().optional(),
  title: z.string(),
  slug: z.string(),
  props: z.unknown(),
});

export const publishSchema = z.object({
  versionId: z.string(),
  contentId: z.string(),
});

export const unpublishSchema = z.object({
  versionId: z.string(),
});

export const deleteSchema = z.object({
  versionId: z.string(),
});

export const errorSchema = z.object({
  error: z.string(),
});

export const successSchema = z.object({
  ok: z.literal(true),
});
