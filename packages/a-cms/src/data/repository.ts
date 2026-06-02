import { repositoryContext } from "./context";
import type { ContentRepository, Page, PageReference } from "./types";
import _repoImpl from "a-cms:repository";

export type { PageReference, Page, ContentRepository };

const repoImpl: ContentRepository = _repoImpl;

function getRepository(): ContentRepository {
  return repositoryContext.getStore() ?? repoImpl;
}

const repository: ContentRepository = {
  getAll: (...args) => getRepository().getAll(...args),
  getLatestDraft: (...args) => getRepository().getLatestDraft(...args),
  getPublishedVersion: (...args) => getRepository().getPublishedVersion(...args),
  getByVersionId: (...args) => getRepository().getByVersionId(...args),
  getAllVersions: (...args) => getRepository().getAllVersions(...args),
  move: (...args) => getRepository().move(...args),
  update: (...args) => getRepository().update(...args),
  create: (...args) => getRepository().create(...args),
  publish: (...args) => getRepository().publish(...args),
  unpublish: (...args) => getRepository().unpublish(...args),
  deleteVersion: (...args) => getRepository().deleteVersion(...args),
};

export { repoImpl };
export default repository;
