import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import chatRoutes from './routes/chat';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// HTTP routes
app.use('/api/chat', chatRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-server' });
});

// WebSocket server for real-time chat
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});