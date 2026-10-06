/* Browser-stored demo records plus a read-only local CSV view. No AWS connection. */
'use strict';
const C = window.PortalCore;
const STORAGE_KEY = 'campus-portal-v1';
const main = document.querySelector('#main');
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iconPaths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-12 5 2 2 4-4"/>',
  cloud: '<path d="M20 16a4 4 0 0 0-2-7.46A6 6 0 0 0 6.2 7.2 4.5 4.5 0 0 0 5 16m7-3v8m-4-4 4-4 4 4"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  book: '<path d="M12 5c-3-3-7-2-9-1v15c3-2 6-2 9 0 3-2 6-2 9 0V4c-2-1-6-2-9 1v14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  edit: '<path d="m15 5 4 4M4 20l5-1L20 8a3 3 0 0 0-4-4L5 15z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.grid}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
let state;
let storageAvailable = true;
let storageCorrupt = false;
let storageWarning = '';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!C.isValidState(parsed)) throw new Error('Invalid saved data');
    state = parsed;
  } else { state = C.seed(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
} catch (error) {
  state = C.seed(); storageAvailable = false;
  storageCorrupt = error.message === 'Invalid saved data' || error instanceof SyntaxError;
  storageWarning = storageCorrupt ? 'Saved data could not be read. A temporary demo is shown; the original data is preserved. Reset demo to start again.' : 'Browser storage is unavailable. Changes last only until this page closes.';
}
let page = 'overview';
let selectedDate = C.localDate();
let csvData = { status: 'idle', source: '', rows: [], error: '' };
let csvDate = '';
const filters = { query: '', department: '', status: '' };
let toastTimer;
function notify(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
}
function save(message) {
  if (!storageCorrupt) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageAvailable = true; }
    catch { storageAvailable = false; }
  }
  updateStorageStatus();
  notify(storageAvailable ? message : `${message} Changes are temporary; browser storage is unavailable.`);
}
function updateStorageStatus() {
  if (page === 'csv') {
    document.querySelector('#storage-status').textContent = csvData.status === 'ready' ? 'Read-only CSV from local server' : 'CSV connection not ready';
    return;
  }
  document.querySelector('#storage-status').textContent = storageAvailable ? 'Saved in this browser' : storageCorrupt ? 'Temporary demo · Original saved data needs a reset' : 'Temporary session · Changes will not survive a reload';
}
function initials(name) { return name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase(); }
function studentCell(s, index) {
  return `<div class="student-cell"><span class="avatar tone-${index % 4}">${escapeHtml(initials(s.name))}</span><span><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.email)}</small></span></div>`;
}
function heading(title, subtitle, buttons = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${buttons}</div></div>`;
}
const addButton = () => `<button class="button primary" data-action="add">${icon('plus')}Add student</button>`;
const exportButton = (label = 'Export students') => `<button class="button secondary" data-action="export">${icon('download')}${label}</button>`;
function stat(label, value, note, symbol) {
  return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon(symbol)}</span></div><div class="stat-number">${value}</div><div class="stat-note">${note}</div></article>`;
}
function tableRows(students) {
  if (!students.length) return '<tr><td colspan="6" class="empty-state"><strong>No students found</strong><p>Add your first student, or change the search and filters.</p><button class="button secondary" data-action="clear-filters">Clear filters</button></td></tr>';
  return students.map((s, index) => `<tr><td>${studentCell(s, index)}</td><td>${escapeHtml(s.id)}</td><td>${escapeHtml(s.department)}</td><td>Year ${s.year}</td><td><span class="status ${s.status === 'Inactive' ? 'inactive' : ''}">${s.status}</span></td><td><div class="row-actions"><button class="icon-button" data-action="edit" data-id="${escapeHtml(s.id)}" aria-label="Edit ${escapeHtml(s.name)}">${icon('edit')}</button>${page === 'students' ? `<button class="icon-button" data-action="delete" data-id="${escapeHtml(s.id)}" aria-label="Delete ${escapeHtml(s.name)}">${icon('trash')}</button>` : ''}</div></td></tr>`).join('');
}
const tableHead = '<thead><tr><th scope="col">Student</th><th scope="col">Student ID</th><th scope="col">Department</th><th scope="col">Year</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>';
function chart() {
  const dates = C.recentDates().slice(0, -1);
  const records = dates.map(date => C.attendanceSummary(state.attendance[date]));
  const points = records.map((r, i) => ({ x: 43 + i * 88, y: r.rate === null ? null : 137 - r.rate * 1.12 }));
  // Missing days create gaps rather than fabricated zero observations.
  const segments = []; let segment = [];
  points.forEach(p => { if (p.y === null) { if (segment.length) segments.push(segment); segment = []; } else segment.push(p); });
  if (segment.length) segments.push(segment);
  const paths = segments.map(seg => {
    const d = seg.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    return `<path class="area" d="${d} L${seg.at(-1).x},137 L${seg[0].x},137 Z"/><path class="line" d="${d}"/>`;
  }).join('');
  const summary = dates.map((d, i) => `${d}: ${records[i].rate === null ? 'no records' : records[i].rate + '%'}`).join('; ');
  return `<div class="chart-body"><svg class="chart" viewBox="0 0 520 174" role="img" aria-label="Daily attendance. ${summary}">
    ${[0, 50, 100].map(v => `<line class="grid-line" x1="36" x2="498" y1="${137 - v * 1.12}" y2="${137 - v * 1.12}"/><text x="0" y="${141 - v * 1.12}">${v}%</text>`).join('')}
    ${paths}${points.filter(p => p.y !== null).map(p => `<circle class="point" cx="${p.x}" cy="${p.y}" r="3.3"/>`).join('')}
    ${dates.map((d, i) => `<text x="${points[i].x}" y="163" text-anchor="middle">${new Date(d + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}</text>`).join('')}
    </svg><div class="chart-legend"><span class="status-dot"></span>Present ÷ (present + absent) · Excused and unmarked excluded</div></div>`;
}
function renderOverview() {
  const active = state.students.filter(s => s.status === 'Active');
  const today = C.attendanceSummary(state.attendance[C.localDate()], active.map(s => s.id));
  const departmentCount = C.departments.filter(d => state.students.some(s => s.department === d)).length;
  const recent = [...state.students].reverse().slice(0, 5);
  main.innerHTML = heading('A little clarity for your campus.', 'Your students, attendance, and everyday essentials. All in one place.', exportButton('Export CSV') + addButton()) +
    `<section class="welcome-banner" aria-label="Welcome"><div><span class="eyebrow">YOUR CAMPUS, AT A GLANCE</span><h2>Good things start with a clear overview.</h2><p>A simple workspace to keep student life moving.</p></div><svg class="banner-art" viewBox="0 0 160 100" aria-hidden="true"><circle cx="83" cy="52" r="45" fill="#dce8d6"/><path d="m27 32 57-23 57 23-57 24z" fill="#426951"/><path d="M47 43v27c21 15 49 15 71 0V43L84 57z" fill="#85a178"/><path d="m28 32 56 24 57-24" fill="none" stroke="#e9f1e2" stroke-width="2"/><path d="M141 33v35" stroke="#426951" stroke-width="2"/><circle cx="141" cy="70" r="4" fill="#426951"/><path d="M48 83h63v9H48z" fill="#b4c9a8"/><path d="M58 80h63v7H58z" fill="#eff5e8"/></svg></section>
    <section class="stats-grid" aria-label="Campus statistics">${stat('Total students', state.students.length, '<span class="positive">↗</span> Across all departments', 'users')}${stat('Active students', active.length, `${state.students.length - active.length} inactive student${state.students.length - active.length === 1 ? '' : 's'}`, 'check')}${stat("Today’s attendance", today.rate === null ? '—' : today.rate + '%', `${today.marked} of ${active.length} active students marked`, 'calendar')}${stat('Departments', departmentCount, 'Represented in the directory', 'book')}</section>
    <div class="overview-grid"><section class="card"><div class="card-header"><div><h2>Attendance overview</h2><p>A look at the previous six days</p></div><span class="pill">Daily rate</span></div>${chart()}</section>
    <section class="card"><div class="card-header"><div><h2>Students by department</h2><p>A community of different disciplines</p></div></div><div class="department-list">${C.departments.map((d, i) => { const n = state.students.filter(s => s.department === d).length; return `<div class="department-row"><div class="department-label"><span>${d}</span><strong>${n} students</strong></div><div class="progress"><svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true"><rect width="${state.students.length ? n / state.students.length * 100 : 0}" height="6" rx="2" fill="${['#789f81', '#b8caa9', '#9bac88', '#d1dcbc'][i]}"/></svg></div></div>`; }).join('')}</div><div class="department-foot">${departmentCount} departments · ${state.students.length} students in total</div></section></div>
    <section class="card"><div class="table-header"><h2>Recently added students <span class="count-badge">${state.students.length} total</span></h2><a href="#students" class="text-button">View all students ${icon('arrow')}</a></div><div class="table-scroll"><table aria-label="Recently added students">${tableHead}<tbody>${tableRows(recent)}</tbody></table></div><div class="table-footer"><span>Showing the ${recent.length} most recently added students</span><span>Fictional demo records</span></div></section>`;
}
function filteredStudents() {
  const q = filters.query.trim().toLowerCase();
  return state.students.filter(s => (!q || [s.id, s.name, s.email].some(v => v.toLowerCase().includes(q))) && (!filters.department || s.department === filters.department) && (!filters.status || s.status === filters.status));
}
function updateStudentTable() {
  const students = filteredStudents();
  document.querySelector('#student-rows').innerHTML = tableRows(students);
  document.querySelector('#result-count').textContent = `Showing ${students.length} of ${state.students.length} students`;
}
function renderStudents() {
  main.innerHTML = heading('A place for every student.', 'Manage the people at the heart of your campus.', exportButton() + addButton()) +
    `<section class="card"><div class="filters"><label class="search-field">${icon('search')}<span class="sr-only">Search students</span><input id="search" type="search" placeholder="Search by name, ID, or email…" value="${escapeHtml(filters.query)}"></label><label><span class="sr-only">Filter by department</span><select id="department-filter"><option value="">All departments</option>${C.departments.map(d => `<option ${filters.department === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label><label><span class="sr-only">Filter by status</span><select id="status-filter"><option value="">All statuses</option><option ${filters.status === 'Active' ? 'selected' : ''}>Active</option><option ${filters.status === 'Inactive' ? 'selected' : ''}>Inactive</option></select></label></div><div class="table-scroll"><table aria-label="Student directory">${tableHead}<tbody id="student-rows"></tbody></table></div><div class="table-footer"><span id="result-count" role="status"></span><button class="text-button" data-action="reset">Reset demo data</button></div></section>`;
  document.querySelector('#search').addEventListener('input', e => { filters.query = e.target.value; updateStudentTable(); });
  document.querySelector('#department-filter').addEventListener('change', e => { filters.department = e.target.value; updateStudentTable(); });
  document.querySelector('#status-filter').addEventListener('change', e => { filters.status = e.target.value; updateStudentTable(); });
  updateStudentTable();
}
async function loadCsv() {
  if (csvData.status === 'loading') return;
  csvData = { status: 'loading', source: '', rows: [], error: '' };
  if (page === 'csv') { renderCsv(); updateStorageStatus(); }
  try {
    if (location.protocol === 'file:') throw new Error('Open http://127.0.0.1:4173 after starting the local server with node server.js to view the CSV.');
    const response = await fetch('/api/attendance', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The CSV API is unavailable. Start this project with node server.js.');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Could not load the CSV (HTTP ${response.status}).`);
    csvData = { status: 'ready', source: data.source, rows: data.rows, error: '' };
    if (!data.rows.some(row => row.date === csvDate)) csvDate = '';
  } catch (error) {
    const message = error.name === 'TimeoutError' ? 'The server took too long to respond. Check that it is running, then reload the CSV.' : error instanceof TypeError ? 'Could not reach the local server. Start it with node server.js, then reload the CSV.' : error.message;
    csvData = { status: 'error', source: '', rows: [], error: message };
  }
  if (page === 'csv') { renderCsv(); updateStorageStatus(); }
}

function renderCsv() {
  const loading = csvData.status === 'loading' || csvData.status === 'idle';
  main.innerHTML = heading('CSV attendance', 'Attendance records read directly from the CSV on your local server.', `<button class="button secondary" data-action="reload-csv" ${loading ? 'disabled' : ''}>${icon('reset')}Reload CSV</button>`);
  if (loading) { main.innerHTML += '<p class="inline-note" role="status">Loading attendance CSV…</p>'; return; }
  if (csvData.status === 'error') { main.innerHTML += `<p class="inline-note" role="alert">${escapeHtml(csvData.error)}</p>`; return; }
  const rows = csvData.rows.filter(row => !csvDate || row.date === csvDate);
  const dates = [...new Set(csvData.rows.map(row => row.date))].sort().reverse();
  const summary = C.attendanceSummary(Object.fromEntries(rows.filter(row => row.attendance !== 'Unmarked').map(row => [`${row.date}/${row.id}`, row.attendance])));
  main.innerHTML += `<p class="inline-note"><strong>Connected: ${escapeHtml(csvData.source)}</strong><br>Read-only view. Reload CSV after editing the file. Changes in the editable Attendance register are saved separately in this browser.</p>
    <section class="stats-grid" aria-label="CSV attendance statistics">${stat('CSV records', rows.length, 'For the selected dates', 'book')}${stat('Present', summary.present, 'Recorded in the CSV', 'check')}${stat('Absent', summary.absent, 'Recorded in the CSV', 'users')}${stat('Unmarked', rows.length - summary.marked, 'Still to be recorded', 'calendar')}</section>
    <section class="card"><div class="attendance-tools"><label class="date-field">CSV date<select id="csv-date"><option value="">All dates</option>${dates.map(date => `<option value="${escapeHtml(date)}" ${csvDate === date ? 'selected' : ''}>${escapeHtml(date)}</option>`).join('')}</select><span class="pill">Read only</span></div><div class="table-scroll"><table aria-label="CSV attendance records"><thead><tr><th scope="col">Date</th><th scope="col">Student ID</th><th scope="col">Name</th><th scope="col">Student status</th><th scope="col">Attendance</th></tr></thead><tbody>${rows.length ? rows.map(row => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.id)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.studentStatus)}</td><td>${escapeHtml(row.attendance)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-state">No attendance records in this CSV.</td></tr>'}</tbody></table></div><div class="table-footer"><span>${rows.length} records · ${summary.excused} excused</span><span>Attendance rate: ${summary.rate === null ? '—' : summary.rate + '%'}</span></div></section>`;
  document.querySelector('#csv-date').addEventListener('change', e => { csvDate = e.target.value; renderCsv(); });
}

function renderAttendance() {
  const active = state.students.filter(s => s.status === 'Active');
  const ids = active.map(s => s.id);
  const records = state.attendance[selectedDate] || {};
  const summary = C.attendanceSummary(records, ids);
  main.innerHTML = heading('Every day counts.', 'Take attendance for active students. Each change is saved automatically.', `<button class="button secondary" data-action="export-attendance">${icon('download')}Export this date</button>`) +
    `<section class="stats-grid" aria-label="Attendance statistics">${stat('Present', summary.present, 'Ready for the day', 'check')}${stat('Absent', summary.absent, 'Not in attendance', 'users')}${stat('Excused', summary.excused, 'Excluded from the rate', 'calendar')}${stat('Unmarked', active.length - summary.marked, 'Still to be recorded', 'book')}</section>
    <section class="card"><div class="attendance-tools"><label class="date-field">Attendance date<input type="date" id="attendance-date" value="${selectedDate}" max="${C.localDate()}" required></label><button class="button secondary" data-action="mark-all" ${active.length ? '' : 'disabled'}>${icon('check')}Mark all present</button></div><div class="table-scroll"><table aria-label="Attendance register"><thead><tr><th scope="col">Student</th><th scope="col">Student ID</th><th scope="col">Department</th><th scope="col">Attendance</th></tr></thead><tbody>${active.length ? active.map((s, i) => `<tr><td>${studentCell(s, i)}</td><td>${escapeHtml(s.id)}</td><td>${s.department}</td><td><select class="attendance-select" data-attendance="${escapeHtml(s.id)}" aria-label="Attendance for ${escapeHtml(s.name)}"><option value="">Unmarked</option>${C.statuses.map(status => `<option ${records[s.id] === status ? 'selected' : ''}>${status}</option>`).join('')}</select></td></tr>`).join('') : '<tr><td colspan="4" class="empty-state"><strong>No active students</strong><p>Add an active student in the student directory to take attendance.</p></td></tr>'}</tbody></table></div><div class="table-footer"><span>${summary.marked} of ${active.length} students marked</span><span>Attendance rate: ${summary.rate === null ? '—' : summary.rate + '%'}</span></div></section><p class="inline-note">One daily record per student. The rate is present ÷ (present + absent); excused and unmarked students are excluded. Inactive students keep their history but are hidden from this register.</p>`;
  document.querySelector('#attendance-date').addEventListener('change', e => {
    if (!e.target.value || !e.target.validity.valid || e.target.value > C.localDate()) { e.target.value = selectedDate; notify('Choose today or a past date.'); return; }
    selectedDate = e.target.value; renderAttendance();
  });
  document.querySelectorAll('[data-attendance]').forEach(el => el.addEventListener('change', e => {
    const id = e.target.dataset.attendance;
    if (!state.attendance[selectedDate]) state.attendance[selectedDate] = {};
    if (e.target.value) state.attendance[selectedDate][id] = e.target.value;
    else delete state.attendance[selectedDate][id];
    save('Attendance updated.'); renderAttendance();
    document.querySelector(`[data-attendance="${id}"]`)?.focus();
  }));
}
const services = [
  ['RELATIONAL STORAGE', 'Amazon RDS', 'Student profiles, courses, and enrollments with relationships and SQL.'],
  ['NOSQL STORAGE', 'Amazon DynamoDB', 'Daily attendance records, keyed by student ID and date.'],
  ['LARGE DATASET ANALYSIS', 'Amazon Redshift', 'Analyze historical university datasets in a data warehouse.'],
  ['TRAFFIC DISTRIBUTION', 'Application Load Balancer', 'Route web requests to healthy EC2 instances.'],
  ['ELASTIC CAPACITY', 'EC2 Auto Scaling', 'Add or remove EC2 instances according to demand.'],
  ['MONITORING', 'Amazon CloudWatch', 'Observe CPU, application metrics, logs, and alarms.'],
  ['AUDITING', 'AWS CloudTrail', 'Record AWS management actions for an audit trail.'],
  ['AUTOMATED DEPLOYMENT', 'AWS CodePipeline', 'Coordinate source, checks, and deployment stages.'],
  ['INFRASTRUCTURE AS CODE', 'AWS CloudFormation', 'Describe and provision repeatable infrastructure with templates.']
];
function renderArchitecture() {
  main.innerHTML = heading('A small app. Room to grow.', 'The proposed AWS design for the university Student Management Portal.', '<a class="button secondary" href="assets/architecture.svg" download="proposed-aws-architecture.svg">' + icon('download') + 'Save diagram</a>') +
    `<div class="inline-note architecture-intro">${icon('cloud')}<span><strong>Architecture proposal · No AWS services are connected.</strong><br>This prototype saves records in your browser. Hosting these files on EC2 would demonstrate hosting; RDS and DynamoDB require a backend API before they can store this app’s data.</span></div><section class="card architecture-card"><h2>From a user request to the application</h2><p class="muted">Proposed design · Connections below describe future infrastructure.</p><img src="assets/architecture.svg" alt="Proposed AWS architecture: users reach an Application Load Balancer, which routes to EC2 application instances in an Auto Scaling group across two availability zones. A future backend uses RDS and DynamoDB. CloudWatch monitors, CloudTrail audits, and CodePipeline coordinates deployments. CloudFormation provisions infrastructure; Redshift is a separate analytics destination."></section><section class="services-grid" aria-label="AWS service selection">${services.map(([category, name, description]) => `<article class="card service-card"><span class="eyebrow">${category}</span><h3>${name}</h3><p>${description}</p><span class="pill">Planned · Not connected</span></article>`).join('')}</section>`;
}
function render() {
  const requested = location.hash.slice(1) || 'overview';
  page = ['overview', 'students', 'attendance', 'csv', 'architecture'].includes(requested) ? requested : 'overview';
  document.querySelector('#breadcrumb').textContent = { overview: 'Overview', students: 'Students', attendance: 'Attendance', csv: 'CSV attendance', architecture: 'AWS architecture' }[page];
  document.title = `${document.querySelector('#breadcrumb').textContent} · Campus`;
  document.querySelector('#nav-count').textContent = state.students.length;
  document.querySelectorAll('[data-nav]').forEach(el => { const active = el.dataset.nav === page; el.classList.toggle('active', active); if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
  ({ overview: renderOverview, students: renderStudents, attendance: renderAttendance, csv: renderCsv, architecture: renderArchitecture })[page]();
  updateStorageStatus();
  if (page === 'csv' && csvData.status === 'idle') loadCsv();
}
function openStudent(id) {
  const form = document.querySelector('#student-form'); form.reset();
  document.querySelector('#form-error').textContent = '';
  const student = state.students.find(s => s.id === id);
  form.elements.originalId.value = student?.id || '';
  form.elements.id.readOnly = Boolean(student);
  document.querySelector('#student-dialog-title').textContent = student ? 'Edit student' : 'Add a student';
  if (student) Object.entries(student).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; });
  else { let next = 1001; while (state.students.some(s => s.id === `STU-${next}`)) next++; form.elements.id.value = `STU-${next}`; }
  document.querySelector('#student-dialog').showModal();
  form.elements.name.focus();
}
document.querySelector('#student-form').addEventListener('submit', e => {
  e.preventDefault(); const form = e.currentTarget;
  const student = Object.fromEntries(new FormData(form)); const originalId = student.originalId; delete student.originalId;
  student.id = student.id.trim().toUpperCase(); student.name = student.name.trim(); student.email = student.email.trim().toLowerCase(); student.year = Number(student.year);
  const error = C.validateStudent(student, state.students, originalId);
  if (error) { document.querySelector('#form-error').textContent = error; return; }
  if (originalId) state.students[state.students.findIndex(s => s.id === originalId)] = student;
  else state.students.push(student);
  save(originalId ? 'Student updated.' : 'Student added.');
  document.querySelector('#student-dialog').close(); render();
});
let confirmCallback;
function confirmAction(title, message, action, callback) {
  document.querySelector('#confirm-title').textContent = title;
  document.querySelector('#confirm-message').textContent = message;
  document.querySelector('#confirm-action').textContent = action;
  const dialog = document.querySelector('#confirm-dialog'); dialog.returnValue = ''; confirmCallback = callback; dialog.showModal();
}
document.querySelector('#confirm-dialog').addEventListener('close', e => { const action = confirmCallback; confirmCallback = null; if (e.target.returnValue === 'confirm') action?.(); });
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
document.addEventListener('click', e => {
  if (e.target.closest('.skip-link')) { e.preventDefault(); main.focus(); return; }
  const close = e.target.closest('[data-close]'); if (close) { document.getElementById(close.dataset.close).close(); return; }
  const button = e.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action; const id = button.dataset.id;
  if (action === 'reload-csv') loadCsv();
  if (action === 'add') openStudent();
  if (action === 'edit') openStudent(id);
  if (action === 'delete') {
    const student = state.students.find(s => s.id === id);
    confirmAction('Delete student?', `This removes ${student.name} and all of their saved attendance records from this browser.`, 'Delete student', () => { C.removeStudent(state, id); save('Student deleted.'); render(); });
  }
  if (action === 'reset') confirmAction('Reset demo data?', 'This replaces all student and attendance records in this browser with the fictional starter dataset. This cannot be undone.', 'Reset demo', () => { state = C.seed(); storageCorrupt = false; Object.assign(filters, { query: '', department: '', status: '' }); save('Demo data restored.'); render(); });
  if (action === 'clear-filters') { Object.assign(filters, { query: '', department: '', status: '' }); render(); }
  if (action === 'export') {
    const list = page === 'students' ? filteredStudents() : state.students;
    download(`campus-students-${C.localDate()}.csv`, '\uFEFF' + C.csv([['Student ID', 'Name', 'Email', 'Department', 'Year', 'Status'], ...list.map(s => [s.id, s.name, s.email, s.department, s.year, s.status])]), 'text/csv;charset=utf-8');
    notify(`${list.length} student records exported.`);
  }
  if (action === 'export-attendance') {
    const records = state.attendance[selectedDate] || {};
    const list = state.students.filter(s => s.status === 'Active' || records[s.id]);
    download(`campus-attendance-${selectedDate}.csv`, '\uFEFF' + C.csv([['Date', 'Student ID', 'Name', 'Student status', 'Attendance'], ...list.map(s => [selectedDate, s.id, s.name, s.status, records[s.id] || 'Unmarked'])]), 'text/csv;charset=utf-8');
    notify('Attendance exported, including saved records for inactive students.');
  }
  if (action === 'mark-all') confirmAction('Mark all present?', `This sets all active students to Present for ${selectedDate}, replacing any existing marks for that date.`, 'Mark all present', () => {
    if (!state.attendance[selectedDate]) state.attendance[selectedDate] = {};
    state.students.filter(s => s.status === 'Active').forEach(s => { state.attendance[selectedDate][s.id] = 'Present'; });
    save('All active students marked present.'); renderAttendance();
  });
});
window.addEventListener('hashchange', () => { render(); main.focus({ preventScroll: true }); window.scrollTo(0, 0); });
// Avoid silently overwriting updates made in another tab.
window.addEventListener('storage', e => {
  if (e.key !== STORAGE_KEY && e.key !== null) return;
  try {
    const parsed = e.newValue ? JSON.parse(e.newValue) : C.seed();
    if (!C.isValidState(parsed)) return;
    state = parsed;
    document.querySelectorAll('dialog[open]').forEach(dialog => { dialog.returnValue = 'cancel'; dialog.close(); });
    render(); notify('Workspace refreshed after a change in another tab.');
  } catch { notify('Another tab changed saved data. Reload to review it.'); }
});
render();
if (storageWarning) notify(storageWarning);
