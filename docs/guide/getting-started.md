---
title: Getting Started
---

# Welcome to EdgePress

Ready to experience the future of content management? Let's get your local environment set up.

## Prerequisites

- **Bun**: This project uses [Bun](https://bun.sh) for fast dependency management and testing.
- **Node.js**: (Optional) If you prefer using Node for some tools, though Bun is the primary runtime.

## Installation

Clone the repository and install dependencies with a single command:

```sh
bun install
```

## Running the Development Environment

EdgePress consists of two main parts: the **API** (backend) and the **Admin Interface** (frontend). You can run them separately or together.

### 1. Start the API Server

This spins up the core CMS logic. By default, it runs on port `3000`.

```sh
bun run start:api
```

> [!TIP]
> **Admin Access**
>
> On first run, the system is secure by default (no admin).
>
> To bootstrap a local admin user for testing, set `EDGE_BOOTSTRAP_ADMIN=1` or check `packages/testing` for in-memory defaults.

### 2. Start the Admin Interface

In a new terminal, launch the diverse block editor admin shell.

```sh
bun run dev:admin
```

Open your browser to the URL provided (usually `http://localhost:5173`) to start exploring.

## Deployment Preview (Cloudflare Workers)

To see how EdgePress runs in a production-like environment on Cloudflare Workers, use the wrapper script:

```sh
# Setup environment variables
cp .dev.vars.example .dev.vars

# Run locally with Wrangler
bunx wrangler dev --local
```

## Next Steps

- **[Explore Workflows](/guide/workflows/auth)**: Learn how authentication and publishing work.
- **[Architecture Deep Dive](/architecture/overview)**: Understand the "No-PHP" philosophy.
- **[API Reference](/reference/api/)**: Build your own custom frontend against our strong contracts.
