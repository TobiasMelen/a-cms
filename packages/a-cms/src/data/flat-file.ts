import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { Page, PageReference, ContentRepository } from "./types";
import { CMS_DIR, CONTENT_DIR } from "../constants";
import { uuid } from "../utils/uuid";

async function getAll(root: string, includeUnpublished = false): Promise<Page[]> {
  const contentDir = join(root, CMS_DIR, CONTENT_DIR);
  const pages: Page[] = [];
  const templateDirs = await readdir(contentDir, { withFileTypes: true });

  for (const dir of templateDirs) {
    if (!dir.isDirectory()) continue;
    const files = await readdir(join(contentDir, dir.name));
    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = join(contentDir, dir.name, file);
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      // Skip unpublished versions unless explicitly requested
      if (!data.published && !includeUnpublished) continue;

      pages.push({
        versionId: data.versionId,
        contentId: data.contentId as PageReference,
        name: data.name,
        slug: data.slug,
        sortKey: data.sortKey,
        templateId: dir.name,
        parent: (data.parentId ?? null) as PageReference | null,
        children: [],
        props: data.props ?? {},
        draft: !data.published,
        published: data.published,
        created: data.created,
        updated: data.updated,
        publishedDate: data.publishedDate ?? null,
      });
    }
  }

  // Sort pages by sortKey so children arrays are ordered
  pages.sort((a, b) => a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0);

  for (const page of pages) {
    if (page.parent) {
      const parent = pages.find((p) => p.contentId === page.parent);
      if (parent) parent.children.push(page.contentId);
    }
  }

  return pages;
}

async function getLatestDraft(root: string, contentId: PageReference): Promise<Page | null> {
  const allPages = await getAll(root, true);
  const drafts = allPages.filter((p) => p.contentId === contentId && !p.published && !p.publishedDate);

  if (drafts.length === 0) return null;

  // Sort by updated timestamp descending, return most recent
  drafts.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
  return drafts[0];
}

async function getPublishedVersion(root: string, contentId: PageReference): Promise<Page | null> {
  const allPages = await getAll(root, true);
  const versions = allPages.filter((p) => p.contentId === contentId);
  // Prefer currently published, fall back to previously published (has publishedDate)
  return versions.find((p) => p.published) ?? versions.find((p) => p.publishedDate) ?? null;
}

async function getByVersionId(root: string, versionId: string): Promise<Page | null> {
  const allPages = await getAll(root, true);
  return allPages.find((p) => p.versionId === versionId) ?? null;
}

async function getAllVersions(root: string, contentId: PageReference): Promise<Page[]> {
  const allPages = await getAll(root, true);
  const versions = allPages.filter((p) => p.contentId === contentId);
  versions.sort((a, b) => {
    const aDate = a.publishedDate ?? a.updated;
    const bDate = b.publishedDate ?? b.updated;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
  return versions;
}

async function move(
  root: string,
  contentId: PageReference,
  updates: { parentId?: PageReference | null; sortKey?: string },
): Promise<void> {
  const contentDir = join(root, CMS_DIR, CONTENT_DIR);
  const templateDirs = await readdir(contentDir, { withFileTypes: true });
  const timestamp = new Date().toISOString();

  for (const dir of templateDirs) {
    if (!dir.isDirectory()) continue;
    const files = await readdir(join(contentDir, dir.name));
    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = join(contentDir, dir.name, file);
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      if (data.contentId === contentId) {
        if ("parentId" in updates) data.parentId = updates.parentId;
        if ("sortKey" in updates) data.sortKey = updates.sortKey;
        data.updated = timestamp;
        await writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
      }
    }
  }
}

async function update(
  root: string,
  versionId: string,
  updates: { props?: Record<string, unknown>; title?: string; slug?: string },
): Promise<string> {
  const contentDir = join(root, CMS_DIR, CONTENT_DIR);
  const timestamp = new Date().toISOString();
  const templateDirs = await readdir(contentDir, { withFileTypes: true });

  for (const dir of templateDirs) {
    if (!dir.isDirectory()) continue;
    const files = await readdir(join(contentDir, dir.name));
    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = join(contentDir, dir.name, file);
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      if (data.versionId === versionId) {
        if (data.publishedDate) {
          throw new Error(`a-cms: cannot update published version "${versionId}"`);
        }
        if (updates.props) data.props = { ...data.props, ...updates.props };
        if (updates.title !== undefined) data.name = updates.title;
        if (updates.slug !== undefined) data.slug = updates.slug;
        data.updated = timestamp;
        await writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
        return versionId;
      }
    }
  }

  throw new Error(`a-cms: version not found for versionId "${versionId}"`);
}

async function create(
  root: string,
  contentId: PageReference,
  templateId: string,
  updates: { props?: Record<string, unknown>; title?: string; slug?: string },
): Promise<string> {
  const contentDir = join(root, CMS_DIR, CONTENT_DIR);
  const timestamp = new Date().toISOString();

  const published = await getPublishedVersion(root, contentId);

  if (!published) {
    throw new Error(`a-cms: page not found for contentId "${contentId}"`);
  }

  const filename = `${published.slug}.${timestamp}.json`;
  const filePath = join(contentDir, templateId, filename);
  const newVersionId = uuid();

  const draftData = {
    versionId: newVersionId,
    contentId,
    name: updates.title ?? published.name,
    slug: updates.slug ?? published.slug,
    sortKey: published.sortKey,
    parentId: published.parent,
    props: { ...published.props, ...updates.props },
    published: false,
    created: timestamp,
    updated: timestamp,
    publishedDate: null,
  };

  await writeFile(filePath, JSON.stringify(draftData, null, 2) + "\n");
  return newVersionId;
}

async function publish(
  root: string,
  versionId: string,
  contentId: string,
): Promise<void> {
  const contentDir = join(root, CMS_DIR, CONTENT_DIR);
  const templateDirs = await readdir(contentDir, { withFileTypes: true });
  const timestamp = new Date().toISOString();

  for (const dir of templateDirs) {
    if (!dir.isDirectory()) continue;
    const files = await readdir(join(contentDir, dir.name));
    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = join(contentDir, dir.name, file);
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      if (data.contentId === contentId) {
        if (data.versionId === versionId) {
          data.published = true;
          data.publishedDate = timestamp;
        } else if (data.published) {
          data.published = false;
        }
        await writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
      }
    }
  }
}

async function unpublish(root: string, versionId: string): Promise<void> {
  const contentDir = join(root, CMS_DIR, CONTENT_DIR);
  const templateDirs = await readdir(contentDir, { withFileTypes: true });

  for (const dir of templateDirs) {
    if (!dir.isDirectory()) continue;
    const files = await readdir(join(contentDir, dir.name));
    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = join(contentDir, dir.name, file);
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      if (data.versionId === versionId) {
        if (!data.published) {
          throw new Error("version is not published");
        }
        data.published = false;
        await writeFile(filePath, JSON.stringify(data, null, 2) + "\n");
        return;
      }
    }
  }

  throw new Error("version not found");
}

async function deleteVersion(root: string, versionId: string): Promise<void> {
  const contentDir = join(root, CMS_DIR, CONTENT_DIR);
  const templateDirs = await readdir(contentDir, { withFileTypes: true });

  for (const dir of templateDirs) {
    if (!dir.isDirectory()) continue;
    const files = await readdir(join(contentDir, dir.name));
    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = join(contentDir, dir.name, file);
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);

      if (data.versionId === versionId) {
        if (data.published) {
          throw new Error("cannot delete published version");
        }
        await unlink(filePath);
        return;
      }
    }
  }

  throw new Error("version not found");
}

const flatFileRepository: ContentRepository = {
  getAll,
  getLatestDraft,
  getPublishedVersion,
  getByVersionId,
  getAllVersions,
  move,
  update,
  create,
  publish,
  unpublish,
  deleteVersion,
};

export default flatFileRepository;
