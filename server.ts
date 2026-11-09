/**
 * Full-Stack Express Server with Vite middlewares in development.
 * Implements REST API for authentication, saved designs, templates and asset uploads.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory / mock database store for standalone runtime
const db = {
  users: [
    {
      id: 'usr_guest',
      email: 'creator@radialqr.art',
      name: 'Elena Rostova',
      role: 'Creative Technologist',
      createdAt: new Date().toISOString(),
    },
  ],
  designs: [
    {
      id: 'dsg_demo_1',
      userId: 'usr_guest',
      name: 'Cyber Wedge Launch',
      codeType: 'radial',
      contentType: 'url',
      payload: 'https://radialqr.art',
      config: {
        family: 'radial-angular',
        fgColor: '#00C8FF',
        fgColorEnd: '#176BFF',
        bgColor: '#090B10',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  assets: [] as Array<{ id: string; name: string; url: string; size: number; createdAt: string }>,
};

// --- AUTH API ---
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  const newUser = {
    id: `usr_${Date.now()}`,
    email,
    name: name || email.split('@')[0],
    role: 'Creator',
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  res.json({ user: newUser, token: `jwt_${Date.now()}` });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  const user = db.users.find((u) => u.email === email) || db.users[0];
  res.json({ user, token: `jwt_${Date.now()}` });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/users/me', (_req: Request, res: Response) => {
  res.json({ user: db.users[0] });
});

// --- DESIGNS API ---
app.get('/api/designs', (_req: Request, res: Response) => {
  res.json({ designs: db.designs });
});

app.post('/api/designs', (req: Request, res: Response) => {
  const { name, codeType, contentType, payload, config } = req.body;
  if (!name || !payload) {
    res.status(400).json({ error: 'Name and payload required' });
    return;
  }
  const newDesign = {
    id: `dsg_${Date.now()}`,
    userId: 'usr_guest',
    name,
    codeType: codeType || 'radial',
    contentType: contentType || 'url',
    payload,
    config: config || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.designs.unshift(newDesign);
  res.status(201).json(newDesign);
});

app.get('/api/designs/:id', (req: Request, res: Response) => {
  const design = db.designs.find((d) => d.id === req.params.id);
  if (!design) {
    res.status(404).json({ error: 'Design not found' });
    return;
  }
  res.json(design);
});

app.patch('/api/designs/:id', (req: Request, res: Response) => {
  const idx = db.designs.findIndex((d) => d.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Design not found' });
    return;
  }
  db.designs[idx] = {
    ...db.designs[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  res.json(db.designs[idx]);
});

app.delete('/api/designs/:id', (req: Request, res: Response) => {
  const idx = db.designs.findIndex((d) => d.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Design not found' });
    return;
  }
  db.designs.splice(idx, 1);
  res.json({ success: true, id: req.params.id });
});

// --- ASSETS API ---
app.post('/api/assets', (req: Request, res: Response) => {
  const { name, dataUrl } = req.body;
  if (!dataUrl) {
    res.status(400).json({ error: 'dataUrl required' });
    return;
  }
  const asset = {
    id: `ast_${Date.now()}`,
    name: name || 'Uploaded Logo',
    url: dataUrl,
    size: Math.round(dataUrl.length * 0.75),
    createdAt: new Date().toISOString(),
  };
  db.assets.push(asset);
  res.status(201).json(asset);
});

app.delete('/api/assets/:id', (req: Request, res: Response) => {
  const idx = db.assets.findIndex((a) => a.id === req.params.id);
  if (idx !== -1) db.assets.splice(idx, 1);
  res.json({ success: true });
});

// --- HEALTH API ---
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    engine: 'RADIAL QR Express API',
    timestamp: new Date().toISOString(),
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RADIAL QR] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
