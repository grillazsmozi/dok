const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const ExcelJS = require('exceljs');
let locked = false

const app = express();
const db = new sqlite3.Database('./competition.db');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      male_entry_id INTEGER,
      female_entry_id INTEGER,
      FOREIGN KEY(male_entry_id) REFERENCES entries(id),
      FOREIGN KEY(female_entry_id) REFERENCES entries(id)
    )
  `);
});

// Routes
app.get('/', (req, res) => {
  if (locked === false) {
    db.all('SELECT * FROM entries', (err, entries) => {
      if (err) throw err;
      res.render('index', { entries });
    });
  }else{
    res.render('locked');
  }
  
});

app.get('/admin', (req, res) => {
  db.all('SELECT * FROM entries', (err, entries) => {
    if (err) throw err;
    res.render('admin', { entries });
  });
});

app.get('/status', (req, res) => {
  if (locked) {
    res.send(true)
  } else {
    res.send(false)
  }
});

app.post('/admin/lock', (req, res) => {
  if (locked === false) {
    locked = true;
  }else{
    locked = false;
  }
});


app.get('/data:logo', (req, res) => {
  res.sendFile(__dirname + "/data/rakoczidok_logo.png")
});

app.get('/admin/results', (req, res) => {
  db.all(`
    SELECT e.name AS entry_name, COUNT(v.id) AS vote_count, e.gender
    FROM votes v
    JOIN entries e ON (e.id = v.male_entry_id OR e.id = v.female_entry_id)
    GROUP BY e.id
  `, (err, results) => {
    if (err) throw err;
    res.render('results', { results });
  });
});

app.post('/add', (req, res) => {
  const { name, gender } = req.body;
  db.run('INSERT INTO entries (name, gender) VALUES (?, ?)', [name, gender], (err) => {
    if (err) throw err;
    res.redirect('/admin');
  });
});

app.post('/edit', (req, res) => {
  const { id, name, gender } = req.body;
  db.run('UPDATE entries SET name = ?, gender = ? WHERE id = ?', [name, gender, id], (err) => {
    if (err) throw err;
    res.redirect('/admin');
  });
});

app.post('/delete', (req, res) => {
  const { id } = req.body;
  db.run('DELETE FROM entries WHERE id = ?', [id], (err) => {
    if (err) throw err;
    res.redirect('/admin');
  });
});

app.post('/vote', (req, res) => {
  const { male_id, female_id } = req.body;
  db.run('INSERT INTO votes (male_entry_id, female_entry_id) VALUES (?, ?)', [male_id, female_id], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.post('/admin/reset-votes', (req, res) => {
  db.run('DELETE FROM votes', (err) => {
    if (err) throw err;
    res.redirect('/admin/results');
  });
});

app.get('/admin/export-excel', async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Votes');

  worksheet.columns = [
    { header: 'Entry Name', key: 'entry_name', width: 30 },
    { header: 'Vote Count', key: 'vote_count', width: 15 },
    { header: 'Gender', key: 'gender', width: 15 },
  ];

  db.all(`
    SELECT e.name AS entry_name, COUNT(v.id) AS vote_count, e.gender
    FROM votes v
    JOIN entries e ON (e.id = v.male_entry_id OR e.id = v.female_entry_id)
    GROUP BY e.id
  `, (err, results) => {
    if (err) throw err;

    results.forEach(row => {
      worksheet.addRow(row);
    });

    workbook.xlsx.writeBuffer().then(buffer => {
      res.setHeader('Content-Disposition', 'attachment; filename="voting_results.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    }).catch(err => {
      res.status(500).send('Error generating file');
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
