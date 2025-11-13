**Goal (what you’ll build)**

Create a simple application that uses LGND similarity search and OpenStreetMap (OSM) services to search through overhead imagery in the greater San Francisco area.  A few example queries are:

- Find imagery for coastal marinas.  
- Find imagery for airplanes (or airplots).  
- Find imagery for parking lots.

The solution should implement [an MCP Server](https://modelcontextprotocol.io/quickstart/server) that sorts through [Clay](https://github.com/Clay-foundation) geoembeddings — provided by the LGND team alongside OSM APIs.  The front-end client (your choice of framework) should talk to the MCP server, and surface the intermediate and final result through a chat and/or map interface.

**This challenge is intentionally big, the goal is not to finish the challenge but assess how each candidate approaches solving novel problems with software.  Please spend no more than 8 hours on your submission.**

**Submission**

- GitHub link (public or with access granted).  
- README that includes:  
  - How to run the application.  
  - A 3-minute demo (link to video, or just a slack recording)  
  - Any assumptions and known limitations.  
- A 60-minute technical discussion with a LGND engineer where you'll walk through your solution, explain your design decisions, and discuss trade-offs you considered.

**Measures of success**

- Provide a well-documented GitHub repo.  
- Implement in TypeScript or Python.  
- Bonus points for integrating the MCP server with one additional service (ex. Weather APIs).  
- Ability to discuss the solution with a LGND engineer in a follow-up interview.  This is the **most important** measure of success.

**What we provide**

- A static file containing a DuckDB database with \~567k Clay embeddings across the greater San Francisco area.  The embeddings were created by processing NAIP imagery (0.6m resolution) acquired during July 2022, and are provided as float32 with 1024 dimensions.  Each embedding represents a unique 160x160 meter subset of the earth.  
  - The raw parquet files used to create this DuckDB database are also available in the S3 bucket if you’d like to use a different technology to host and serve them.  
- A S3 bucket of RGB thumbnail images derived from the NAIP imagery used to produce each embedding in the dataset.

**Accessing the data**

First download the static DuckDB database from a public S3 bucket, the file is around \~4.2GiB.

| aws s3 cp \--no-sign-request s3://lgnd-fullstack-takehome/embeddings.db . |
| :---- |

Install [**DuckDB**](https://duckdb.org/docs/installation/?version=stable&environment=cli&platform=macos&download_method=direct)**,** then start the database:

| duckdb embeddings.db |
| :---- |

You’ll find the **embeddings** table in the database with the following schema:

| D SHOW embeddings;┌─────────────┬─────────────┬─────────┬─────────┬─────────┬─────────┐│ column\_name │ column\_type │  null   │   key   │ default │  extra  ││   varchar   │   varchar   │ varchar │ varchar │ varchar │ varchar │├─────────────┼─────────────┼─────────┼─────────┼─────────┼─────────┤│ chips\_id    │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    ││ vec         │ FLOAT\[1024\] │ YES     │ NULL    │ NULL    │ NULL    ││ geom\_wkt    │ VARCHAR     │ YES     │ NULL    │ NULL    │ NULL    ││ datetime    │ TIMESTAMP   │ YES     │ NULL    │ NULL    │ NULL    ││ geom        │ GEOMETRY    │ YES     │ NULL    │ NULL    │ NULL    │└─────────────┴─────────────┴─────────┴─────────┴─────────┴─────────┘ |
| :---- |

The table comes pre-built with two indexes:

- A spatial index on the **geom** column for fast spatial lookups.  
- A cosine similarity index on the **vec** column for fast similarity search.

| D SELECT table\_name, sql FROM duckdb\_indexes() WHERE table\_name \= 'embeddings';┌────────────┬────────────────────────────────────────────────────────────┐│ table\_name │                            sql                             ││  varchar   │                          varchar                           │├────────────┼────────────────────────────────────────────────────────────┤│ embeddings │ CREATE INDEX cosine\_idx ON embeddings USING HNSW (vec);    ││ embeddings │ CREATE INDEX spatial\_idx ON embeddings USING RTREE (geom); │└────────────┴────────────────────────────────────────────────────────────┘ |
| :---- |

For example, the query below finds the an embedding (chip) which intersects a query point, then leverages the cosine similarity index to find the top 5 similar chips:

| D WITH search\_embedding AS (      SELECT chips\_id as search\_chip\_id, vec      FROM embeddings      WHERE ST\_Contains(geom, ST\_Point(\-122.3159879, 37.8666071 ))      LIMIT 1  )  SELECT      e.chips\_id,      array\_cosine\_similarity(e.vec, se.vec) as similarity  FROM embeddings e  CROSS JOIN search\_embedding se  WHERE e.chips\_id \!= se.search\_chip\_id  ORDER BY similarity DESC  LIMIT 5;┌──────────────────────────────────────┬────────────┐ │               chips\_id               │ similarity │ │               varchar                │   float    │ ├──────────────────────────────────────┼────────────┤ │ 633e28ce-f77e-49ac-9759-bd43e1c57598 │ 0.97382945 │ │ c7a9bc0d-97f4-4902-8d6d-d1ce31886afb │  0.9680176 │ │ 0f4fdbd4-24be-46f6-bf05-51b1251b8ef6 │  0.9646782 │ │ 12157331-9301-45f3-baf2-8ce8baac79b7 │ 0.96353304 │ │ ffe3764d-3929-4cd3-99f9-1b906289c3e2 │  0.9606545 │ └──────────────────────────────────────┴────────────┘  |
| :---- |

You can fetch a thumbnail of each chip from the public **lgnd-fullstack-takehome-thumbnails** S3 bucket.  We have generated two thumbnails for each chip:

- Native resolution https://lgnd-fullstack-takehome-thumbnails.s3.us-east-2.amazonaws.com/{chips\_id}\_native.jpeg  
- Upsampled to 512 https://lgnd-fullstack-takehome-thumbnails.s3.us-east-2.amazonaws.com/{chips\_id}\_256.jpeg

Finally, the raw parquet files used to create this DuckDB database are available in S3 if you prefer to work with those directly:

| ❯ aws s3 ls s3://lgnd-fullstack-takehome/parquet\_export\_naip/ \--no-sign-request \--human-readable \--summarize2025-09-24 10:40:02  256.1 MiB 000.parquet 2025-09-24 10:40:09  256.3 MiB 001.parquet 2025-09-24 10:40:16  256.2 MiB 002.parquet 2025-09-24 10:40:23  256.1 MiB 003.parquet 2025-09-24 10:40:32  256.0 MiB 004.parquet 2025-09-24 10:40:39  256.2 MiB 005.parquet 2025-09-24 10:40:46  256.3 MiB 006.parquet 2025-09-24 10:40:54  256.3 MiB 007.parquet 2025-09-24 10:41:01  255.8 MiB 008.parquet 2025-09-24 10:41:08  255.9 MiB 009.parquet 2025-09-24 10:41:17  256.0 MiB 010.parquet 2025-09-24 10:41:24  256.0 MiB 011.parquet … … Total Objects: 32    Total Size: 7.8 GiB |
| :---- |

The embeddings contained within the DuckDB database cover the following geographic area:  
![][image1]  
Zooming into the embeddings, you’ll notice that each embedding represents a unique 160mx160m location on the earth.

![][image2]

**Reference implementations for inspiration (great examples)**

- [Great example of a client interaction](https://www.linkedin.com/posts/activity-7366080510239883265-r-tf)   
- [Geoapify MCP Example Repository](https://github.com/burningion/geoapify-mcp)  
- [Model Context Protocol Quickstart](https://modelcontextprotocol.io/quickstart/server)

