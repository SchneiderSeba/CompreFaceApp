import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

let addCapturedFace;
let recognizFace;
let originalFetch;

before(async () => {
  process.env.COMPRE_FACE_API_KEY = 'test-key';
  process.env.COMPREFACE_API_KEY_ENV = 'COMPRE_FACE_API_KEY';
  process.env.COMPREFACE_URL = 'https://compreface.test';
  process.env.COMPREFACE_PORT = '443';
  process.env.COMPREFACE_DETECTION_THRESHOLD = '0.6';
  originalFetch = global.fetch;

  ({ addCapturedFace, recognizFace } = await import('../faceRecognice.js'));
});

after(() => {
  global.fetch = originalFetch;
});

test('registers a face with its real MIME type and configured threshold', async () => {
  let capturedUrl;
  let capturedFile;
  global.fetch = async (url, options) => {
    capturedUrl = new URL(url);
    capturedFile = options.body.get('file');
    return new Response(JSON.stringify({ image_id: 'image-1', subject: 'employee_EMP001' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const result = await addCapturedFace('data:image/png;base64,aW1hZ2U=', 'employee_EMP001');

  assert.equal(capturedUrl.pathname, '/api/v1/recognition/faces');
  assert.equal(capturedUrl.searchParams.get('subject'), 'employee_EMP001');
  assert.equal(capturedUrl.searchParams.get('det_prob_threshold'), '0.6');
  assert.equal(capturedFile.type, 'image/png');
  assert.equal(capturedFile.name, 'capture.png');
  assert.equal(result.image_id, 'image-1');
});

test('recognizes a face through the REST endpoint with a valid query string', async () => {
  let capturedUrl;
  global.fetch = async (url) => {
    capturedUrl = new URL(url);
    return new Response(JSON.stringify({
      result: [{ box: { probability: 0.95 }, subjects: [{ subject: 'employee_EMP001', similarity: 0.9 }] }]
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const result = await recognizFace('data:image/webp;base64,aW1hZ2U=');

  assert.equal(capturedUrl.pathname, '/api/v1/recognition/recognize');
  assert.equal(capturedUrl.searchParams.get('limit'), '1');
  assert.equal(capturedUrl.searchParams.get('det_prob_threshold'), '0.6');
  assert.equal(result.result[0].subjects[0].subject, 'employee_EMP001');
});
