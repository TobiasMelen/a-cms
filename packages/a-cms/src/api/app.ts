import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { PageReference } from "../data/types";
import { schemas } from "virtual:a-cms/templates";
import repository from "../data/repository";
import { getAncestry } from "../routing";
import { sortKeyForPosition } from "../utils/sort-key";
import { EDIT_PREFIX } from "../constants";
import {
  moveSchema,
  saveSchema,
  publishSchema,
  unpublishSchema,
  deleteSchema,
} from "./schemas";

const app = new Hono()
  .post("/move", zValidator("json", moveSchema), async (c) => {
    const { id, parentId, beforeId, afterId } = c.req.valid("json");

    const pages = await repository.getAll(process.cwd());
    const newParent = (parentId ?? null) as PageReference | null;
    const byContentId = new Map(pages.map((p) => [p.contentId, p]));
    const parentPage = newParent ? byContentId.get(newParent) : undefined;
    const parentAncestry = parentPage ? getAncestry(parentPage, byContentId) : [];

    if (parentAncestry.some((p) => p.contentId === id)) {
      return c.json(
        { error: "cannot move page under itself or a descendant" },
        400,
      );
    }

    const siblings = pages
      .filter((p) => p.parent === newParent && p.contentId !== id)
      .sort((a, b) =>
        a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0,
      );

    const sortKey = sortKeyForPosition(siblings, { beforeId, afterId }, (p) => p.contentId);

    await repository.move(process.cwd(), id as PageReference, {
      parentId: newParent,
      sortKey,
    });

    const movedPage = byContentId.get(id as PageReference);
    const segments = [...parentAncestry, ...(movedPage ? [movedPage] : [])]
      .map((p) => p.slug)
      .filter(Boolean);
    const url = EDIT_PREFIX + "/" + segments.join("/");

    return c.json({ ok: true as const, url });
  })
  .post("/save", zValidator("json", saveSchema), async (c) => {
    const { id, templateId, versionId, title, slug, props } = c.req.valid("json");

    const schema = schemas[templateId];
    if (schema) {
      const result = schema.safeParse(props);
      if (!result.success) {
        return c.json({ error: JSON.stringify(result.error.flatten()) }, 400);
      }
    }

    const updates = { title, slug, props: props as Record<string, unknown> };
    const resultVersionId = versionId
      ? await repository.update(process.cwd(), versionId, updates)
      : await repository.create(process.cwd(), id as PageReference, templateId, updates);

    return c.text(resultVersionId);
  })
  .post("/publish", zValidator("json", publishSchema), async (c) => {
    const { versionId, contentId } = c.req.valid("json");

    await repository.publish(process.cwd(), versionId, contentId);

    return c.json({ ok: true as const });
  })
  .post("/unpublish", zValidator("json", unpublishSchema), async (c) => {
    const { versionId } = c.req.valid("json");

    try {
      await repository.unpublish(process.cwd(), versionId);
      return c.json({ ok: true as const });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message === "version not found" ? 404 : 400;
      return c.json({ error: message }, status);
    }
  })
  .post("/delete", zValidator("json", deleteSchema), async (c) => {
    const { versionId } = c.req.valid("json");

    try {
      await repository.deleteVersion(process.cwd(), versionId);
      return c.json({ ok: true as const });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message === "version not found" ? 404 : 400;
      return c.json({ error: message }, status);
    }
  });

export type AppType = typeof app;
export default app;
