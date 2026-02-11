const baseUrl = process.env.GCMS_BASE_URL;
const user = process.env.GCMS_ADMIN_USER || 'admin';
const pass = process.env.GCMS_ADMIN_PASS;

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
  console.error('GCMS_BASE_URL is required, e.g. https://gcms-api.<subdomain>.workers.dev');
  process.exit(1);
}
if (!pass) {
  console.error('GCMS_ADMIN_PASS is required for deployed smoke tests.');
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

  const updated = await request(`/v1/documents/${encodeURIComponent(documentId)}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title: 'Deployed Wrangler Integration v2', content: '<p>deployed-smoke-v2</p>' })
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
    body: JSON.stringify({ title: 'Deployed Wrangler Integration v3', content: '<p>deployed-smoke-v3</p>' })
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
  const secondJobId = publish2.body?.job?.id;
  const releaseId = publish2.body?.job?.releaseId;
  assert(secondJobId, 'missing second publish job id');
  assert(releaseId, 'missing second publish release id');
  assert(releaseId !== firstReleaseId, 'expected second publish to generate new release id');

  const secondPublishJob = await request(`/v1/publish/${encodeURIComponent(secondJobId)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(secondPublishJob.res.status === 200, `second publish job fetch failed: ${secondPublishJob.res.status}`);
  assert(
    secondPublishJob.body?.job?.status === 'completed',
    `second publish job not completed: ${secondPublishJob.body?.job?.status}`
  );

  const activate = await request(`/v1/releases/${encodeURIComponent(releaseId)}/activate`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` }
  });
  assert(activate.res.status === 200, `release activate failed: ${activate.res.status}`);

  const privateFirst = await request(`/v1/private/${encodeURIComponent(documentId)}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert(privateFirst.res.status === 200, `private first read failed: ${privateFirst.res.status}`);
  assert(privateFirst.body?.releaseId === releaseId, 'private read should use activated release');

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
  assert(releases.body?.activeRelease === releaseId, `expected activeRelease=${releaseId}, got ${releases.body?.activeRelease}`);

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
