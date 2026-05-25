import type { APIRoute } from "astro";
import type { PageReference } from "../../data/repository";
import { schemas } from "virtual:a-cms/templates";
import { update } from "../../data/flat-file";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const { id, templateId, props } = await request.json();

  if (!id || !templateId) {
    return new Response(JSON.stringify({ error: "id and templateId are required" }), { status: 400 });
  }

  const schema = schemas[templateId];
  if (schema) {
    const result = schema.safeParse(props);
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error.flatten() }), { status: 400 });
    }
  }

  await update(process.cwd(), id as PageReference, { props });

  const { refreshCache } = await import("../../cache");
  await refreshCache(process.cwd());

  return new Response(JSON.stringify({ ok: true }));
};
