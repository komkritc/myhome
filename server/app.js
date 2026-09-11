import express from 'express';
import cors from 'cors';
import { resolve } from 'path';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import roomsRouter from './routes/rooms.js';
import tenantsRouter from './routes/tenants.js';
import metersRouter from './routes/meters.js';
import invoicesRouter from './routes/invoices.js';
import paymentsRouter from './routes/payments.js';
import dashboardRouter from './routes/dashboard.js';
import settingsRouter from './routes/settings.js';
import expensesRouter from './routes/expenses.js';
import deviceMetersRouter from './routes/device-meters.js';
import meterReadingsRouter from './routes/meter-readings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(resolve(__dirname, '_data', 'uploads')));

// API Routes
app.use('/api/rooms', roomsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/meters', metersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/device-meters', deviceMetersRouter);
app.use('/api/meter-readings', meterReadingsRouter);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve(__dirname, '../client/dist')));
  
  // Catch-all route to serve SPA
  app.get('*', (req, res) => {
    res.sendFile(resolve(__dirname, '../client/dist/index.html'));
  });
}

// Start server
app.listen(PORT, HOST, () => {
  console.log(`📊 Dormitory Management System API server running on http://${HOST}:${PORT}`);
});

export default app;
