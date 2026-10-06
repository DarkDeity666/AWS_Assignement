'use strict';

const headers = ['Date', 'Student ID', 'Name', 'Student status', 'Attendance'];

// Handles the portal's exports, including UTF-8 BOMs, CRLFs and quoted fields.
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false, closed = false;
  const endField = () => { row.push(field); field = ''; closed = false; };
  const endRow = () => { endField(); if (row.some(value => value.trim())) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === ',') endField();
    else if (char === '\r' || char === '\n') {
      endRow();
      if (char === '\r' && text[i + 1] === '\n') i++;
    } else if (char === '"' && !field && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new Error('Invalid CSV quoting.');
      field += char;
    }
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  if (field || row.length || closed) endRow();
  return rows;
}

function readAttendanceCsv(text) {
  const [header, ...records] = parseCsv(text);
  if (!header || header.length !== headers.length || header.some((value, i) => value.trim() !== headers[i])) {
    throw new Error(`Expected CSV columns: ${headers.join(', ')}.`);
  }
  const seen = new Set();
  return records.map((record, index) => {
    const error = message => { throw new Error(`CSV row ${index + 2}: ${message}`); };
    if (record.length !== headers.length) error('expected five columns.');
    const [date, id, name, studentStatus, attendance] = record.map(value => value.trim());
    const parsedDate = new Date(date + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) error('invalid date.');
    if (!/^[A-Z0-9-]{3,24}$/.test(id)) error('invalid student ID.');
    if (!name || name.length > 70) error('name must contain 1–70 characters.');
    if (!['Active', 'Inactive'].includes(studentStatus)) error('invalid student status.');
    if (!['Present', 'Absent', 'Excused', 'Unmarked'].includes(attendance)) error('invalid attendance status.');
    const key = `${date}/${id}`;
    if (seen.has(key)) error(`duplicate attendance for ${id} on ${date}.`);
    seen.add(key);
    return { date, id, name, studentStatus, attendance };
  });
}

module.exports = { readAttendanceCsv };
