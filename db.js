const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'cars.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    price INTEGER NOT NULL,
    mileage INTEGER NOT NULL,
    fuel TEXT,
    transmission TEXT,
    bodyType TEXT,
    description TEXT,
    photo TEXT,
    sellerName TEXT,
    sellerContact TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_make ON listings(make);
  CREATE INDEX IF NOT EXISTS idx_price ON listings(price);
`);

module.exports = db;