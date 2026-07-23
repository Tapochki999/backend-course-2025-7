require('dotenv').config(); 

const { program } = require('commander');
const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const mysql = require('mysql2/promise');

program
  .requiredOption('-h, --host <type>', 'Host address')
  .requiredOption('-p, --port <type>', 'Server port')
  .requiredOption('-c, --cache <type>', 'Cache directory path');

program.parse(process.argv);
const options = program.opts();

const host = options.host;
const port = parseInt(options.port, 10);
const cache = path.resolve(options.cache);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
});


const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Inventory API', version: '1.0.0' },
    servers: [{ url: `http://${host}:${port}` }]
  },
  apis: [__filename]
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);

const app = express();
app.use(express.static(path.join(__dirname, "/public")));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: cache });

app.get('/RegisterForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

app.get('/Output.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Output.html'));
});

app.get('/SearchForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'SearchForm.html'));
});

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register new item
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               inventory_name:
 *                 type: string
 *               description:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad Request
 */
app.post('/register', upload.single('photo'), async (req, res) => {
  const { inventory_name, description } = req.body;

  if (!inventory_name) {
    return res.status(400).send('Bad Request: inventory_name is required');
  }

  const photoPath = req.file ? req.file.path : null;

  try {
    const [result] = await pool.execute(
      'INSERT INTO inventory (name, description, photoPath) VALUES (?, ?, ?)',
      [inventory_name, description || '', photoPath]
    );

    const newItem = {
      id: result.insertId,
      name: inventory_name,
      description: description || '',
      photoPath
    };

    console.log('New item registered in DB:', newItem);
    return res.status(201).json(newItem);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database Error');
  }
});

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: Get all items
 *     responses:
 *       200:
 *         description: List of items
 */
app.get('/inventory', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inventory');
    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database Error');
  }
});

/**
 * @swagger
 * /inventory/{id}:
 *   get:
 *     summary: Get item by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item found
 *       404:
 *         description: Not Found
 */
app.get('/inventory/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).send('Not Found');
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database Error');
  }
});

/**
 * @swagger
 * /inventory/{id}:
 *   put:
 *     summary: Update item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not Found
 */
app.put('/inventory/:id', async (req, res) => {
  const { name, description } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).send('Not Found');

    const oldItem = rows[0];
    const newName = name || oldItem.name;
    const newDesc = description || oldItem.description;

    await pool.execute('UPDATE inventory SET name = ?, description = ? WHERE id = ?', [
      newName,
      newDesc,
      req.params.id
    ]);

    return res.status(200).json({ id: Number(req.params.id), name: newName, description: newDesc });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database Error');
  }
});

/**
 * @swagger
 * /inventory/{id}/photo:
 *   get:
 *     summary: Get item photo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Photo file
 *       404:
 *         description: Not Found
 */
app.get('/inventory/:id/photo', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT photoPath FROM inventory WHERE id = ?', [req.params.id]);
    if (rows.length === 0 || !rows[0].photoPath) return res.status(404).send('Not Found');

    res.setHeader('Content-Type', 'image/jpeg');
    return res.sendFile(path.resolve(rows[0].photoPath));
  } catch (err) {
    console.error(err);
    if (err.code === 'ENOENT') return res.status(404).send('File missing on disk');
    return res.status(500).send('Database Error');
  }
});

/**
 * @swagger
 * /inventory/{id}/photo:
 *   put:
 *     summary: Update item photo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo updated
 *       404:
 *         description: Not Found
 */
app.put('/inventory/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).send('Not Found');
    }

    const item = rows[0];
    if (item.photoPath) await fs.unlink(item.photoPath).catch(err => console.error('Error deleting old photo:', err));

    const newPhotoPath = req.file ? req.file.path : null;
    await pool.execute('UPDATE inventory SET photoPath = ? WHERE id = ?', [newPhotoPath, req.params.id]);

    return res.status(200).json({ ...item, photoPath: newPhotoPath });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database Error');
  }
});

/**
 * @swagger
 * /inventory/{id}:
 *   delete:
 *     summary: Delete item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not Found
 */
app.delete('/inventory/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).send('Not Found');

    const item = rows[0];
    await pool.execute('DELETE FROM inventory WHERE id = ?', [req.params.id]);

    if (item.photoPath) await fs.unlink(item.photoPath).catch(err => console.error('Error deleting photo file:', err));

    console.log('Item deleted:', item);
    return res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database Error');
  }
});

/**
 * @swagger
 * /search:
 *   post:
 *     summary: Search item
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               has_photo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Found
 *       404:
 *         description: Not Found
 */
app.post('/search', async (req, res) => {
  const { id, has_photo } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).send('Not Found');

    const item = rows[0];
    const result = { ...item };
    if (has_photo === 'on' || has_photo === true || has_photo === 'true') {
      const photoUrl = `http://${host}:${port}/inventory/${item.id}/photo`;
      result.description += ` (Photo: ${photoUrl})`;
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Database Error');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

async function startServer() {
  try {
    await fs.access(cache);
    console.log('Cache directory found');
  } catch (error) {
    try {
      await fs.mkdir(cache, { recursive: true });
      console.log('Cache directory created');
    } catch {
      console.error('Cache directory creation error');
      process.exit(1);
    }
  }

  let retries = 5;
  while (retries > 0) {
    try {
      const conn = await pool.getConnection();
      console.log('Connected to MySQL');
      conn.release();
      break; 
    } catch (err) {
      console.error(`DB connection error: ${err.message}. Retries left: ${retries}`);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  if (retries === 0) {
    console.error('Could not connect to database after multiple attempts. Exiting.');
    process.exit(1);
  }

  app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
    console.log(`Swagger docs at http://localhost:${port}/docs`);
  });
}

startServer();
