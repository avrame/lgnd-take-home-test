import { MapContainer, TileLayer, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import './Map.css';
import FeatureMarker from './FeatureMarker';

const nwCorner = L.latLng(38.358605821056415, -122.97903506362721)
const seCorner = L.latLng(37.031979877829684, -121.56504250845597)
const sanFranciscoBounds = L.latLngBounds(nwCorner, seCorner);
const sanFranciscoCenter = sanFranciscoBounds.getCenter();

export default function Map({ features }: { features: any }) {
  console.log('features', features);
  // pre-cache the thumbnails
  features.forEach((feature: any) => {
    feature.similarEmbeddings.forEach((embedding: any) => {
      const thumbnailUrl = `https://lgnd-fullstack-takehome-thumbnails.s3.us-east-2.amazonaws.com/${embedding.chips_id}_256.jpeg`;
      const thumbnail = new Image();
      thumbnail.src = thumbnailUrl;
    });
  });

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
          {features.map((feature: any) => <FeatureMarker key={feature.name} feature={feature} />)}
        </MapContainer>
      </div>
    </div>
  )
}