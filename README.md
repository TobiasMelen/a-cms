# a cms

I'm doing a Astro based headfull CMS, it's going to be great and finished for sure.
The actual thing is in `packages/a-cms` and `sandbox` is the implementing project

Idea is that it's page-tree based, with choice inbetween flat-file/git or db based storage and that syntax will be single-file per page like this kind of:

```astro templates/articlePage.astro
---
import { z } from "zod";
import { Layout } from '../Layout.astro'

// Defines the schema for edit ui
export const pageProps = z.object({
  title: z.string(),
  body: z.string().optional(),
});

// Pages from tree gets auto routed and supplied page instance as props.
const { page } = Astro.props;
---
<Layout page={page}>
    <h1>{page.props.title}</h1>
    <p>{page.props.body}</p>
</Layout>
```