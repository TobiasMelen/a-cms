# a-cms

Astro integration plugin for a CMS. Monorepo: `packages/a-cms` (the plugin), `sandbox` (dev app).

## Architecture

- Routing is data-driven, not file-based. Pages form a tree via `id`/`parentId`. URLs resolve root-down: `/grandparent/parent/page`.
- Data access goes through an abstraction layer to support multiple backends (flat file, SQL, maybe git).
- Uses Astro features like collections heavily.

## Data Access Rules

- **For content operations (pages, versions, etc.), NEVER directly access any storage backend**
- No filesystem calls (readdir, readFile, writeFile, unlink, etc.)
- No SQL queries (SELECT, INSERT, UPDATE, DELETE, etc.)
- No HTTP fetches to content APIs
- **ALL content operations MUST go through the repository abstraction** (`src/data/repository.ts`)
- The repository is the ONLY place that knows about storage implementation
- If you need a new content operation, add it to the repository interface and implement it in each backend

## Rules

- Minimal LOC. No OOP. As few abstractions as possible — only abstract where backends demand it.
- **Package isolation**: The package MUST NOT affect the consumer app's build config, import resolution, or Vite/Astro settings. All package internals (path aliases like `~/`, TypeScript paths, etc.) must be resolved during package compilation, NOT in the consumer's build process. The package will be compiled/bundled later to handle this properly.
- **No dev servers or builds**: The developer handles running `astro dev`, builds, and restarts. Do not start or stop dev servers, do not run builds.

## Code Quality Standards

- **Read before writing**: ALWAYS read existing code first. Match existing patterns exactly.
- **Zero redundancy**: If you're writing similar code twice, you're doing it wrong. Create a helper immediately.
- **No defensive coding**: Don't check for things that can't happen. Trust the type system and internal contracts.
- **No wrappers**: If a function just calls another function, delete it and call directly.
- **Minimal variable lifetime**: Declare variables as late as possible, in the smallest scope needed.
- **Single pass**: If you're iterating data twice, you're doing it wrong. Redesign to use one pass.
- **No premature abstraction**: Don't create helpers for hypothetical future use. Only abstract when you have duplication.
- **Function parameters over state**: Pass data explicitly rather than relying on broader scope when it makes the code clearer.
