import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import queryOverpass from '../utils/overpass';
import { EmbeddingResult, findSimilarEmbeddingsBatch, getBoundingBox } from '../utils/duckdb';

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
This tool searches for features by name and/or OSM tags. Use OSM tags for more reliable results when searching for specific feature types.

SUPPORTED OSM TAGS (examples):
- Marinas: { "leisure": "marina" } or { "amenity": "marina" }
- Airports/Airfields: { "aeroway": "aerodrome" } or { "aeroway": "airport" }
- Parking lots: { "amenity": "parking" } or { "parking": "*" } (wildcard)
- Other common tags:
  - { "amenity": "restaurant" } - restaurants
  - { "amenity": "school" } - schools
  - { "leisure": "park" } - parks
  - { "highway": "residential" } - residential roads
  - { "landuse": "residential" } - residential areas
  - { "natural": "water" } - water bodies
  - { "waterway": "river" } - rivers

You can combine name and tags for more specific searches. The tool searches nodes, ways, and relations to find both point locations and area features.

Returns OSM elements with their coordinates and similar imagery chip embeddings from the DuckDB database. For each OSM feature, the tool finds similar imagery chips using cosine similarity search, which helps discover imagery that visually matches the feature type (e.g., finding imagery that looks like marinas, parking lots, etc.). Each embedding represents a 160x160 meter area and includes a chips_id that can be used to fetch thumbnail images.

Please output your response in nicely formatted markdown.

# Example Response

## Feature 1
- Name: Golden Gate Bridge
- Coordinates: 37.819928, -122.479659
- Similar Embeddings:
  - Chips ID: 1234567890
    - Similarity: 0.95
    - Geometry: Point(37.819928, -122.479659)
    - Timestamp: 2021-01-01 12:00:00
  - Chips ID: 1234567891
    - Similarity: 0.90
    - Geometry: Point(37.819928, -122.479659)
    - Timestamp: 2021-01-01 12:00:00
  - Chips ID: 1234567892
    - Similarity: 0.85
    - Geometry: Point(37.819928, -122.479659)
    - Timestamp: 2021-01-01 12:00:00
  - Chips ID: 1234567893
`,

      inputSchema: {
        name: z.string().optional().describe('Search by place name (case-insensitive regex match)'),
        tags: z.record(
          z.string(),
          z.string()
        ).optional().describe(
          'Search by OSM tags as key-value pairs, e.g., { "leisure": "marina" } or { "amenity": "parking" }. Use "*" as value for wildcard matches.'
        ),
      },
        outputSchema: {
          features: z.array(z.object({
            name: z.string(),
            lon: z.number(),
            lat: z.number(),
            similarEmbeddings: z.array(z.object({
              chips_id: z.string().describe('Unique identifier for the imagery chip (used to fetch thumbnails from S3)'),
              similarity: z.number().describe('Cosine similarity score (0-1, higher is more similar)'),
              geom_wkt: z.string().describe('Geometry in Well-Known Text format'),
              datetime: z.string().describe('Timestamp when the imagery was captured'),
            })).max(5).describe('The top 5 most similar embeddings from the DuckDB database')
          })).describe('The features found in the San Francisco area')
        }
    },
    async ({ name, tags }) => {
      try {
        // Get bounding box from DuckDB (or fallback)
        const bbox = await getSFBoundingBox();
        
        // Query Overpass API for OSM features
        const osmFeatures = await queryOverpass({
          name,
          tags,
          bbox,
        });

        const features = osmFeatures.map((feature, index) => ({
            feature_index: index,
            lon: feature?.lon || 0,
            lat: feature?.lat || 0,
        }));

        const allEmbeddings = await findSimilarEmbeddingsBatch(features);

        // Group embeddings by feature_index
        const embeddingsByFeature = new Map<number, EmbeddingResult[]>();
        allEmbeddings.forEach(emb => {
            if (!embeddingsByFeature.has(emb.feature_index)) {
                embeddingsByFeature.set(emb.feature_index, []);
            }
            embeddingsByFeature.get(emb.feature_index)!.push({
                chips_id: emb.chips_id,
                similarity: emb.similarity,
                geom_wkt: emb.geom_wkt,
                datetime: emb.datetime,
            });
        });

        const featuresWithEmbeddings = osmFeatures.map((feature, index) => ({
            name: feature?.tags?.name || '',
            lon: feature?.lon || 0,
            lat: feature?.lat || 0,
            similarEmbeddings: embeddingsByFeature.get(index) || []
        }));

        const output = { features: featuresWithEmbeddings }

        console.log('Output:', output);
        
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

const port = parseInt(process.env.PORT || '3001');
app.listen(port, () => {
    console.log(`Demo MCP Server running on http://localhost:${port}/mcp`);
}).on('error', error => {
    console.error('Server error:', error);
    process.exit(1);
});