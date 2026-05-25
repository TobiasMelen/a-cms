# a-cms

Astro integration plugin for a CMS. Monorepo: `packages/a-cms` (the plugin), `sandbox` (dev app).

## Architecture

- Routing is data-driven, not file-based. Pages form a tree via `id`/`parentId`. URLs resolve root-down: `/grandparent/parent/page`.
- Data access goes through an abstraction layer to support multiple backends (flat file, SQL, maybe git).
- Uses Astro features like collections heavily.

## Rules

- Minimal LOC. No OOP. As few abstractions as possible — only abstract where backends demand it.
