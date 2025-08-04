import React, { useEffect, useRef } from 'react';
import { Wrapper, Status } from "@googlemaps/react-wrapper";
import type { Mission, Waypoint } from '../types';

// Minimal type declarations for Google Maps to satisfy TypeScript without
// needing to install @types/google.maps.
declare global {
  namespace google.maps {
    class Map {
      constructor(mapDiv: Element | null, opts?: any);
      fitBounds(bounds: LatLngBounds, padding?: number | any): void;
      addListener(eventName: string, handler: Function): void;
    }

    class Marker {
      constructor(opts?: any);
      setMap(map: Map | null): void;
    }

    class Polyline {
      constructor(opts?: any);
      setMap(map: Map | null): void;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor(sw?: any, ne?: any);
      extend(point: any): void;
      isEmpty(): boolean;
    }

    interface MapMouseEvent {
      latLng: LatLng;
    }

    const SymbolPath: {
        CIRCLE: any;
    };
  }
}

interface MapViewProps {
  missions: Mission[];
  currentWaypoints: Waypoint[];
  suggestedMission: Mission | null;
  onMapClick: (latLng: { lat: number; lng: number }) => void;
}

const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

const MapComponent: React.FC<MapViewProps> = ({ missions, currentWaypoints, suggestedMission, onMapClick }) => {
    const ref = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const elementsRef = useRef<{ markers: google.maps.Marker[], polylines: google.maps.Polyline[] }>({ markers: [], polylines: [] });

    useEffect(() => {
        if (ref.current && !mapRef.current) {
            mapRef.current = new window.google.maps.Map(ref.current, {
                center: { lat: 34.0522, lng: -118.2437 },
                zoom: 8,
                disableDefaultUI: true,
                styles: darkMapStyle,
                draggableCursor: 'crosshair',
            });
            
            mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
                if (e.latLng) {
                    onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                }
            });
        }
    }, [ref, onMapClick]);

    useEffect(() => {
        if (!mapRef.current) return;

        // Clear previous elements
        elementsRef.current.markers.forEach(marker => marker.setMap(null));
        elementsRef.current.polylines.forEach(polyline => polyline.setMap(null));
        elementsRef.current = { markers: [], polylines: [] };

        const bounds = new window.google.maps.LatLngBounds();

        // Draw mission paths and markers
        missions.forEach(mission => {
            const path = mission.waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }));
            const polyline = new window.google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: mission.pathColor,
                strokeOpacity: 1.0,
                strokeWeight: 2.5,
                map: mapRef.current,
            });
            elementsRef.current.polylines.push(polyline);

            mission.waypoints.forEach((wp) => {
                const marker = new window.google.maps.Marker({
                    position: wp,
                    map: mapRef.current,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 5,
                        fillColor: mission.pathColor,
                        fillOpacity: 1,
                        strokeWeight: 0,
                    },
                });
                elementsRef.current.markers.push(marker);
                bounds.extend(wp);
            });
        });

        // Draw current planning path and markers
        if (currentWaypoints.length > 0) {
            const path = currentWaypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }));
            const polyline = new window.google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: '#FFFFFF',
                strokeOpacity: 0.7,
                strokeWeight: 2,
                map: mapRef.current,
                icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                    offset: '0',
                    repeat: '15px'
                }],
            });
            elementsRef.current.polylines.push(polyline);

            currentWaypoints.forEach((wp) => {
                const marker = new window.google.maps.Marker({
                    position: wp,
                    map: mapRef.current,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 4,
                        fillColor: '#FFFFFF',
                        fillOpacity: 1,
                        strokeColor: '#333333',
                        strokeWeight: 1,
                    },
                });
                elementsRef.current.markers.push(marker);
                bounds.extend(wp);
            });
        }
        
        // Draw suggested mission path
        if (suggestedMission) {
            const path = suggestedMission.waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }));
             const polyline = new window.google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: '#FF00FF', // Magenta
                strokeOpacity: 0.8,
                strokeWeight: 2.5,
                map: mapRef.current,
                icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                    offset: '0',
                    repeat: '15px'
                }],
            });
            elementsRef.current.polylines.push(polyline);
            suggestedMission.waypoints.forEach(wp => bounds.extend(wp));
        }

        if (!bounds.isEmpty()) {
            mapRef.current.fitBounds(bounds, 60); // 60px padding
        }

    }, [missions, currentWaypoints, suggestedMission]);

    return <div ref={ref} className="w-full h-full rounded-lg" />;
};

const MapView: React.FC<MapViewProps> = (props) => {
    const render = (status: Status) => {
        switch (status) {
            case Status.LOADING:
                return <div className="flex items-center justify-center h-full bg-dark-surface rounded-lg"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>;
            case Status.FAILURE:
                return <div className="flex items-center justify-center h-full bg-dark-surface rounded-lg"><p className="text-red-400 p-4 text-center">Failed to load map. Please check your API key and network connection.</p></div>;
            case Status.SUCCESS:
                return <MapComponent {...props} />;
        }
    };
    
    const apiKey = "AIzaSyCJoGx5JegjBMcY_BcrNjtEjGJDvV_oriM";

    return (
        <div className="relative w-full h-full bg-dark-surface rounded-lg overflow-hidden shadow-lg border border-dark-border">
            <Wrapper apiKey={apiKey} render={render} />
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-3 py-1 rounded-md text-xs font-semibold z-10 pointer-events-none">LIVE SATELLITE VIEW</div>
        </div>
    );
};

export default MapView;