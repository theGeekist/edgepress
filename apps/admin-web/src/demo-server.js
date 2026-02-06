import http from 'node:http';
import { createInMemoryPlatform } from '../../../packages/testing/src/inMemoryPlatform.js';
import { createApiHandler } from '../../api-edge/src/app.js';
import { attachServerHooks } from '../../api-edge/src/hooks-bootstrap.js';
import { createAdminShell } from './features/editor';

const platform = createInMemoryPlatform();
attachServerHooks(platform);
const apiHandler = createApiHandler(platform);
const apiPort = Number(process.env.API_PORT || 8787);

const apiServer = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  const request = new Request(`http://localhost:${apiPort}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: body.length > 0 ? body : undefined
  });

  const response = await apiHandler(request);
  res.statusCode = response.status;
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }
  const out = Buffer.from(await response.arrayBuffer());
  res.end(out);
});

apiServer.listen(apiPort, async () => {
  const shell = createAdminShell({ baseUrl: `http://localhost:${apiPort}` });
  await shell.login('admin', 'admin');
  await shell.createDocument({ title: 'Demo', content: '<p>hello</p>' });
  const docs = await shell.listDocuments();
  console.log(`admin-web shell demo ready; docs=${docs.items.length}`);
});
