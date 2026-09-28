'use strict';

// Server-side rendering. Every page is built here from current data, which is
// what makes the application dynamic rather than a set of static files.

const { CATEGORIES, STATUSES } = require('./store');

// User input is echoed back onto the page, so it is escaped first.
function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function badge(status) {
  const cls = status.toLowerCase().replace(' ', '-');
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}

function nextAction(complaint) {
  const i = STATUSES.indexOf(complaint.status);
  if (i >= STATUSES.length - 1) return '<span class="done">closed</span>';
  const next = STATUSES[i + 1];
  return `<form method="POST" action="/complaints/${complaint.id}/status" class="inline">
      <input type="hidden" name="status" value="${esc(next)}">
      <button class="link">mark ${esc(next)}</button>
    </form>`;
}

function row(complaint) {
  return `<tr>
    <td class="id">#${complaint.id}</td>
    <td class="room">${esc(complaint.room)}</td>
    <td>${esc(complaint.category)}</td>
    <td class="desc">${esc(complaint.description)}</td>
    <td>${badge(complaint.status)}</td>
    <td class="action">${nextAction(complaint)}</td>
  </tr>`;
}

function page({ complaints, counts, filter, error, commit }) {
  const options = CATEGORIES
    .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
    .join('');

  const tabs = ['All', ...STATUSES]
    .map((s) => {
      const active = s === filter ? ' class="active"' : '';
      return `<a href="/?status=${encodeURIComponent(s)}"${active}>${esc(s)}</a>`;
    })
    .join('');

  const rows = complaints.length
    ? complaints.map(row).join('')
    : '<tr><td colspan="6" class="empty">No complaints in this view.</td></tr>';

  const errorBox = error ? `<p class="error">${esc(error)}</p>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hostel Complaint Register</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header>
    <h1>Hostel Complaint Register</h1>
    <p class="sub">Raise a maintenance complaint and follow it through to resolution.</p>
  </header>

  <section class="stats">
    <div><strong>${counts.total}</strong><span>total</span></div>
    <div><strong>${counts.Open}</strong><span>open</span></div>
    <div><strong>${counts['In Progress']}</strong><span>in progress</span></div>
    <div><strong>${counts.Resolved}</strong><span>resolved</span></div>
    <div><strong>${counts.resolvedPct}%</strong><span>closure rate</span></div>
  </section>

  <section class="new">
    <h2>Raise a complaint</h2>
    ${errorBox}
    <form method="POST" action="/complaints">
      <input name="room" placeholder="Room (e.g. B-204)" required>
      <select name="category">${options}</select>
      <input name="description" placeholder="What is the problem?" required>
      <button type="submit">Submit</button>
    </form>
  </section>

  <nav class="tabs">${tabs}</nav>

  <table>
    <thead>
      <tr><th>ID</th><th>Room</th><th>Category</th><th>Description</th><th>Status</th><th></th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <footer>commit ${esc(commit)}</footer>
</body>
</html>`;
}

module.exports = { page, esc };
