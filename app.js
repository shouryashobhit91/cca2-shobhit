'use strict';

const path = require('path');
const express = require('express');
const store = require('./store');
const { page } = require('./views');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Render sets RENDER_GIT_COMMIT on every deploy; GIT_SHA is passed in by the
// Docker build so the container shows the same id when run locally.
const sha = process.env.SHA || process.env.COMMIT_SHA || process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || 'local';
const commit = sha.slice(0, 7);

console.log(Object.keys(process.env).filter(k => /SHA|COMMIT|GIT|RENDER/i.test(k)));
function render(res, { filter = 'All', error = null, status = 200 }) {
  res.status(status).send(page({
    complaints: store.all(filter),
    counts: store.stats(),
    filter,
    error,
    commit,
  }));
}

// Home page, generated from current data on every request.
app.get('/', (req, res) => {
  const filter = req.query.status || 'All';
  render(res, { filter });
});

// Raise a complaint.
app.post('/complaints', (req, res) => {
  const result = store.add(req.body);
  if (!result.ok) {
    return render(res, { error: result.error, status: 400 });
  }
  res.redirect('/');
});

// Advance a complaint to its next status.
app.post('/complaints/:id/status', (req, res) => {
  const result = store.setStatus(req.params.id, req.body.status);
  if (!result.ok) {
    const code = result.error === 'No complaint with that id' ? 404 : 400;
    return render(res, { error: result.error, status: code });
  }
  res.redirect('/');
});

// JSON API
app.get('/api/complaints', (req, res) => res.json(store.all(req.query.status)));
app.get('/api/stats', (req, res) => res.json(store.stats()));

// Health check, used by the pipeline smoke test and by Render.
app.get('/health', (req, res) => res.json({ status: 'ok', commit }));

module.exports = app;
