import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };

interface MapPickerProps {
  initialCenter?: LatLng;
  zoom?: number;
  height?: string;
  onSelect: (coords: LatLng, address?: string) => void;
}

function loadGoogleMaps(apiKey?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google && (window as any).google.maps) {
      resolve();
      return;
    }
    if (!apiKey) {
      console.warn("⚠️ VITE_GOOGLE_MAPS_API_KEY not set. MapPicker will not load Google Maps.");
      reject(new Error("Missing Google Maps API Key"));
      return;
    }
    const scriptId = "google-maps-script";
    if (document.getElementById(scriptId)) {
      (document.getElementById(scriptId) as HTMLScriptElement).addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

export const MapPicker = ({ initialCenter, zoom = 12, height = "400px", onSelect }: MapPickerProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    loadGoogleMaps(apiKey)
      .then(() => {
        const google = (window as any).google;
        const center = initialCenter || { lat: 0, lng: 0 };
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          disableDefaultUI: true,
        });

        markerRef.current = new google.maps.Marker({
          position: center,
          map: mapInstanceRef.current,
          draggable: true,
        });

        const geocoder = new google.maps.Geocoder();

        const updateSelection = (position: any) => {
          markerRef.current.setPosition(position);
          mapInstanceRef.current.panTo(position);
          geocoder.geocode({ location: position }, (results: any, status: string) => {
            const address = status === "OK" && results && results[0] ? results[0].formatted_address : undefined;
            onSelect(position, address);
          });
        };

        // click to move marker
        mapInstanceRef.current.addListener("click", (e: any) => {
          updateSelection({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });

        markerRef.current.addListener("dragend", (e: any) => {
          updateSelection({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });

        // If no initial center provided, try browser geolocation to center
        if (!initialCenter && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              mapInstanceRef.current.setCenter(position);
              markerRef.current.setPosition(position);
            },
            () => {}
          );
        }
      })
      .catch(() => {
        // Silently fail; parent can show message
      });
  }, [initialCenter, zoom, onSelect]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height, borderRadius: 12, overflow: "hidden" }}
    />
  );
};

export default MapPicker;


