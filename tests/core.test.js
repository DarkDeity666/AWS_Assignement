'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/core.js');

test('starter data is valid, with unique IDs and deterministic attendance dates', () => {
  const state = C.seed(new Date(2026, 9, 6, 12));
  assert.equal(C.isValidState(state), true);
  assert.equal(new Set(state.students.map(s => s.id)).size, 12);
  assert.equal(state.students.filter(s => s.status === 'Active').length, 11);
  assert.deepEqual(Object.keys(state.attendance), ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
});
test('attendance excludes excused and unmarked students from the denominator', () => {
  assert.deepEqual(C.attendanceSummary({ a: 'Present', b: 'Absent', c: 'Excused' }), { present: 1, absent: 1, excused: 1, marked: 3, rate: 50 });
  assert.equal(C.attendanceSummary({ a: 'Excused' }).rate, null);
  assert.equal(C.attendanceSummary().rate, null);
});
test('active-student summary excludes inactive student records', () => {
  assert.equal(C.attendanceSummary({ a: 'Present', b: 'Absent' }, ['a']).rate, 100);
});
test('student validation catches duplicate IDs and case-insensitive emails', () => {
  const list = C.seed().students;
  assert.match(C.validateStudent({ ...list[0] }, list), /ID/);
  assert.match(C.validateStudent({ ...list[0], id: 'STU-9000', email: list[0].email.toUpperCase() }, list), /email/);
  assert.equal(C.validateStudent({ ...list[0], name: 'Edited Name' }, list, list[0].id), '');
});
test('student validation rejects malformed fields', () => {
  const s = C.seed().students[0];
  for (const patch of [{ id: '../bad' }, { email: 'no-email' }, { name: '' }, { year: 5 }, { status: 'unknown' }, { department: 'Unknown' }]) {
    assert.notEqual(C.validateStudent({ ...s, ...patch }, []), '');
  }
});
test('deleting a student removes associated attendance without touching others', () => {
  const state = C.seed(); const first = state.students[0].id; const second = state.students[1].id;
  C.removeStudent(state, first);
  assert.equal(state.students.length, 11);
  assert.equal(Object.values(state.attendance).some(day => first in day), false);
  assert.equal(Object.values(state.attendance).every(day => second in day), true);
  assert.equal(C.isValidState(state), true);
});
test('CSV escapes quotes, delimiters and formula-leading values', () => {
  assert.equal(C.csv([['A, B', 'A "quote"', '=1+1', '  @SUM(1)', '+2', '-2']]), '"A, B","A ""quote""","\'=1+1","\'  @SUM(1)","\'+2","\'-2"');
  assert.equal(C.csv([['Line\nBreak'], ['Next']]), '"Line\nBreak"\r\n"Next"');
});
test('saved-state validation rejects broken data and unknown attendance references', () => {
  for (const value of [null, {}, { version: 1, students: [null], attendance: {} }]) assert.equal(C.isValidState(value), false);
  const state = C.seed(); state.attendance['2026-10-06'] = { 'STU-9999': 'Present' };
  assert.equal(C.isValidState(state), false);
  state.attendance['2026-10-06'] = { 'STU-1001': 'Impossible' };
  assert.equal(C.isValidState(state), false);
});
