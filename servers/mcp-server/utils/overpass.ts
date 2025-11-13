import axios from "axios";

export interface QueryOptions {
    /** Search by place name (case-insensitive regex match) */
    name?: string;
    /** Search by OSM tags, e.g., { leisure: 'marina' } or { amenity: 'parking' } */
    tags?: Record<string, string>;
    /** Optional bounding box [south, west, north, east] to limit search area */
    bbox?: [number, number, number, number];
    /** Maximum number of OSM elements to return (default: 5) */
    limit?: number;
}

/**
 * Query Overpass API to find coordinates for features
 * Supports both name-based and tag-based searches (or both combined)
 * 
 * @param options - Query options with name, tags, and/or bbox
 * @returns Promise with Overpass API response containing elements with coordinates
 * 
 * @example
 * // Search by name
 * await queryOverpass({ name: "Golden Gate Bridge" });
 * 
 * // Search by tags (e.g., marinas)
 * await queryOverpass({ tags: { leisure: 'marina' } });
 * 
 * // Search by tags with bounding box (e.g., parking lots in SF)
 * await queryOverpass({ 
 *   tags: { amenity: 'parking' },
 *   bbox: [37.7, -122.5, 37.8, -122.3]
 * });
 * 
 * // Combine name and tags
 * await queryOverpass({ 
 *   name: "marina",
 *   tags: { leisure: 'marina' }
 * });
 */
async function queryOverpass(options: QueryOptions) {
  console.log('Querying Overpass API with options', options);
    const { name, tags, bbox, limit = 5 } = options;
    
    if (!name && !tags) {
        throw new Error('Either name or tags must be provided');
    }
    
    // Build tag filters
    let tagFilter = '';
    if (tags) {
        const tagConditions = Object.entries(tags).map(([key, value]) => {
            // Support wildcard searches (e.g., parking=*)
            if (value === '*') {
                return `["${key}"]`;
            }
            return `["${key}"="${value}"]`;
        });
        tagFilter = tagConditions.join('');
    }
    
    // Build name filter
    // Don't encode the name here - it will be encoded when we encode the entire query
    // Escape special regex characters in the name pattern
    let nameFilter = '';
    if (name) {
        // Escape special regex characters but keep it as a regex pattern
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        nameFilter = `["name"~"${escapedName}",i]`;
    }
    
    // Combine filters
    const combinedFilter = tagFilter + nameFilter;
    
    // Build Overpass QL query
    // In Overpass QL, bounding box comes before the filter: node(bbox)[filter]
    let overpassQuery: string;
    
    if (bbox) {
        const [south, west, north, east] = bbox;
        // Bounding box format: (south,west,north,east) - comes after element type
        overpassQuery = `[out:json];
(
  node(${south},${west},${north},${east})${combinedFilter};
  way(${south},${west},${north},${east})${combinedFilter};
  relation(${south},${west},${north},${east})${combinedFilter};
);
out center;`;
    } else {
        // No bounding box - search globally
        overpassQuery = `[out:json];
(
  node${combinedFilter};
  way${combinedFilter};
  relation${combinedFilter};
);
out center;`;
    }
    
    console.log('Overpass QL query:', overpassQuery);
    
    // URL encode the entire query
    const encodedQuery = encodeURIComponent(overpassQuery);
    
    const url = `https://overpass-api.de/api/interpreter?data=${encodedQuery}`;
    console.log('Overpass API URL (decoded for debugging):', decodeURIComponent(encodedQuery).substring(0, 300));
    
    try {
        const response = await axios.get(url, {
            timeout: 30000 // 30 second timeout
        });
        console.log('Overpass API response status:', response.status);
        console.log('Overpass API response elements count:', response.data?.elements?.length || 0);
        
        // If no results and we have a bbox, log a warning
        if (response.data?.elements?.length === 0 && bbox) {
            console.warn('No results found. This could mean:');
            console.warn('1. No features match the tags/name in this area');
            console.warn('2. The bounding box might be incorrect');
            console.warn('3. The query syntax might need adjustment');
            console.warn('Bounding box used:', bbox);
        }
        
        return response.data.elements.slice(0, limit);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Overpass API error details:');
            console.error('Status:', error.response?.status);
            console.error('Status text:', error.response?.statusText);
            // console.error('Response data:', error.response?.data);
            console.error('Request URL:', error.config?.url);
        } else {
            console.error('Overpass API error:', error);
        }
        throw error;
    }
}

export default queryOverpass;