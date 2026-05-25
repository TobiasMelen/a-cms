import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getAll } from "./data/flat-file";
import { CACHE_DIR, CACHE_FILE } from "./constants";

export async function refreshCache(root: string): Promise<void> {
  const pages = await getAll(root);
  const cacheDir = join(root, CACHE_DIR);
  await mkdir(cacheDir, { recursive: true });
  await writeFile(join(cacheDir, CACHE_FILE), JSON.stringify(pages));
}
