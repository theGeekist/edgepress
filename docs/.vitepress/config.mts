import { transformerTwoslash } from "@shikijs/vitepress-twoslash";
import { defineConfig } from "vitepress";

export default defineConfig({
  title: "EdgePress",
  description: "Edge-portable standalone Gutenberg CMS",
  srcDir: ".",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Workflows", link: "/guide/workflows/auth" },
      { text: "Architecture", link: "/architecture/overview" },
      { text: "Reference", link: "/reference/api/" },
      { text: "Appendix", link: "/appendix/idea" },
      { text: "Contributing", link: "/contributing" }
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Repo Tour", link: "/guide/repo-tour" },
            { text: "Concepts", link: "/guide/concepts" },
            { text: "Docs Map", link: "/guide/docs-map" }
          ]
        },
        {
          text: "Workflows",
          items: [
            { text: "Auth", link: "/guide/workflows/auth" },
            { text: "Documents", link: "/guide/workflows/documents" },
            { text: "Media", link: "/guide/workflows/media" },
            { text: "Preview", link: "/guide/workflows/preview" },
            { text: "Publish & Releases", link: "/guide/workflows/publish" },
            { text: "Private Reads", link: "/guide/workflows/private" },
            { text: "Forms", link: "/guide/workflows/forms" }
          ]
        }
      ],
      "/architecture/": [
        {
          text: "Architecture",
          items: [
            { text: "Overview", link: "/architecture/overview" },
            { text: "Block Content Model", link: "/architecture/block-content-model" },
            { text: "Invariants", link: "/architecture/invariants" },
            { text: "Roadmap", link: "/architecture/roadmap" }
          ]
        }
      ],
      "/reference/": [
        {
          text: "API",
          items: [
            { text: "Index", link: "/reference/api/" },
            { text: "Auth", link: "/reference/api/auth" },
            { text: "Documents", link: "/reference/api/documents" },
            { text: "Media", link: "/reference/api/media" },
            { text: "Publish & Releases", link: "/reference/api/publish-and-releases" },
            { text: "Previews & Private", link: "/reference/api/previews-and-private" },
            { text: "Errors & CORS", link: "/reference/api/errors-and-cors" }
          ]
        },
        {
          text: "Code",
          items: [
            { text: "Ports", link: "/reference/ports" },
            { text: "SDK", link: "/reference/sdk" },
            { text: "Contracts", link: "/reference/contracts" }
          ]
        }
      ],
      "/apps/": [
        {
          text: "Apps",
          items: [
            { text: "API Edge", link: "/apps/api" },
            { text: "Admin Web", link: "/apps/admin-web" }
          ]
        }
      ],
      "/adapters/": [
        {
          text: "Adapters",
          items: [{ text: "Cloudflare", link: "/adapters/cloudflare" }]
        }
      ],
      "/development/": [
        {
          text: "Development",
          items: [
            { text: "Boundaries", link: "/development/boundaries" },
            { text: "Testing", link: "/development/testing" },
            { text: "Docs Integrity", link: "/development/docs-integrity" }
          ]
        }
      ],
      "/appendix/": [
        {
          text: "Appendix",
          items: [
            { text: "Idea (raw)", link: "/appendix/idea" },
            { text: "Planning (raw)", link: "/appendix/planning" },
            { text: "Admin README (raw)", link: "/appendix/admin-web-readme" }
          ]
        }
      ]
    },
    search: {
      provider: "local"
    }
  },
  markdown: {
    codeTransformers: [transformerTwoslash()]
  }
});
