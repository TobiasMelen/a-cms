import type { APIRoute } from "astro";
import type { PageReference } from "../../data/repository";
import { getAll, update } from "../../data/flat-file";
import { sortKeyBetween } from "../../utils";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const { id, parentId, beforeId, afterId } = await request.json();

  if (!id) {
    return new Response(JSON.stringify({ error: "id is required" }), { status: 400 });
  }

  const pages = await getAll(process.cwd());
  const newParent = (parentId ?? null) as PageReference | null;

  // Find siblings in the target parent (excluding the moved page)
  const siblings = pages
    .filter((p) => p.parent === newParent && p.id !== id)
    .sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));

  let sortKey: string;

  if (beforeId) {
    const before = siblings.find((p) => p.id === beforeId);
    const idx = before ? siblings.indexOf(before) : -1;
    const prev = idx > 0 ? siblings[idx - 1] : null;
    sortKey = sortKeyBetween(prev?.sortKey ?? null, before?.sortKey ?? null);
  } else if (afterId) {
    const after = siblings.find((p) => p.id === afterId);
    const idx = after ? siblings.indexOf(after) : -1;
    const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
    sortKey = sortKeyBetween(after?.sortKey ?? null, next?.sortKey ?? null);
  } else {
    // No position specified — append to end
    const last = siblings.length > 0 ? siblings[siblings.length - 1] : null;
    sortKey = sortKeyBetween(last?.sortKey ?? null, null);
  }

  await update(process.cwd(), id as PageReference, { parentId: newParent, sortKey });

  const { refreshCache } = await import("../../cache");
  await refreshCache(process.cwd());

  return new Response(JSON.stringify({ ok: true }));
};
