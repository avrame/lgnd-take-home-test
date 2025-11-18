import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api';
import path from 'path';

const DB_PATH = process.env.DUCKDB_PATH || path.join(process.cwd(), 'embeddings.db');

// Create a single DuckDB instance (can be reused)
let dbInstance: DuckDBInstance | null = null;
let spatialExtensionLogged = false;

/**
 * Get or create a DuckDB instance
 */
async function getDbInstance(): Promise<DuckDBInstance> {
    if (!dbInstance) {
        dbInstance = await DuckDBInstance.create(DB_PATH, { access_mode: 'READ_ONLY' });
    }
    return dbInstance;
}

/**
 * Get a connection for querying
 * Loads the spatial extension for spatial functions (ST_Contains, ST_Point, etc.)
 */
async function getConnection(): Promise<DuckDBConnection> {
    const db = await getDbInstance();
    const conn = await db.connect();
    
    // Load spatial extension (needed for ST_Contains, ST_Point, ST_Intersects, etc.)
    // Extensions need to be loaded per connection
    try {
        await conn.run('LOAD spatial;');
        // Only log once to avoid spam
        if (!spatialExtensionLogged) {
            console.log('Spatial extension loaded');
            spatialExtensionLogged = true;
        }
    } catch (loadError: any) {
        // Extension might already be loaded, or might not be available
        // Check if error indicates it's already loaded
        const errorMsg = loadError.message || String(loadError);
        if (errorMsg.includes('already loaded') || errorMsg.includes('Extension') && errorMsg.includes('loaded')) {
            // Already loaded, that's fine - only log warning once
            if (!spatialExtensionLogged) {
                console.log('Spatial extension already loaded');
                spatialExtensionLogged = true;
            }
        } else {
            // Only log error once
            if (!spatialExtensionLogged) {
                console.warn('Could not load spatial extension:', errorMsg);
                console.warn('Spatial functions may not work. Make sure spatial extension is available.');
                spatialExtensionLogged = true;
            }
        }
    }
    
    return conn;
}

export interface EmbeddingResult {
    chips_id: string;
    similarity?: number;
    geom_wkt: string;
    datetime: string;
}

/**
 * Get the bounding box of all embeddings in the database
 * @returns Bounding box as [south, west, north, east] tuple, or null if query fails
 */
export async function getBoundingBox(): Promise<[number, number, number, number] | null> {
    const conn = await getConnection();

    try {
        // Extract min/max coordinates directly from all geometries
        // Using ST_YMin/ST_YMax and ST_XMin/ST_XMax which work on any geometry type
        const query = `
            SELECT 
                MIN(ST_YMin(geom)) as south,
                MIN(ST_XMin(geom)) as west,
                MAX(ST_YMax(geom)) as north,
                MAX(ST_XMax(geom)) as east
            FROM embeddings
            WHERE geom IS NOT NULL
        `;

        const reader = await conn.runAndReadAll(query);
        await reader.readAll();
        
        const results = reader.getRowObjectsJS() as Array<{
            south: number;
            west: number;
            north: number;
            east: number;
        }>;

        if (results.length === 0 || results[0].south === null || results[0].south === undefined) {
            console.warn('No bounding box found in embeddings table');
            return null;
        }

        const bbox = results[0];
        console.log('Raw bounding box from DuckDB:', bbox);
        console.log('Bounding box as array [south, west, north, east]:', [bbox.south, bbox.west, bbox.north, bbox.east]);
        return [bbox.south, bbox.west, bbox.north, bbox.east];
    } catch (error) {
        console.error('Error getting bounding box from DuckDB:', error);
        return null;
    } finally {
        conn.closeSync();
    }
}

export interface FeaturePoint {
    feature_index: number;
    lon: number;
    lat: number;
}

/**
 * Find similar embeddings for multiple features using parallel queries
 * Uses multiple connections from the same DuckDB instance for true parallelism
 * @param features - Array of feature points with indices
 * @param similarLimit - Number of similar embeddings to return per feature (default: 5)
 * @returns Array of embedding results with feature_index
 */
export async function findSimilarEmbeddingsBatch(
    features: Array<{ feature_index: number; lon: number; lat: number }>,
    similarLimit: number = 6
): Promise<Array<{ feature_index: number } & EmbeddingResult>> {
    if (features.length === 0) {
        return [];
    }

    console.log(`Finding similar embeddings for ${features.length} features in parallel`);

    // Create all connections upfront from the same instance
    const connections = await Promise.all(
        features.map(() => getConnection())
    );

    try {
        // Execute all queries in parallel
        const promises = features.map(async (feature, index) => {
            const conn = connections[index];
            const query = `
                WITH search_embedding AS (
                    SELECT chips_id as search_chip_id, vec
                    FROM embeddings
                    WHERE ST_Contains(geom, ST_Point(?, ?))
                    LIMIT 1
                )
                SELECT
                    ? as feature_index,
                    e.chips_id,
                    array_cosine_similarity(e.vec, se.vec) as similarity,
                    e.geom_wkt,
                    e.datetime
                FROM embeddings e
                CROSS JOIN search_embedding se
                WHERE e.chips_id != se.search_chip_id
                ORDER BY similarity DESC
                LIMIT ?
            `;

            const reader = await conn.runAndReadAll(query, [
                feature.lon,
                feature.lat,
                feature.feature_index,
                similarLimit
            ]);
            await reader.readAll();
            
            return reader.getRowObjectsJS() as unknown as Array<{ feature_index: number } & EmbeddingResult>;
        });

        const results = await Promise.all(promises);
        
        // Close all connections
        connections.forEach(conn => conn.closeSync());
        
        return results.flat();
    } catch (error) {
        console.error('Error finding similar embeddings in batch:', error);
        // Ensure all connections are closed even on error
        connections.forEach(conn => {
            try {
                conn.closeSync();
            } catch (e) {
                // Ignore errors during cleanup
            }
        });
        return [];
    }
}
