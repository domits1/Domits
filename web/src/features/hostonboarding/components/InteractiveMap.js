// --- START OF FILE InteractiveMap.js ---
import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon issue with webpack
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
});
// End Fix

const DEFAULT_CENTER = [51.505, -0.09]; // London coordinates
const DEFAULT_ZOOM = 5;

// --- Reverse Geocoding Function (using Nominatim) ---
async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Geocoding response:", data); // Log response for debugging

        if (data && data.address) {
            // Adapt based on Nominatim's response structure. Common fields:
            const address = data.address;
            return {
                street: address.road || address.pedestrian || address.path || '',
                houseNumber: address.house_number || '', // Separate house number if available
                city: address.city || address.town || address.village || address.hamlet || '',
                zipCode: address.postcode || '',
                country: address.country || '',
                fullAddress: data.display_name || '', // Often provides a formatted address
                latitude: parseFloat(data.lat),
                longitude: parseFloat(data.lon),
            };
        } else {
            console.warn("No address found for these coordinates.");
            return null;
        }
    } catch (error) {
        console.error("Error during reverse geocoding:", error);
        return null;
    }
}

// --- Component to Handle Map Clicks ---
function LocationMarker({ initialPosition, onLocationSelect }) {
    const [position, setPosition] = useState(initialPosition);
    const markerRef = useRef(null);
    const map = useMapEvents({
        click(e) {
            const newPos = e.latlng;
            setPosition(newPos);
            map.flyTo(newPos, map.getZoom()); // Center map on click
            reverseGeocode(newPos.lat, newPos.lng).then(addressDetails => {
                if (addressDetails) {
                    onLocationSelect(addressDetails); // Pass full details object
                } else {
                    // Handle geocoding failure - maybe notify user?
                    // Still pass coordinates so at least those are saved
                    onLocationSelect({ latitude: newPos.lat, longitude: newPos.lng });
                }
            });
        },
        // Optional: Listen for marker drag end if you add draggable={true} to Marker
        // dragend(e) {
        //   const newPos = e.target.getLatLng();
        //   setPosition(newPos);
        //   // ... call reverseGeocode and onLocationSelect ...
        // }
    });

    // Effect to update marker if initialPosition changes from parent
    useEffect(() => {
        // Only update if the new initial position is valid and different
        if (initialPosition &&
            initialPosition.lat !== position?.lat &&
            initialPosition.lng !== position?.lng)
        {
            setPosition(initialPosition);
            // Optionally fly map to new initial position
            // map.flyTo(initialPosition, map.getZoom());
        }
    }, [initialPosition, position?.lat, position?.lng]); // Add position checks to prevent loop


    return position === null ? null : (
        <Marker position={position} ref={markerRef}>
            <Popup>You selected this location.</Popup>
        </Marker>
    );
}

// --- Main Map Component ---
function InteractiveMap({ initialCoords, onLocationSelect }) {
    // Ensure initialCoords is in {lat: number, lng: number} format or null
    const validInitialCoords = (initialCoords && typeof initialCoords.latitude === 'number' && typeof initialCoords.longitude === 'number')
        ? { lat: initialCoords.latitude, lng: initialCoords.longitude }
        : null;

    const mapCenter = validInitialCoords ? [validInitialCoords.lat, validInitialCoords.lng] : DEFAULT_CENTER;
    const mapZoom = validInitialCoords ? 13 : DEFAULT_ZOOM; // Zoom in if there's an initial coord

    return (
        <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true} // Enable scroll wheel zoom
            style={{ height: "400px", width: "100%", marginBottom: "20px", zIndex: 0 }} // Ensure height and z-index
        >
            <TileLayer
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker
                initialPosition={validInitialCoords}
                onLocationSelect={onLocationSelect}
            />
        </MapContainer>
    );
}

export default InteractiveMap;
// --- END OF FILE InteractiveMap.js ---