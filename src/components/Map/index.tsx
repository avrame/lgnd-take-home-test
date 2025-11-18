import { MapContainer, TileLayer, Rectangle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import './Map.css';

const nwCorner = L.latLng(38.358605821056415, -122.97903506362721)
const seCorner = L.latLng(37.031979877829684, -121.56504250845597)
const sanFranciscoBounds = L.latLngBounds(nwCorner, seCorner);
const sanFranciscoCenter = sanFranciscoBounds.getCenter();

export default function Map({ features }: { features: any }) {
  console.log('features', features);

  return (
    <div className="map-container">
      <div className="leaflet-container">
        <MapContainer center={sanFranciscoCenter} bounds={sanFranciscoBounds} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Rectangle
            bounds={sanFranciscoBounds}
            color="blue"
            weight={2}
            opacity={0.5}
            fillOpacity={0.1}
          />
          {features.map((feature: any) => (
            <Marker key={feature.name} position={[feature.lat, feature.lon]}>
              <Popup>
                <div>
                  <h3>{feature.name}</h3>
                  <div className="similar-embeddings">
                    {feature.similarEmbeddings.map((embedding: any) => {
                      return (
                        <a key={embedding.chips_id} href={`https://lgnd-fullstack-takehome-thumbnails.s3.us-east-2.amazonaws.com/${embedding.chips_id}_native.jpeg`} target="_blank">
                          <img src={`https://lgnd-fullstack-takehome-thumbnails.s3.us-east-2.amazonaws.com/${embedding.chips_id}_256.jpeg`}
                            alt={embedding.chips_id}
                            width={45}
                          />
                        </a>
                      )
                    })}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}