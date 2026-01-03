import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

const app = express();
const PORT = process.env.PORT || 4001;
const DB_PATH = process.env.DB_PATH || './school.db';

const db = new Database(DB_PATH);

db.prepare(`
  CREATE TABLE IF NOT EXISTS school_info (
    academicYear TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS students (
    academicYear TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS employees (
    schoolCode TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`).run();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'school-info', port: PORT });
});

app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

app.get('/school-info/:year', (req, res) => {
  try {
    const row = db
      .prepare('SELECT data FROM school_info WHERE academicYear = ?')
      .get(req.params.year);
    if (!row) return res.json(null);
    return res.json(JSON.parse(row.data));
  } catch (err) {
    console.error('GET /school-info error', err);
    return res.status(500).json({ error: 'Failed to load school info' });
  }
});

app.post('/school-info/:year', (req, res) => {
  try {
    const payload = JSON.stringify(req.body || {});
    db.prepare(`
      INSERT OR REPLACE INTO school_info (academicYear, data)
      VALUES (?, ?)
    `).run(req.params.year, payload);
    return res.json({ success: true });
  } catch (err) {
    console.error('POST /school-info error', err);
    return res.status(500).json({ error: 'Failed to save school info' });
  }
});

app.get('/students/:year', (req, res) => {
  try {
    const row = db
      .prepare('SELECT data FROM students WHERE academicYear = ?')
      .get(req.params.year);
    if (!row) return res.json([]);
    return res.json(JSON.parse(row.data));
  } catch (err) {
    console.error('GET /students error', err);
    return res.status(500).json({ error: 'Failed to load students' });
  }
});

app.post('/students/:year', (req, res) => {
  try {
    const payload = JSON.stringify(req.body || []);
    db.prepare(`
      INSERT OR REPLACE INTO students (academicYear, data)
      VALUES (?, ?)
    `).run(req.params.year, payload);
    return res.json({ success: true });
  } catch (err) {
    console.error('POST /students error', err);
    return res.status(500).json({ error: 'Failed to save students' });
  }
});

app.get('/employees/:schoolCode', (req, res) => {
  try {
    const row = db
      .prepare('SELECT data FROM employees WHERE schoolCode = ?')
      .get(req.params.schoolCode);
    if (!row) return res.json([]);
    return res.json(JSON.parse(row.data));
  } catch (err) {
    console.error('GET /employees error', err);
    return res.status(500).json({ error: 'Failed to load employees' });
  }
});

app.post('/employees/:schoolCode', (req, res) => {
  try {
    const payload = JSON.stringify(req.body || []);
    db.prepare(`
      INSERT OR REPLACE INTO employees (schoolCode, data)
      VALUES (?, ?)
    `).run(req.params.schoolCode, payload);
    return res.json({ success: true });
  } catch (err) {
    console.error('POST /employees error', err);
    return res.status(500).json({ error: 'Failed to save employees' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
