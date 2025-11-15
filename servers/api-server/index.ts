import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import expressWs from 'express-ws';
import { chatWebSocketHandler } from './routes/chat';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
expressWs(app);

// HTTP routes
// app.use('/api/chat', chatRoutes);

// WebSocket route
app.ws('/api/chat', chatWebSocketHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-server' });
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
