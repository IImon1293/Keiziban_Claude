const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES posts(id)
  )`);
});

app.get('/api/posts', (req, res) => {
  db.all(`SELECT * FROM posts WHERE parent_id IS NULL ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/posts/:id/replies', (req, res) => {
  const { id } = req.params;
  db.all(`SELECT * FROM posts WHERE parent_id = ? ORDER BY created_at ASC`, [id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/posts', (req, res) => {
  const { author, content, parent_id } = req.body;
  
  if (!author || !content) {
    res.status(400).json({ error: 'Author and content are required' });
    return;
  }

  db.run(
    `INSERT INTO posts (author, content, parent_id) VALUES (?, ?, ?)`,
    [author, content, parent_id || null],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, author, content, parent_id, created_at: new Date().toISOString() });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});