import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const port = Number(process.env.WRANGLER_SMOKE_PORT || 8788);
const baseUrl = `http://127.0.0.1:${port}`;

function loadDevVars() {
  if (!existsSync('.dev.vars')) return;
  const lines = readFileSync('.dev.vars', 'utf8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const splitAt = line.indexOf('=');
    if (splitAt <= 0) continue;
    const key = line.slice(0, splitAt).trim();
    const value = line.slice(splitAt + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDevVars();

const user = process.env.GCMS_ADMIN_USER || process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin';
const pass = process.env.GCMS_ADMIN_PASS || process.env.BOOTSTRAP_ADMIN_PASSWORD;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  return { res, body };
}

async function waitForServer(maxAttempts = 120) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      await fetch(`${baseUrl}/`);
      return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error('wrangler dev did not become ready');
}

async function runSmoke() {
  const auth = await request('/v1/auth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass })
  });
  assert(auth.res.status === 200, `auth failed: ${auth.res.status}`);
  const token = auth.body?.accessToken;
  assert(token, 'missing accessToken');

  const created = await request('/v1/documents', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'Wrangler Integration', content: '<p>smoke</p>' })
  });
  assert(created.res.status === 201, `document create failed: ${created.res.status}`);
  const documentId = created.body?.document?.id;
  assert(documentId, 'missing document id');

  const updated = await request(`/v1/documents/${encodeURIComponent(documentId)}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'Wrangler Integration v2', content: '<p>smoke-v2</p>' })
  });
  assert(updated.res.status === 200, `document update failed: ${updated.res.status}`);

  const revisions = await request(`/v1/documents/${encodeURIComponent(documentId)}/revisions`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(revisions.res.status === 200, `revisions fetch failed: ${revisions.res.status}`);
  assert(Array.isArray(revisions.body?.items) && revisions.body.items.length >= 2, 'expected at least two revisions');

  const publish = await request('/v1/publish', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({})
  });
  assert(publish.res.status === 201, `publish failed: ${publish.res.status}`);
  const jobId = publish.body?.job?.id;
  const firstReleaseId = publish.body?.job?.releaseId;
  assert(jobId, 'missing publish job id');
  assert(firstReleaseId, 'missing first publish release id');

  const publishJob = await request(`/v1/publish/${encodeURIComponent(jobId)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(publishJob.res.status === 200, `publish job fetch failed: ${publishJob.res.status}`);
  assert(publishJob.body?.job?.status === 'completed', `publish job not completed: ${publishJob.body?.job?.status}`);

  const updatedAgain = await request(`/v1/documents/${encodeURIComponent(documentId)}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'Wrangler Integration v3', content: '<p>smoke-v3</p>' })
  });
  assert(updatedAgain.res.status === 200, `second document update failed: ${updatedAgain.res.status}`);

  const publish2 = await request('/v1/publish', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({})
  });
  assert(publish2.res.status === 201, `second publish failed: ${publish2.res.status}`);
  const releaseId = publish2.body?.job?.releaseId;
  assert(releaseId, 'missing second publish release id');
  assert(releaseId !== firstReleaseId, 'expected second publish to generate new release id');

  const activate = await request(`/v1/releases/${encodeURIComponent(releaseId)}/activate`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` }
  });
  assert(activate.res.status === 200, `release activate failed: ${activate.res.status}`);

  const privateFirst = await request(`/v1/private/${encodeURIComponent(documentId)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(privateFirst.res.status === 200, `private first read failed: ${privateFirst.res.status}`);
  assert(
    ['miss', 'hit', 'bypass'].includes(privateFirst.body?.cache),
    `unexpected private cache state: ${privateFirst.body?.cache}`
  );
  assert(privateFirst.body?.releaseId === releaseId, 'private read should use activated release');

  const privateSecond = await request(`/v1/private/${encodeURIComponent(documentId)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(privateSecond.res.status === 200, `private second read failed: ${privateSecond.res.status}`);
  assert(
    ['miss', 'hit', 'bypass'].includes(privateSecond.body?.cache),
    `unexpected private cache state: ${privateSecond.body?.cache}`
  );

  const preview = await request(`/v1/preview/${encodeURIComponent(documentId)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(preview.res.status === 200, `preview token create failed: ${preview.res.status}`);
  const previewUrl = preview.body?.previewUrl;
  assert(typeof previewUrl === 'string' && previewUrl.includes('/preview/'), 'missing previewUrl');

  const previewHtml = await request(previewUrl);
  assert(previewHtml.res.status === 200, `preview read failed: ${previewHtml.res.status}`);
  assert(typeof previewHtml.body === 'string' && previewHtml.body.includes('<html'), 'preview did not return HTML');

  const tamperedPreview = await request(`${previewUrl.split('?')[0]}?sig=bad_signature`);
  assert(tamperedPreview.res.status === 401, `tampered preview should be 401, got ${tamperedPreview.res.status}`);

  const releases = await request('/v1/releases', {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(releases.res.status === 200, `releases fetch failed: ${releases.res.status}`);
  assert(Array.isArray(releases.body?.items), 'releases items should be an array');
  assert(typeof releases.body?.activeRelease === 'string' && releases.body.activeRelease.length > 0, 'missing activeRelease');

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'local',
        documentId,
        publishJobId: jobId,
        releaseId,
        activeRelease: releases.body.activeRelease
      },
      null,
      2
    )
  );
}

const child = spawn('bunx', ['wrangler', 'dev', '--local', '--port', String(port)], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe']
});

let logs = '';
child.stdout.on('data', (chunk) => {
  logs += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  logs += chunk.toString();
});

async function shutdown() {
  if (!child.killed) {
    child.kill('SIGTERM');
    await sleep(400);
    if (!child.killed) child.kill('SIGKILL');
  }
}

try {
  assert(Boolean(pass), 'missing admin password: set GCMS_ADMIN_PASS or BOOTSTRAP_ADMIN_PASSWORD (.dev.vars)');
  await waitForServer();
  await runSmoke();
  await shutdown();
} catch (error) {
  await shutdown();
  console.error('wrangler local smoke failed');
  console.error(String(error?.message || error));
  console.error(logs.slice(-4000));
  process.exit(1);
}
