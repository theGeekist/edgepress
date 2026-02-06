---
title: Architecture Overview
---

# Architecture Overview

EdgePress is a platform-agnostic CMS core that decouples the Gutenberg editor from its legacy PHP roots.

## Core Design Philosophy

The system is designed around one primary constraint: **The core logic must be platform-agnostic.**

This means the "CMS" is not a PHP application, nor is it a Node.js application. It is a set of pure JavaScript domain entities and use-cases that run *anywhere*. We push all platform-specific concerns (Database, File Storage, Caching, HTTP handling) to the very edges of the system using a strict [Ports and Adapters](https://alistair.cockburn.us/hexagonal-architecture/) (Hexagonal) architecture.

## The Stack

### 1. The Core (Domain)
At the center lies the Business Logic. This layer defines what a "Document" is, how a "Revision" is created, and what happens when you "Publish". It has zero dependencies on frameworks or infrastructure.
- **Location**: `packages/domain`

### 2. The Ports (Contracts)
Surrounding the core are the Ports. these are strict interfaces that the Core uses to interact with the outside world. The Core doesn't know *how* to save a file, it just knows it has a `BlobStore` port with a `put()` method.
- **Location**: `packages/ports`

### 3. The Adapters (Infrastructure)
These are the implementations of the Ports. This is where the rubber meets the road.
- **Reference Adapter**: `packages/adapters-cloudflare`. We implement the ports using Cloudflare D1 (Database), R2 (Blob Storage), and KV (Cache).
- **In-Memory Adapter**: `packages/testing`. We also have a full in-memory implementation for lightning-fast tests.

### 4. The Application (Wiring)
Finally, we wire it all together. The `api-edge` application takes the Core, injects the Adapters, and exposes it via a clean REST API.

## Data Model & Invariants

We simplify the WordPress data model to its absolute essentials, optimizing for static publishing:

### Documents & Revisions
- **Documents** are container entities. They hold stable IDs and metadata.
- **Revisions** are where the content lives. Every save creates a new immutable revision. We never mutate content in place.

### The Publishing Pipeline
Publishing in EdgePress is a **Compilation Process**, not a database flag.
1. We take the latest Revision.
2. We compile the Block JSON into static HTML.
3. We generate a **Release Manifest** (a JSON file describing the entire site state).
4. We switch the "Active Release" pointer to the new Manifest.

Result: **The public site is just static files.** No database lookups are required to serve your readers.

## Request Lifecycle

1. **Request**: A request hits `apps/api-edge` (e.g., Cloudflare Worker).
2. **Auth**: The handler verifies the JWT token (stateless auth).
3. **Capabilities**: We check if the user has the `cap_write_document` capability.
4. **Delegate**: The handler calls the Domain logic.
5. **Port Call**: The Domain logic interacts with the `StructuredStore` or `BlobStore` ports.
6. **Response**: The result is returned in a canonical JSON envelope.

## Why this Architecture?

- **Security**: By removing legacy PHP code and SQL query construction from the runtime, we eliminate entire classes of vulnerabilities.
- **Performance**: Static releases mean your site is essentially un-crashable under load.
- **Portability**: Don't like Cloudflare? Write a `packages/adapters-aws` adapter and run the exact same core on Lambda and DynamoDB.
