const baseUrl = process.env.GCMS_BASE_URL;
const user = process.env.GCMS_ADMIN_USER || 'admin';
const pass = process.env.GCMS_ADMIN_PASS || 'admin';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  return { res, body };
}

if (!baseUrl) {
  console.error('GCMS_BASE_URL is required, e.g. https://gcms-api-edge.<subdomain>.workers.dev');
  process.exit(1);
}

try {
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
    body: JSON.stringify({ title: 'Deployed Wrangler Integration', content: '<p>deployed smoke</p>' })
  });
  assert(created.res.status === 201, `document create failed: ${created.res.status}`);
  const documentId = created.body?.document?.id;
  assert(documentId, 'missing document id');

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
  const releaseId = publish.body?.job?.releaseId;
  assert(jobId, 'missing publish job id');
  assert(releaseId, 'missing publish release id');

  const publishJob = await request(`/v1/publish/${encodeURIComponent(jobId)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(publishJob.res.status === 200, `publish job fetch failed: ${publishJob.res.status}`);
  assert(publishJob.body?.job?.status === 'completed', `publish job not completed: ${publishJob.body?.job?.status}`);

  const activate = await request(`/v1/releases/${encodeURIComponent(releaseId)}/activate`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` }
  });
  assert(activate.res.status === 200, `release activate failed: ${activate.res.status}`);

  const privateFirst = await request(`/v1/private/${encodeURIComponent(documentId)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(privateFirst.res.status === 200, `private first read failed: ${privateFirst.res.status}`);

  const preview = await request(`/v1/preview/${encodeURIComponent(documentId)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(preview.res.status === 200, `preview token create failed: ${preview.res.status}`);
  const previewUrl = preview.body?.previewUrl;
  assert(typeof previewUrl === 'string', 'missing previewUrl');

  const previewHtml = await request(previewUrl);
  assert(previewHtml.res.status === 200, `preview read failed: ${previewHtml.res.status}`);
  const tamperedPreview = await request(`${previewUrl.split('?')[0]}?sig=bad_signature`);
  assert(tamperedPreview.res.status === 401, `tampered preview should be 401, got ${tamperedPreview.res.status}`);

  const releases = await request('/v1/releases', {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(releases.res.status === 200, `releases fetch failed: ${releases.res.status}`);
  assert(typeof releases.body?.activeRelease === 'string' && releases.body.activeRelease.length > 0, 'missing activeRelease');

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'deployed',
        baseUrl,
        documentId,
        publishJobId: jobId,
        releaseId,
        activeRelease: releases.body.activeRelease
      },
      null,
      2
    )
  );
} catch (error) {
  console.error('wrangler deployed smoke failed');
  console.error(String(error?.message || error));
  process.exit(1);
}
