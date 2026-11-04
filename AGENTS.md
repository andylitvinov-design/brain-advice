<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


## Mandatory GLOBAL_PR_ONE_PUBLISH_V1 (all project PRs)

Before any code, branch update, or PR publication, first read https://raw.githubusercontent.com/andylitvinov-design/ai-projects-brain/main/systems/pr-one-publish-standard.md . Prepare all coherent code/tests/docs and local validation before the **first remote push**, because even unopened branch pushes may trigger GitHub Actions or a paid Vercel preview. Publish one complete HEAD and open one PR; do not update it during required CI, except for a verified failure or urgent safety repair. No per-file remote push storms, no no-op commits, no new paid services and no bypass of existing Next.js/project security and release gates.
