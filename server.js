const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// --- image upload ---
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB
  fileFilter: (req, file, cb) => {
    cb(null, /^image\/(jpe?g|png|webp)$/.test(file.mimetype));
  }
});

// --- browse / filter ---
app.get('/api/listings', (req, res) => {
  const { make, model, minPrice, maxPrice, minYear, maxYear, q, sort } = req.query;
  let sql = 'SELECT * FROM listings WHERE 1=1';
  const params = [];

  if (make)  { sql += ' AND make = ?';              params.push(make); }
  if (model) { sql += ' AND model LIKE ?';          params.push(`%${model}%`); }
  if (minPrice) { sql += ' AND price >= ?';         params.push(+minPrice); }
  if (maxPrice) { sql += ' AND price <= ?';         params.push(+maxPrice); }
  if (minYear)  { sql += ' AND year >= ?';          params.push(+minYear); }
  if (maxYear)  { sql += ' AND year <= ?';          params.push(+maxYear); }
  if (q) {
    sql += ' AND (make LIKE ? OR model LIKE ? OR description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const order = {
    price_asc: 'price ASC',
    price_desc: 'price DESC',
    newest: 'createdAt DESC',
    mileage_asc: 'mileage ASC'
  }[sort] || 'createdAt DESC';

  sql += ` ORDER BY ${order}`;
  res.json(db.prepare(sql).all(...params));
});

// --- single listing ---
app.get('/api/listings/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

// --- create (with photo) ---
app.post('/api/listings', upload.single('photo'), (req, res) => {
  const b = req.body;
  const required = ['make', 'model', 'year', 'price', 'mileage'];
  for (const f of required) {
    if (!b[f]) return res.status(400).json({ error: `${f} is required` });
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO listings
    (id, make, model, year, price, mileage, fuel, transmission,
     bodyType, description, photo, sellerName, sellerContact, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, b.make, b.model, +b.year, +b.price, +b.mileage,
    b.fuel || null, b.transmission || null, b.bodyType || null,
    b.description || null, req.file ? `/uploads/${req.file.filename}` : null,
    b.sellerName || null, b.sellerContact || null, new Date().toISOString()
  );

  res.status(201).json({ id });
});

// --- update ---
app.put('/api/listings/:id', upload.single('photo'), (req, res) => {
  const existing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const b = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : existing.photo;

  db.prepare(`
    UPDATE listings SET
      make = ?, model = ?, year = ?, price = ?, mileage = ?,
      fuel = ?, transmission = ?, bodyType = ?, description = ?,
      photo = ?, sellerName = ?, sellerContact = ?
    WHERE id = ?
  `).run(
    b.make ?? existing.make,
    b.model ?? existing.model,
    +(b.year ?? existing.year),
    +(b.price ?? existing.price),
    +(b.mileage ?? existing.mileage),
    b.fuel ?? existing.fuel,
    b.transmission ?? existing.transmission,
    b.bodyType ?? existing.bodyType,
    b.description ?? existing.description,
    photo,
    b.sellerName ?? existing.sellerName,
    b.sellerContact ?? existing.sellerContact,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id));
});

// --- delete ---
app.delete('/api/listings/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });

  // remove photo file
  if (row.photo) {
    const p = path.join(__dirname, row.photo);
    fs.unlink(p, () => {});
  }
  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// --- distinct makes for filter dropdown ---
app.get('/api/makes', (req, res) => {
  res.json(db.prepare('SELECT DISTINCT make FROM listings ORDER BY make').all().map(r => r.make));
});

app.listen(3000, () => console.log('http://localhost:3000'));