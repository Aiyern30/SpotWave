import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, MarkerF, useLoadScript } from "@react-google-maps/api";
import { useToast } from "@/hooks/use-toast";

interface GoogleMapsProps {
  lat: number;
  lon: number;
  address?: string;
  mapStyle: google.maps.MapTypeStyle[];
}

const GoogleMaps: React.FC<GoogleMapsProps> = ({
  lat,
  lon,
  address,
  mapStyle,
}) => {
  const GoogleMapAPI = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!GoogleMapAPI) {
    throw new Error(
      "Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_KEY in your environment variables."
    );
  }

  const mapContainerStyle = { width: "100%", height: "100%" };
  const { toast } = useToast();

  const [center, setCenter] = useState({ lat, lng: lon });
  const [zoom, setZoom] = useState(12);
  const [mapKey, setMapKey] = useState(Date.now());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GoogleMapAPI,
    libraries: ["places"],
  });

  useEffect(() => {
    setCenter({ lat, lng: lon });
    setMapKey(Date.now());
  }, [lat, lon]);

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };
  const onMapUnmount = (map: google.maps.Map) => {
    mapRef.current = null;
  };

  const handleMarkerClick = (latitude: number, longitude: number) => {
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    const encodedAddress = address ? encodeURIComponent(address) : "";
    const googleMapsUrl = `https://www.google.com/maps?q=${encodedAddress}+(${latitude},${longitude})`;

    const contentString = `
      <div style="max-width: 300px; padding: 10px;" id="google-maps-info">
        <p style="margin-bottom: 10px; font-size: 14px; color: #333;">
          📍 <strong>Address:</strong> ${address || "Unknown"}
        </p>
        <button
          id="open-in-google-maps"
          style="width: 100%; padding: 8px; font-size: 14px; background-color: #F99D22; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
        >
          Open in Google Maps
        </button>
        <button
          id="copy-address"
          style="width: 100%; padding: 8px; font-size: 14px; background-color: #F99D22; color: white; border: none; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
        >
          Copy Address
        </button>
      </div>
    `;

    const position = { lat: latitude, lng: longitude };
    setCenter(position);
    setZoom(15);

    if (mapRef.current) {
      const infoWindow = new google.maps.InfoWindow({ content: contentString });

      infoWindow.addListener("closeclick", () => resetView());
      infoWindow.setPosition(position);
      infoWindow.open(mapRef.current); // Ensure the InfoWindow is opened on the correct map

      infoWindowRef.current = infoWindow;
    }

    setTimeout(() => {
      document
        .getElementById("open-in-google-maps")
        ?.addEventListener("click", () => {
          window.open(googleMapsUrl, "_blank");
        });

      document.getElementById("copy-address")?.addEventListener("click", () => {
        navigator.clipboard
          .writeText(address || "Unknown Address")
          .then(() => {
            toast({
              title: "Copied!",
              description: "Address copied to clipboard.",
              variant: "default",
            });
          })
          .catch(() => {
            toast({
              title: "Error",
              description: "Failed to copy address.",
              variant: "destructive",
            });
          });
      });
    }, 100);
  };

  const resetView = () => {
    setCenter({ lat: lat, lng: lon });
    setZoom(15);
  };

  if (loadError) {
    return (
      <div>
        Failed to load Google Maps.{" "}
        <button onClick={() => setMapKey(Date.now())}>Refresh</button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        Loading Google Maps...
      </div>
    );
  }

  return (
    <GoogleMap
      key={mapKey}
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      onLoad={onMapLoad}
      onUnmount={onMapUnmount}
      options={{
        streetViewControl: false,
        zoomControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        disableDefaultUI: false,
        mapTypeId: "hybrid",
        styles: mapStyle,
      }}
    >
      <MarkerF position={center} onClick={() => handleMarkerClick(lat, lon)} />
    </GoogleMap>
  );
};

export default GoogleMaps;
