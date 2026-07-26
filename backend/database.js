const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFile = path.join(__dirname, 'dermai.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to local SQLite database.');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      name TEXT DEFAULT 'Anonymous',
      overall_score INTEGER,
      skin_type TEXT,
      image_quality TEXT,
      analysis_data TEXT
    )
  `, () => {
    // Fallback migration in case table already existed without the 'name' column
    db.run(`ALTER TABLE scans ADD COLUMN name TEXT DEFAULT 'Anonymous'`, (alterErr) => {
      // Ignore error if column already exists
    });
  });
});

module.exports = db;