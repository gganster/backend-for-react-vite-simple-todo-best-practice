require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://admin:admin123@localhost:5433/todo_db",
});

let dbConnected = false;

// Gestion des erreurs du pool pour éviter les crashes
pool.on('error', (err) => {
  console.error(new Date().toISOString(), '❌ Unexpected database error', err.message);
  dbConnected = false;
});

pool.on('connect', () => {
  console.log(new Date().toISOString(), '🔌 New database connection established');
  dbConnected = true;
});

// Initialize database
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        state BOOLEAN DEFAULT false
      )
    `);
    dbConnected = true;
    console.log('✅ Database connected and initialized');
  } catch (error) {
    dbConnected = false;
    console.error('❌ Database initialization failed:', error.message);
  }
}

// Retry connection toutes les 10 secondes si échec
async function ensureConnection() {
  if (!dbConnected) {
    await initDB();
  }
}

initDB();
setInterval(ensureConnection, 10000);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Middleware to check DB connection
const requireDB = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({ 
      error: 'Database unavailable',
      message: 'Service temporarily unavailable. Please try again later.'
    });
  }
  next();
};

// GET /status - Vérifier la connexion à la base de données
app.get('/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(200).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// GET /tasks - Récupérer toutes les tâches
app.get('/tasks', requireDB, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Database query error:', error.message);
    dbConnected = false;
    res.status(500).json({ error: 'Database error', message: error.message });
  }
});

// GET /tasks/:id - Récupérer une tâche par ID
app.get('/tasks/:id', requireDB, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Database query error:', error.message);
    dbConnected = false;
    res.status(500).json({ error: 'Database error', message: error.message });
  }
});

// POST /tasks - Créer une nouvelle tâche
app.post('/tasks', requireDB, async (req, res) => {
  const { title, state } = req.body;
  
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Title is required and must be a string' });
  }
  
  try {
    const id = randomUUID();
    const taskState = state === true ? true : false;
    
    const result = await pool.query(
      'INSERT INTO tasks (id, title, state) VALUES ($1, $2, $3) RETURNING *',
      [id, title, taskState]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Database query error:', error.message);
    dbConnected = false;
    res.status(500).json({ error: 'Database error', message: error.message });
  }
});

// PUT /tasks/:id - Mettre à jour une tâche
app.put('/tasks/:id', requireDB, async (req, res) => {
  const { id } = req.params;
  const { title, state } = req.body;
  
  try {
    // Vérifier si la tâche existe
    const checkResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Construire la requête de mise à jour
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      if (typeof title !== 'string') {
        return res.status(400).json({ error: 'Title must be a string' });
      }
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    
    if (state !== undefined) {
      if (typeof state !== 'boolean') {
        return res.status(400).json({ error: 'State must be a boolean' });
      }
      updates.push(`state = $${paramCount++}`);
      values.push(state);
    }
    
    if (updates.length === 0) {
      return res.json(checkResult.rows[0]);
    }
    
    values.push(id);
    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Database query error:', error.message);
    dbConnected = false;
    res.status(500).json({ error: 'Database error', message: error.message });
  }
});

// DELETE /tasks/:id - Supprimer une tâche
app.delete('/tasks/:id', requireDB, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Database query error:', error.message);
    dbConnected = false;
    res.status(500).json({ error: 'Database error', message: error.message });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  try {
    await pool.end();
  } catch (error) {
    console.error('Error closing pool:', error.message);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  try {
    await pool.end();
  } catch (error) {
    console.error('Error closing pool:', error.message);
  }
  process.exit(0);
});

// Éviter les crashes sur les erreurs non gérées
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  dbConnected = false;
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  dbConnected = false;
});
