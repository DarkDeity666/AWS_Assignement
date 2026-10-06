(function (root) {
  'use strict';
  const departments = ['Computer Science', 'Business', 'Engineering', 'Design'];
  const statuses = ['Present', 'Absent', 'Excused'];
  const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  function recentDates(today = new Date()) {
    return Array.from({ length: 7 }, (_, index) => { const d = new Date(today); d.setDate(d.getDate() - 6 + index); return localDate(d); });
  }
  function seed(today = new Date()) {
    const rows = [
      ['Aarav Sharma', 'Computer Science', 3], ['Priya Nair', 'Design', 2],
      ['Rohan Mehta', 'Business', 1], ['Ananya Rao', 'Engineering', 4],
      ['Kabir Singh', 'Computer Science', 2], ['Diya Patel', 'Design', 3],
      ['Arjun Das', 'Engineering', 1], ['Meera Iyer', 'Business', 4],
      ['Ishaan Shah', 'Computer Science', 1], ['Sara Khan', 'Business', 2],
      ['Vivaan Roy', 'Engineering', 3], ['Nisha Verma', 'Design', 4]
    ];
    const students = rows.map(([name, department, year], index) => ({
      id: `STU-${1001 + index}`, name, department, year,
      email: name.toLowerCase().replaceAll(' ', '.') + '@example.edu', status: index === 11 ? 'Inactive' : 'Active'
    }));
    const attendance = {};
    recentDates(today).slice(0, -1).forEach((date, d) => {
      attendance[date] = {};
      students.filter(s => s.status === 'Active').forEach((s, i) => { attendance[date][s.id] = (i + d * 2) % 9 === 0 ? 'Absent' : 'Present'; });
    });
    return { version: 1, students, attendance };
  }
  function validateStudent(student, students, originalId = '') {
    if (!/^[A-Z0-9-]{3,24}$/.test(student.id)) return 'Use 3–24 letters, numbers or hyphens for the student ID.';
    if (!student.name || student.name.length > 70) return 'Enter a name between 1 and 70 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email) || student.email.length > 120) return 'Enter a valid email address.';
    if (!departments.includes(student.department) || ![1, 2, 3, 4].includes(student.year) || !['Active', 'Inactive'].includes(student.status)) return 'Select a valid department, year and status.';
    if (students.some(s => s.id !== originalId && s.id.toUpperCase() === student.id)) return 'That student ID is already in use.';
    if (students.some(s => s.id !== originalId && s.email.toLowerCase() === student.email.toLowerCase())) return 'That email address is already in use.';
    return '';
  }
  function isValidState(state) {
    if (!state || state.version !== 1 || !Array.isArray(state.students) || !state.attendance || typeof state.attendance !== 'object' || Array.isArray(state.attendance)) return false;
    if (state.students.some(s => !s || ['id', 'name', 'email', 'department', 'status'].some(k => typeof s[k] !== 'string'))) return false;
    const seen = [];
    for (const s of state.students) { if (validateStudent(s, seen)) return false; seen.push(s); }
    return Object.entries(state.attendance).every(([date, records]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && records && typeof records === 'object' && !Array.isArray(records) && Object.entries(records).every(([id, status]) => state.students.some(s => s.id === id) && statuses.includes(status)));
  }
  function attendanceSummary(records = {}, ids = null) {
    const entries = Object.entries(records).filter(([id]) => !ids || ids.includes(id));
    const counts = { present: 0, absent: 0, excused: 0, marked: entries.length, rate: null };
    entries.forEach(([, status]) => { counts[status.toLowerCase()]++; });
    const denominator = counts.present + counts.absent;
    counts.rate = denominator ? Math.round(counts.present / denominator * 100) : null;
    return counts;
  }
  function csv(rows) {
    return rows.map(row => row.map(value => {
      let s = String(value ?? '');
      if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    }).join(',')).join('\r\n');
  }
  function removeStudent(state, id) {
    state.students = state.students.filter(s => s.id !== id);
    Object.values(state.attendance).forEach(records => { delete records[id]; });
  }
  const api = { departments, statuses, localDate, recentDates, seed, validateStudent, isValidState, attendanceSummary, csv, removeStudent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PortalCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
