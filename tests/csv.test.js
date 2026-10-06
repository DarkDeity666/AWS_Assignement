'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const C = require('../public/core');
const { readAttendanceCsv } = require('../lib/attendance-csv');
const header = ['Date', 'Student ID', 'Name', 'Student status', 'Attendance'];
const row = ['2026-10-06', 'STU-1013', 'Alex Demo Updated', 'Active', 'Present'];

test('the supplied CSV contains all 12 rows, including the student outside the starter directory', async () => {
  const rows = readAttendanceCsv(await fs.readFile(path.join(__dirname, '../campus-attendance-2026-10-06.csv'), 'utf8'));
  assert.equal(rows.length, 12);
  assert.equal(rows.filter(r => r.attendance === 'Present').length, 1);
  assert.equal(rows.filter(r => r.attendance === 'Unmarked').length, 11);
  assert.deepEqual(rows.at(-1), { date: '2026-10-06', id: 'STU-1013', name: 'Alex Demo Updated', studentStatus: 'Active', attendance: 'Present' });
});

test('CSV reader handles BOMs, Windows line endings, commas, escaped quotes and line breaks', () => {
  const name = 'Alex, "Demo"\nUpdated';
  const rows = readAttendanceCsv('\uFEFF' + C.csv([header, [...row.slice(0, 2), name, ...row.slice(3)]]) + '\r\n\r\n');
  assert.equal(rows[0].name, name);
  assert.equal(rows[0].attendance, 'Present');
  assert.equal(readAttendanceCsv([header.join(','), row.join(',')].join('\n')).length, 1);
});

test('empty CSV with valid headers is supported, but incorrect headers and malformed quoting fail', () => {
  assert.deepEqual(readAttendanceCsv(C.csv([header])), []);
  for (const text of ['', 'Date,Name', C.csv([header]) + '\n"unfinished', C.csv([header]) + '\n"date"trailing,ID,Name,Active,Present']) {
    assert.throws(() => readAttendanceCsv(text), /columns|quot/i);
  }
});

test('invalid rows and duplicate date/student records are rejected without partial data', () => {
  for (const [column, value] of [[0, '2026-02-30'], [0, 'not-a-date'], [1, '../student'], [2, ''], [3, 'Pending'], [4, 'Unknown']]) {
    const invalid = [...row]; invalid[column] = value;
    assert.throws(() => readAttendanceCsv(C.csv([header, row, invalid])), /CSV row 3/);
  }
  assert.throws(() => readAttendanceCsv(C.csv([header, row.slice(0, 4)])), /five columns/);
  assert.throws(() => readAttendanceCsv(C.csv([header, row, row])), /duplicate attendance/);
  assert.equal(readAttendanceCsv(C.csv([header, row, ['2026-10-05', ...row.slice(1)]])).length, 2);
});
