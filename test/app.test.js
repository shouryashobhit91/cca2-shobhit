'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');
const store = require('../store');

// Start the app on a free port for one request, then shut it down.
async function withServer(fn) {
  const server = app.listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

function form(data) {
  return { method: 'POST', body: new URLSearchParams(data), redirect: 'manual' };
}

beforeEach(() => store.reset());

test('health route reports ok and the running commit', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.commit, 'a commit id should be present');
  });
});

test('a valid complaint is stored and appears on the page and in the API', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/complaints`, form({
      room: 'B-204',
      category: 'Plumbing',
      description: 'Tap in the washroom has been leaking since Monday',
    }));
    assert.equal(res.status, 302, 'a successful post should redirect');

    const list = await (await fetch(`${base}/api/complaints`)).json();
    assert.equal(list.length, 1);
    assert.equal(list[0].room, 'B-204');
    assert.equal(list[0].status, 'Open');

    const html = await (await fetch(`${base}/`)).text();
    assert.ok(html.includes('B-204'), 'the new complaint should be rendered');
  });
});

test('a description that is too short is rejected with 400', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/complaints`, form({
      room: '204',
      category: 'Electrical',
      description: 'broken',
    }));
    assert.equal(res.status, 400);

    const list = await (await fetch(`${base}/api/complaints`)).json();
    assert.equal(list.length, 0, 'nothing should have been stored');
  });
});

test('an unknown category is rejected with 400', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/complaints`, form({
      room: '101',
      category: 'Catering',
      description: 'The mess timings need to be extended',
    }));
    assert.equal(res.status, 400);
  });
});

test('a complaint moves forward through its statuses', async () => {
  await withServer(async (base) => {
    await fetch(`${base}/complaints`, form({
      room: 'A-12',
      category: 'Internet',
      description: 'Wi-Fi drops every evening after eight',
    }));

    const move = await fetch(`${base}/complaints/1/status`, form({ status: 'In Progress' }));
    assert.equal(move.status, 302);

    const stats = await (await fetch(`${base}/api/stats`)).json();
    assert.equal(stats['In Progress'], 1);
    assert.equal(stats.Open, 0);
  });
});

test('a complaint cannot be moved backwards', async () => {
  await withServer(async (base) => {
    await fetch(`${base}/complaints`, form({
      room: 'A-12',
      category: 'Furniture',
      description: 'Study chair is broken at the joint',
    }));
    await fetch(`${base}/complaints/1/status`, form({ status: 'Resolved' }));

    const back = await fetch(`${base}/complaints/1/status`, form({ status: 'Open' }));
    assert.equal(back.status, 400, 'moving Resolved back to Open should be refused');

    const list = await (await fetch(`${base}/api/complaints`)).json();
    assert.equal(list[0].status, 'Resolved', 'the status should be unchanged');
  });
});

test('updating a complaint that does not exist returns 404', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/complaints/999/status`, form({ status: 'Resolved' }));
    assert.equal(res.status, 404);
  });
});

test('the status filter narrows both the API and the page', async () => {
  await withServer(async (base) => {
    await fetch(`${base}/complaints`, form({
      room: '301', category: 'Cleanliness', description: 'Corridor has not been swept for days',
    }));
    await fetch(`${base}/complaints`, form({
      room: '302', category: 'Electrical', description: 'Tube light flickers through the night',
    }));
    await fetch(`${base}/complaints/2/status`, form({ status: 'In Progress' }));

    const open = await (await fetch(`${base}/api/complaints?status=Open`)).json();
    assert.equal(open.length, 1);
    assert.equal(open[0].room, '301');
  });
});

test('user input is escaped so markup is not executed', async () => {
  await withServer(async (base) => {
    await fetch(`${base}/complaints`, form({
      room: '404',
      category: 'Internet',
      description: '<script>alert(1)</script> router keeps restarting',
    }));

    const html = await (await fetch(`${base}/`)).text();
    assert.ok(!html.includes('<script>alert(1)</script>'), 'raw script tag must not be rendered');
    assert.ok(html.includes('&#60;script&#62;'), 'it should appear escaped instead');
  });
});
