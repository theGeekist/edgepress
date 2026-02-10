import http from 'node:http';
import { createInMemoryPlatform } from '@geekist/edgepress/testing';
import { createApiHandler } from './app.js';
import { attachServerHooks } from './hooks-bootstrap.js';

const platform = createInMemoryPlatform();
attachServerHooks(platform);
const handleRequest = createApiHandler(platform);
const port = Number(process.env.PORT || 8787);

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: body.length > 0 ? body : undefined
  });

  const response = await handleRequest(request);
  res.statusCode = response.status;
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }
  const out = Buffer.from(await response.arrayBuffer());
  res.end(out);
});

server.listen(port, () => {
  console.log(`api listening on http://localhost:${port}`);
});
