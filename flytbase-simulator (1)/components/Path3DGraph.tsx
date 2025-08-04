import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls, Text, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { Mission, Waypoint, Conflict } from '../types';

// Make all of THREE available to R3F as JSX components
// extend(THREE);

const normalize = (val: number, min: number, max: number, scale: number) => {
    if (max - min === 0) return 0; // Avoid division by zero
    // Maps a value from [min, max] to [-scale/2, scale/2]
    return ((val - min) / (max - min) - 0.5) * scale;
};

const normalizeAltitude = (val: number, min: number, max: number, scale: number) => {
     if (max === 0) return -scale / 2;
     // Maps altitude from [min, max] to a position relative to the ground plane
    return (val / max) * scale - (scale / 2);
}

const GraphBounds: React.FC<{ bounds: any; scale: number }> = ({ bounds, scale }) => {
    const { minLng, maxLng, minLat, maxLat, maxAlt } = bounds;
    const halfScale = scale / 2;

    return (
        <group>
            {/* Y-axis (Altitude) */}
            <Text position={[0, halfScale + 8, 0]} fontSize={3} color="white" anchorY="bottom">Altitude</Text>
            <Text position={[halfScale, -halfScale - 2, -halfScale]} fontSize={2.5} color="#a0aec0">{0}m</Text>
            <Text position={[halfScale, halfScale - 2, -halfScale]} fontSize={2.5} color="#a0aec0">{maxAlt.toFixed(0)}m</Text>

            {/* X-axis (Longitude) */}
            <Text position={[0, -halfScale - 8, 0]} fontSize={3} color="white" anchorY="top">Longitude</Text>
            <Text position={[-halfScale, -halfScale - 4, 0]} fontSize={2.5} color="#a0aec0">{minLng.toFixed(2)}°</Text>
            <Text position={[halfScale, -halfScale - 4, 0]} fontSize={2.5} color="#a0aec0">{maxLng.toFixed(2)}°</Text>

            {/* Z-axis (Latitude) */}
             <group rotation={[0, -Math.PI / 2, 0]}>
                <Text position={[0, -halfScale - 8, 0]} fontSize={3} color="white" anchorY="top">Latitude</Text>
                <Text position={[-halfScale, -halfScale - 4, 0]} fontSize={2.5} color="#a0aec0">{minLat.toFixed(2)}°</Text>
                <Text position={[halfScale, -halfScale - 4, 0]} fontSize={2.5} color="#a0aec0">{maxLat.toFixed(2)}°</Text>
            </group>
        </group>
    );
}

interface Path3DGraphProps {
  missions: Mission[];
  currentWaypoints: Waypoint[];
  conflicts: Conflict[];
  suggestedMission: Mission | null;
}

const Path3DGraph: React.FC<Path3DGraphProps> = ({ missions, currentWaypoints, conflicts, suggestedMission }) => {
    const SCALE = 100;

    const allWaypoints = useMemo(() => [
        ...missions.flatMap(m => m.waypoints),
        ...currentWaypoints,
        ...(suggestedMission ? suggestedMission.waypoints : []),
    ], [missions, currentWaypoints, suggestedMission]);

    const bounds = useMemo(() => {
        if (allWaypoints.length < 2) {
            return { minLat: 34, maxLat: 34.1, minLng: -118, maxLng: -117.9, minAlt: 0, maxAlt: 200 };
        }
        const lats = allWaypoints.map(w => w.lat);
        const lngs = allWaypoints.map(w => w.lng);
        const alts = allWaypoints.map(w => w.alt);
        return {
            minLat: Math.min(...lats), maxLat: Math.max(...lats),
            minLng: Math.min(...lngs), maxLng: Math.max(...lngs),
            minAlt: 0, 
            maxAlt: Math.max(...alts, 100),
        };
    }, [allWaypoints]);

    const scaledMissions = useMemo(() => {
        return missions.map(mission => ({
            ...mission,
            scaledPath: mission.waypoints.map(wp => new THREE.Vector3(
                normalize(wp.lng, bounds.minLng, bounds.maxLng, SCALE),
                normalizeAltitude(wp.alt, bounds.minAlt, bounds.maxAlt, SCALE),
                -normalize(wp.lat, bounds.minLat, bounds.maxLat, SCALE)
            ))
        }));
    }, [missions, bounds]);

    const scaledCurrentPath = useMemo(() => {
        return currentWaypoints.map(wp => new THREE.Vector3(
            normalize(wp.lng, bounds.minLng, bounds.maxLng, SCALE),
            normalizeAltitude(wp.alt, bounds.minAlt, bounds.maxAlt, SCALE),
            -normalize(wp.lat, bounds.minLat, bounds.maxLat, SCALE)
        ));
    }, [currentWaypoints, bounds]);

    const scaledSuggestedPath = useMemo(() => {
        if (!suggestedMission) return null;
        return suggestedMission.waypoints.map(wp => new THREE.Vector3(
            normalize(wp.lng, bounds.minLng, bounds.maxLng, SCALE),
            normalizeAltitude(wp.alt, bounds.minAlt, bounds.maxAlt, SCALE),
            -normalize(wp.lat, bounds.minLat, bounds.maxLat, SCALE)
        ));
    }, [suggestedMission, bounds]);


    if (allWaypoints.length === 0) {
        return (
            <div className="w-full h-full bg-dark-surface rounded-lg p-4 shadow-lg border border-dark-border flex items-center justify-center">
                 <p className="text-medium-text">3D Path Graph - Awaiting mission data</p>
            </div>
        );
    }
    
    return (
        <div className="w-full h-full bg-dark-surface rounded-lg p-1 shadow-lg border border-dark-border">
            <Canvas camera={{ position: [SCALE * 0.9, SCALE * 0.6, SCALE * 0.9], fov: 50 }}>
                <OrbitControls />
                <ambientLight intensity={1.5} />
                <directionalLight position={[10, 20, 5]} intensity={0.8} />

                <Grid 
                    position={[0, -SCALE / 2, 0]}
                    args={[SCALE, SCALE]}
                    cellColor={"#4a5568"}
                    sectionColor={"#a0aec0"}
                    fadeDistance={SCALE * 1.5}
                    infiniteGrid
                />
                
                <GraphBounds bounds={bounds} scale={SCALE} />
                
                {scaledMissions.map(mission => (
                    <group key={mission.id}>
                        <Line
                            points={mission.scaledPath}
                            color={mission.pathColor}
                            lineWidth={4}
                        />
                        {mission.scaledPath.map((point, i) => (
                             <mesh key={`m-wp-${mission.id}-${i}`} position={point}>
                                <sphereGeometry args={[1, 16, 16]} />
                                <meshStandardMaterial color={mission.pathColor} roughness={0.5} />
                            </mesh>
                        ))}
                    </group>
                ))}
                
                {scaledCurrentPath.length > 1 && (
                     <group>
                        <Line
                            points={scaledCurrentPath}
                            color="white"
                            lineWidth={3}
                            dashed
                            dashScale={10}
                            gapSize={5}
                        />
                         {scaledCurrentPath.map((point, i) => (
                            <mesh key={`c-wp-${i}`} position={point}>
                                <sphereGeometry args={[0.9, 16, 16]} />
                                <meshStandardMaterial color="white" roughness={0.5}/>
                            </mesh>
                        ))}
                    </group>
                )}

                {scaledSuggestedPath && suggestedMission && (
                    <group>
                        <Line
                            points={scaledSuggestedPath}
                            color="#FF00FF" // Magenta
                            lineWidth={3}
                            dashed
                            dashScale={8}
                            gapSize={4}
                        />
                         {scaledSuggestedPath.map((point, i) => (
                            <mesh key={`s-wp-${i}`} position={point}>
                                <sphereGeometry args={[0.9, 16, 16]} />
                                <meshStandardMaterial color="#FF00FF" roughness={0.5}/>
                            </mesh>
                        ))}
                    </group>
                )}
                
                {conflicts.map((conflict, index) => {
                    const conflictPosition = new THREE.Vector3(
                        normalize(conflict.location.lng, bounds.minLng, bounds.maxLng, SCALE),
                        normalizeAltitude(conflict.location.alt, bounds.minAlt, bounds.maxAlt, SCALE),
                        -normalize(conflict.location.lat, bounds.minLat, bounds.maxLat, SCALE)
                    );
                    const color = conflict.severity === 'Red' ? '#ff4d4d' : '#ffc700';
                    return (
                        <mesh key={`conflict-${index}`} position={conflictPosition}>
                            <sphereGeometry args={[3, 32, 32]} />
                            <meshStandardMaterial 
                                color={color} 
                                emissive={color}
                                emissiveIntensity={2}
                                transparent={true} 
                                opacity={0.6}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    );
                })}
            </Canvas>
        </div>
    );
};

export default Path3DGraph;