const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database(path.join(__dirname, 'gloriabeauty.db'));

function initDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerName TEXT,
        customerEmail TEXT,
        customerAddress TEXT,
        deliveryCity TEXT,
        deliveryMode TEXT,
        paymentMethod TEXT,
        total REAL,
        items TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS newsletter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE
      )
    `);

    db.run(`
      INSERT OR IGNORE INTO users (name, email, password)
      VALUES ('Glo Beauty', 'admin@globeauty.com', 'glo123')
    `);
  });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend Glo Beauty actif' });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }

  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur de base de données.' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    return res.json({
      message: 'Connexion réussie.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  });
});

app.post('/api/newsletter', (req, res) => {
  const { email } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Email invalide.' });
  }

  db.run('INSERT OR IGNORE INTO newsletter (email) VALUES (?)', [email], function (err) {
    if (err) {
      return res.status(500).json({ message: 'Impossible d’inscrire cet email.' });
    }

    return res.json({
      message: 'Inscription newsletter confirmée !',
      email
    });
  });
});

app.post('/api/checkout', (req, res) => {
  const {
    customerName,
    customerEmail,
    customerAddress,
    deliveryCity,
    deliveryMode,
    paymentMethod,
    items
  } = req.body || {};

  if (!customerName || !customerEmail || !customerAddress || !deliveryCity || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Données de commande incomplètes.' });
  }

  const total = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0) + 12;

  db.run(
    `INSERT INTO orders (customerName, customerEmail, customerAddress, deliveryCity, deliveryMode, paymentMethod, total, items)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [customerName, customerEmail, customerAddress, deliveryCity, deliveryMode, paymentMethod, total, JSON.stringify(items)],
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de l’enregistrement de la commande.' });
      }

      return res.json({
        message: `Commande validée ! Paiement ${paymentMethod} reçu.`,
        orderId: this.lastID,
        total
      });
    }
  );
});

app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY id DESC LIMIT 20', (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Impossible de récupérer les commandes.' });
    }

    return res.json(rows);
  });
});

app.get('/api/admin/orders', (req, res) => {
  db.all(
    'SELECT id, customerName, customerEmail, customerAddress, deliveryCity, deliveryMode, paymentMethod, total, createdAt FROM orders ORDER BY id DESC',
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: 'Impossible de récupérer les commandes admin.' });
      }

      const totalRevenue = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
      return res.json({
        totalOrders: rows.length,
        totalRevenue,
        orders: rows
      });
    }
  );
});

app.get('*', (req, res) => {
  const file = req.path === '/admin' || req.path === '/admin.html' ? 'admin.html' : 'index.html';
  res.sendFile(path.join(__dirname, file));
});

initDatabase();

app.listen(port, () => {
  console.log(`Serveur Glo Beauty démarré sur http://localhost:${port}`);
});
