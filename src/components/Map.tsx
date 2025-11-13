import { MapContainer, TileLayer, Rectangle } from 'react-leaflet';
import L from 'leaflet';

const nwCorner = L.latLng(38.358605821056415, -122.97903506362721)
const seCorner = L.latLng(37.031979877829684, -121.56504250845597)
const sanFranciscoBounds = L.latLngBounds(nwCorner, seCorner);
const sanFranciscoCenter = sanFranciscoBounds.getCenter();

export default function Map() {
  return (
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
          opacity={0.25}
        />
      </MapContainer>
    </div>
  )
}