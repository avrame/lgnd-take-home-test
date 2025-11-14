import express from 'express';
import MCPClient from '../mcp-client';
import { Request, Response } from 'express';

const router = express.Router();
const mcpClient = new MCPClient();

// Connect to MCP server with retry logic
async function connectToMCPServer() {
  const maxRetries = 10;
  const retryDelay = 1000; // 1 second
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await mcpClient.connect('http://localhost:3001/mcp');
      console.log('Successfully connected to MCP server');
      return;
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error('Failed to connect to MCP server after', maxRetries, 'attempts:', error);
        throw error;
      }
      console.log(`MCP server not ready, retrying in ${retryDelay}ms... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Start connection (don't block server startup)
connectToMCPServer().catch(err => {
  console.error('Failed to connect to MCP server:', err);
});

router.post('/search_map_features', async (req: Request, res: Response) => {
  try {
    // Ensure MCP client is connected
    if (!mcpClient || mcpClient.tools.length === 0) {
      // Try to connect if not already connected
      try {
        await mcpClient.connect('http://localhost:3001/mcp');
      } catch (connectError) {
        return res.status(503).json({
          error: 'MCP server is not available. Please ensure the MCP server is running on port 3001.',
          details: connectError instanceof Error ? connectError.message : String(connectError)
        });
      }
    }

    // Call MCP server to process the query
    const response = await mcpClient.processQuery(req.body.query);

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Chat query error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;