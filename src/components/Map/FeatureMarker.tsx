import { useState } from "react";
import { Marker, Popup } from "react-leaflet"

export default function FeatureMarker({ feature }: { feature: any }) {
  const [selectedEmbedding, setSelectedEmbedding] = useState<any | null>(null);

  const handleSelectEmbedding = (e: React.MouseEvent<HTMLButtonElement>, embedding: any) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEmbedding(embedding);
  }

  return (
    <Marker key={feature.name} position={[feature.lat, feature.lon]}>
      <Popup minWidth={500} maxWidth={700} closeButton={false}>
        <h3>{feature.name || 'Unnamed feature'}</h3>
        {selectedEmbedding
          ? (
            <div className="selected-embedding">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedEmbedding(null)
                }}
              >
                &larr; Back to similar embeddings
              </button>
              <img src={`https://lgnd-fullstack-takehome-thumbnails.s3.us-east-2.amazonaws.com/${selectedEmbedding.chips_id}_native.jpeg`}
                alt={selectedEmbedding.chips_id}
                width={270}
              />
              <EmbeddingInfo embedding={selectedEmbedding} />
            </div>
          )
          : (
            <div className="similar-embeddings">
              {feature.similarEmbeddings.map((embedding: any) => {
                return (
                  <button key={embedding.chips_id} onClick={(e) => handleSelectEmbedding(e, embedding)}>
                    <img src={`https://lgnd-fullstack-takehome-thumbnails.s3.us-east-2.amazonaws.com/${embedding.chips_id}_256.jpeg`}
                      alt={embedding.chips_id}
                      width={128}
                    />
                    <EmbeddingInfo embedding={embedding} />
                  </button>
                )
              })}
            </div>
            )
          }
      </Popup>
    </Marker>
  )
}

function EmbeddingInfo({ embedding }: { embedding: any }) {
  return (
    <ul className="embedding-info">
      <li>Similarity: <b>{embedding.similarity.toFixed(4)}</b></li>
      <li>Timestamp: <b>{new Date(embedding.datetime).toLocaleString()}</b></li>
    </ul>
  )
}