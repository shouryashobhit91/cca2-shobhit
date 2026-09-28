'use strict';

// In-memory data store for complaints.
// Kept in its own module so the route handlers stay thin and the rules
// below (valid categories, valid status transitions) can be unit tested.

const CATEGORIES = ['Electrical', 'Plumbing', 'Furniture', 'Internet', 'Cleanliness'];
const STATUSES = ['Open', 'In Progress', 'Resolved'];

let complaints = [];
let nextId = 1;

function reset() {
  complaints = [];
  nextId = 1;
}

function all(status) {
  if (!status || status === 'All') return complaints.slice();
  return complaints.filter((c) => c.status === status);
}

function find(id) {
  return complaints.find((c) => c.id === Number(id));
}

// Returns { ok: true, complaint } or { ok: false, error }
function add({ room, category, description }) {
  const cleanRoom = String(room || '').trim();
  const cleanDesc = String(description || '').trim();

  if (!cleanRoom || !cleanDesc) {
    return { ok: false, error: 'Room number and description are required' };
  }
  if (!/^[A-Za-z]?-?\d{1,4}$/.test(cleanRoom)) {
    return { ok: false, error: 'Room number must look like 204 or B-204' };
  }
  if (cleanDesc.length < 10) {
    return { ok: false, error: 'Description must be at least 10 characters' };
  }
  if (!CATEGORIES.includes(category)) {
    return { ok: false, error: 'Unknown category' };
  }

  const complaint = {
    id: nextId++,
    room: cleanRoom.toUpperCase(),
    category,
    description: cleanDesc,
    status: 'Open',
    raisedAt: new Date().toISOString(),
  };
  complaints.push(complaint);
  return { ok: true, complaint };
}

// A complaint moves Open -> In Progress -> Resolved and never backwards.
function setStatus(id, status) {
  const complaint = find(id);
  if (!complaint) return { ok: false, error: 'No complaint with that id' };
  if (!STATUSES.includes(status)) return { ok: false, error: 'Unknown status' };

  const from = STATUSES.indexOf(complaint.status);
  const to = STATUSES.indexOf(status);
  if (to <= from) {
    return { ok: false, error: `Cannot move a complaint from ${complaint.status} back to ${status}` };
  }

  complaint.status = status;
  return { ok: true, complaint };
}

function stats() {
  const counts = { Open: 0, 'In Progress': 0, Resolved: 0 };
  complaints.forEach((c) => { counts[c.status] += 1; });
  const total = complaints.length;
  const resolvedPct = total ? Math.round((counts.Resolved / total) * 100) : 0;
  return { total, ...counts, resolvedPct };
}

module.exports = { CATEGORIES, STATUSES, reset, all, find, add, setStatus, stats };
