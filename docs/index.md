---
layout: home

hero:
  name: EdgePress
  text: The WordPress Editor, Unshackled.
  tagline: A standalone, edge-first, no-PHP CMS for the future of content.
  image:
    src: /logo.svg
    alt: EdgePress Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View Project Vision
      link: /architecture/overview

features:
  - title: Client-Agnostic
    details: Designed for web-first, with React Native portability as an explicit goal. The backend assumes nothing about the client.
  - title: Edge-First API
    details: A strongly designed API layer with explicit contracts. Deploy to Cloudflare Workers, or any edge runtime.
  - title: Static Releases
    details: Published output is served as static release artifacts. "CMS uptime" is not a serving dependency.
---

<script setup>
import mermaid from 'mermaid'
import { onMounted } from 'vue'

onMounted(async () => {
  mermaid.initialize({ startOnLoad: false })
  await mermaid.run({
    querySelector: '.mermaid'
  })
})
</script>

# The Future of Gutenberg

EdgePress decouples the best block editor in the world from its legacy PHP roots. It provides a clean, modern, and performant platform for building content-rich applications.

## Architecture

This isn't just a headless WordPress. It's a completely reimagined architecture.

```mermaid
flowchart LR
  UI[Editor Clients\nWeb + RN + Desktop] --> DATA[@wordpress/data\nstores + registry]
  DATA --> HOOKS[@wordpress/hooks\nfilters/actions]
  DATA --> APIFETCH[@wordpress/api-fetch\nfetch handler + middleware]
  APIFETCH --> API[(CMS API\nEdge Functions)]
  API --> PORTS[[Ports/Adapters\n(Infra DI Boundary)]]
  PORTS --> DB[(Structured Store\nSQL adapter)]
  PORTS --> BLOBS[(Blob/Artefact Store\nadapter)]
  PORTS --> CACHE[(Cache/Index/Token Store\nadapter)]
  PORTS --> COORD[(Coordination\noptional adapter)]
  API --> RELEASES[(Release pipeline\npublish manifests)]
  RELEASES --> SITE[Static Site\nPages/any host]
```

## Why EdgePress?

### 🚀 Performance
By moving the CMS logic to the edge and serving content as static artifacts, EdgePress delivers sub-millisecond response times for your readers.

### 🛡️ Security
No more SQL injection vulnerabilities or "database surgery". Publish produces immutable releases. Rollback is as simple as switching a pointer.

### 💻 Developer Experience
JS-first core with optional TS tooling for contracts and editor integration. Use the tools you love, like `wrangler` and `bun`.
