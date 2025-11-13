import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import queryOverpass from './utils/overpass';
import { findSimilarEmbeddings, getBoundingBox } from './utils/duckdb';

// San Francisco bounding box [south, west, north, east]
// Fallback bounding box - expanded to cover greater SF area including bay
const SF_BBOX_FALLBACK: [number, number, number, number] = [
  37.7,   // south
  -122.6, // west
  37.85,  // north
  -122.3  // east
]

// Cache for dynamically loaded bounding box
let cachedBbox: [number, number, number, number] | null = null;

/**
 * Get the San Francisco bounding box, either from DuckDB or fallback to hardcoded value
 * Results are cached after first successful query
 */
async function getSFBoundingBox(): Promise<[number, number, number, number]> {
    if (cachedBbox) {
        return cachedBbox;
    }

    const bbox = await getBoundingBox();
    if (bbox) {
        cachedBbox = bbox;
        console.log('Using bounding box from DuckDB:', bbox);
        return bbox;
    }

    console.log('Using fallback bounding box:', SF_BBOX_FALLBACK);
    return SF_BBOX_FALLBACK;
}

// Create an MCP server
const server = new McpServer({
    name: 'mcp-server',
    version: '1.0.0'
});

// Add map search tool
server.registerTool(
  'search_san_francisco_map',
  {
      title: 'Search San Francisco Map Tool',
      description: `Search OpenStreetMap data in the San Francisco area for geographic features and find similar imagery chip embeddings from the DuckDB database.
This tool searches for features by name and/or OSM tags. Use OSM tags for more reliable results when searching for specific feature types.`,
      inputSchema: {
        name: z.string().optional().describe('Search by place name (case-insensitive regex match)'),
        tags: z.record(
          z.string(),
          z.string()
        ).optional().describe(
          'Search by OSM tags as key-value pairs, e.g., { "leisure": "marina" } or { "amenity": "parking" }. Use "*" as value for wildcard matches.'
        ),
      },
        outputSchema: {}
    },
    async ({ name, tags }) => {
      try {
        // Get bounding box from DuckDB (or fallback)
        const bbox = await getSFBoundingBox();
        
        // Query Overpass API for OSM features
        const features = await queryOverpass({
          name,
          tags,
          bbox,
        });

        // console.log('Overpass features:', features);

        for (const feature of features) {
          const embeddings = await findSimilarEmbeddings(feature.lon, feature.lat);
          console.log('Feature:', feature);
          console.log('Embeddings:', embeddings);
        }

        const output = {}
        
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output
        };
      } catch (error) {
        console.error('Error querying Overpass API:', error);
        return {
          content: [{ type: 'text', text: 'Error querying Overpass API' }],
          structuredContent: { error: 'Error querying Overpass API' }
        };
      }
    }
);

// Set up Express and HTTP transport
const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
    // Create a new transport for each request to prevent request ID collisions
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    res.on('close', () => {
        transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || '3000');
app.listen(port, () => {
    console.log(`Demo MCP Server running on http://localhost:${port}/mcp`);
}).on('error', error => {
    console.error('Server error:', error);
    process.exit(1);
});