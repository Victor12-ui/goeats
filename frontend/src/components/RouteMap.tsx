import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, ExternalLink, Compass } from "lucide-react";

interface RouteMapProps {
  orderId?: number;
  restaurantName: string;
  restaurantAddress?: string | null;
  restaurantLat?: number | null;
  restaurantLng?: number | null;
  restaurantLogo?: string | null;
  deliveryAddress: string;
  customerName?: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  driverLat?: number | null;
  driverLng?: number | null;
  driverName?: string | null;
  status?: string;
  isDriverView?: boolean;
  onDriverLocationUpdate?: (lat: number, lng: number) => void;
  height?: string;
}

// Default center: Loja, Ecuador
const DEFAULT_LAT = -3.99313;
const DEFAULT_LNG = -79.20422;

export const RouteMap: React.FC<RouteMapProps> = ({
  orderId: _orderId,
  restaurantName,
  restaurantAddress,
  restaurantLat = -3.992677,
  restaurantLng = -79.202349,
  restaurantLogo: _restaurantLogo,
  deliveryAddress,
  customerName,
  deliveryLat = -3.968596,
  deliveryLng = -79.215325,
  driverLat,
  driverLng,
  driverName,
  status: _status = "DELIVERING",
  isDriverView = false,
  onDriverLocationUpdate,
  height = "380px",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const mainRouteLineRef = useRef<L.Polyline | null>(null);

  const restL = restaurantLat || DEFAULT_LAT;
  const restG = restaurantLng || DEFAULT_LNG;
  const delivL = deliveryLat || DEFAULT_LAT + 0.006;
  const delivG = deliveryLng || DEFAULT_LNG + 0.006;

  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [etaMinutes, setEtaMinutes] = useState<number>(10);

  // Haversine fallback calculation
  const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  // Fetch vehicular street route through Loja streets from OSRM
  const fetchStreetRoute = async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<{ coordinates: [number, number][]; distanceKm: number; durationMin: number }> => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const latLngs: [number, number][] = route.geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]]
          );
          const distKm = parseFloat((route.distance / 1000).toFixed(2));
          const durMin = Math.max(3, Math.round(route.duration / 60));
          return { coordinates: latLngs, distanceKm: distKm, durationMin: durMin };
        }
      }
    } catch (e) {
      console.warn("OSRM Street route failed, using straight polyline fallback:", e);
    }

    // Fallback
    const coords: [number, number][] = [
      [startLat, startLng],
      [endLat, endLng],
    ];
    const dist = calculateHaversine(startLat, startLng, endLat, endLng);
    return {
      coordinates: coords,
      distanceKm: dist,
      durationMin: Math.max(3, Math.round(dist * 3.5 + 2)),
    };
  };

  // Setup GPS watcher if in Driver view to update driver live position
  useEffect(() => {
    if (isDriverView && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;

          // Only move marker if it's more than 30m away from customer destination to avoid overlapping badges
          const distToCustomer = calculateHaversine(latitude, longitude, delivL, delivG);
          if (driverMarkerRef.current) {
            if (distToCustomer > 0.05) {
              driverMarkerRef.current.setLatLng([latitude, longitude]);
              driverMarkerRef.current.setOpacity(1);
            }
          }

          if (onDriverLocationUpdate) {
            onDriverLocationUpdate(latitude, longitude);
          }
        },
        (err) => console.warn("GPS tracking watch error:", err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isDriverView, onDriverLocationUpdate, delivL, delivG]);

  // Google Maps Navigation (Restaurant to Customer)
  const openGoogleMapsNavigation = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${restL},${restG}&destination=${delivL},${delivG}&travelmode=driving`;
    window.open(url, "_blank");
  };

  // Waze Navigation (To Customer)
  const openWazeNavigation = () => {
    const url = `https://waze.com/ul?ll=${delivL},${delivG}&navigate=yes`;
    window.open(url, "_blank");
  };

  // Center on Full Route
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds([
        [restL, restG],
        [delivL, delivG],
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Initialize Route Map with Street Network from Restaurant to Customer
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [(restL + delivL) / 2, (restG + delivG) / 2],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }
      ).addTo(map);

      // 1. Full Street Route (Thick glowing polyline from Restaurant -> Customer)
      // Shadow casing for high contrast
      L.polyline([], {
        color: "#057a55",
        weight: 8,
        opacity: 0.5,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      const mainRoute = L.polyline([], {
        color: "#2ed573",
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      mainRouteLineRef.current = mainRoute;

      // 2. Fetch turn-by-turn route between Restaurant and Customer
      fetchStreetRoute(restL, restG, delivL, delivG).then((routeData) => {
        mainRoute.setLatLngs(routeData.coordinates);
        setDistanceKm(routeData.distanceKm);
        setEtaMinutes(routeData.durationMin);

        // Fit map bounds to show complete street path
        const bounds = L.latLngBounds([
          [restL, restG],
          [delivL, delivG],
          ...routeData.coordinates,
        ]);
        map.fitBounds(bounds, { padding: [45, 45] });
      });

      // 3. Restaurant Origin Marker (Orange / Gold Badge)
      const restIconHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: rgba(20, 24, 33, 0.92); color: #ffd700; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); white-space: nowrap; margin-bottom: 3px; border: 1px solid rgba(255,215,0,0.35); backdrop-filter: blur(4px);">
            🏪 ${restaurantName}
          </div>
          <div style="width: 26px; height: 26px; background: #ff9f43; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(255,159,67,0.6);">
            <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
          </div>
        </div>
      `;
      const restIcon = L.divIcon({
        className: "clean-rest-marker",
        html: restIconHtml,
        iconSize: [0, 0],
      });
      L.marker([restL, restG], { icon: restIcon })
        .addTo(map)
        .bindPopup(`<b>Retiro en:</b><br/>🏪 ${restaurantName}<br/>${restaurantAddress || "Local"}`);

      // 4. Customer Destination Marker (Coral Red Badge)
      const delivIconHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background: rgba(255, 71, 87, 0.95); color: #ffffff; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 12px rgba(255,71,87,0.5); white-space: nowrap; margin-bottom: 3px; border: 1px solid rgba(255,255,255,0.4);">
            📍 ${customerName ? customerName : "Cliente"}
          </div>
          <div style="width: 26px; height: 26px; background: #ff4757; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255,71,87,0.6);">
            <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
          </div>
        </div>
      `;
      const delivIcon = L.divIcon({
        className: "clean-deliv-marker",
        html: delivIconHtml,
        iconSize: [0, 0],
      });
      L.marker([delivL, delivG], { icon: delivIcon })
        .addTo(map)
        .bindPopup(`<b>Entrega a:</b><br/>${customerName || "Cliente"}<br/>${deliveryAddress}`);

      // 5. Driver Marker (Only rendered if driver is separate from customer and restaurant)
      const distDriverToCustomer = driverLat && driverLng ? calculateHaversine(driverLat, driverLng, delivL, delivG) : 999;
      const distDriverToRest = driverLat && driverLng ? calculateHaversine(driverLat, driverLng, restL, restG) : 999;

      if (driverLat && driverLng && distDriverToCustomer > 0.08 && distDriverToRest > 0.08) {
        const driverIconHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
            <div style="background: #2ed573; color: #000000; padding: 2px 8px; border-radius: 10px; font-weight: 800; font-size: 9.5px; box-shadow: 0 3px 8px rgba(46,213,115,0.4); white-space: nowrap; margin-bottom: 2px;">
              🛵 ${driverName || "Repartidor"}
            </div>
            <div style="width: 28px; height: 28px; background: #2ed573; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(46,213,115,0.5); font-size: 13px;">
              🏍️
            </div>
          </div>
        `;
        const driverIcon = L.divIcon({
          className: "clean-driver-marker",
          html: driverIconHtml,
          iconSize: [0, 0],
        });
        const driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon }).addTo(map);
        driverMarkerRef.current = driverMarker;
      }

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [restL, restG, delivL, delivG]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      backgroundColor: "var(--bg-secondary, #1a1e29)",
      borderRadius: "16px",
      overflow: "hidden",
      border: "1px solid var(--border-light, rgba(255,255,255,0.08))",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)"
    }}>
      {/* Map Window Container */}
      <div style={{ position: "relative", width: "100%", height }}>
        {/* Leaflet Canvas */}
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

        {/* Minimal Floating Status Badge (Top-Left) */}
        <div style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(18, 22, 31, 0.9)",
          backdropFilter: "blur(8px)",
          color: "#ffffff",
          padding: "6px 12px",
          borderRadius: "30px",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          fontSize: "11.5px",
          fontWeight: "700",
          pointerEvents: "none"
        }}>
          <span>🛵</span>
          <span style={{ color: "#2ed573" }}>{distanceKm > 0 ? `${distanceKm} km` : "En ruta"}</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>~{etaMinutes} min</span>
        </div>

        {/* Floating Recenter Button (Top-Right) */}
        <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 1000 }}>
          <button
            type="button"
            onClick={handleRecenter}
            title="Centrar ruta completa"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "rgba(18, 22, 31, 0.9)",
              backdropFilter: "blur(8px)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              transition: "transform 0.2s ease",
            }}
          >
            <Compass size={18} color="#2ed573" />
          </button>
        </div>
      </div>

      {/* Clean Bottom Action Strip with ONLY Google Maps & Waze */}
      <div style={{
        padding: "12px 16px",
        backgroundColor: "var(--bg-tertiary, #141722)",
        borderTop: "1px solid var(--border-light, rgba(255,255,255,0.06))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 180px", overflow: "hidden" }}>
          <span style={{ fontSize: "14px" }}>📍</span>
          <span style={{
            fontSize: "12px",
            color: "var(--text-primary, #ffffff)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            <strong>Entrega:</strong> {deliveryAddress}
          </span>
        </div>

        {/* ONLY Google Maps & Waze Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={openGoogleMapsNavigation}
            title="Abrir ruta en Google Maps"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#1a73e8",
              color: "#ffffff",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "background 0.2s ease",
              boxShadow: "0 2px 8px rgba(26,115,232,0.35)",
            }}
          >
            <Navigation size={13} fill="#ffffff" />
            <span>Google Maps</span>
          </button>

          <button
            type="button"
            onClick={openWazeNavigation}
            title="Abrir destino en Waze"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#00d2d3",
              color: "#000000",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "800",
              cursor: "pointer",
              transition: "background 0.2s ease",
              boxShadow: "0 2px 8px rgba(0,210,211,0.35)",
            }}
          >
            <ExternalLink size={13} />
            <span>Waze</span>
          </button>
        </div>
      </div>
    </div>
  );
};
