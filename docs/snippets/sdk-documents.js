import { createClient } from "../../packages/sdk/src/client.js";

let accessToken = "<accessToken>";

const client = createClient({
  baseUrl: "http://localhost:8787",
  getAccessToken: () => accessToken
});

const created = await client.createDocument({ title: "Hello", content: "<p>world</p>" });
const docId = created.document.id;

await client.updateDocument(docId, { title: "Hello 2" });

await client.listDocuments();
await client.listRevisions(docId);
