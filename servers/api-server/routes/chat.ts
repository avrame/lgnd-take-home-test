import MCPClient from '../mcp-client';

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

export const chatWebSocketHandler = (ws: any) => {
  console.log('WebSocket connection established');

  ws.addEventListener('message', async(event: MessageEvent) => {
    console.log('Received message:', event.data);
    try {
      // Ensure MCP client is connected
      if (!mcpClient || mcpClient.tools.length === 0) {
        // Try to connect if not already connected
        try {
          await mcpClient.connect('http://localhost:3001/mcp');
        } catch (connectError) {
          ws.send(JSON.stringify({
            error: 'MCP server is not available. Please ensure the MCP server is running on port 3001.',
            details: connectError instanceof Error ? connectError.message : String(connectError)
          }));
          return;
        }
      }
  
      // Call MCP server to process the query
      await mcpClient.processQuery(JSON.parse(event.data).query, ws);
    } catch (error) {
      console.error('Chat query error:', error);
      ws.send(JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  });

  ws.addEventListener('close', () => {
    console.log('WebSocket connection closed');
  });
}