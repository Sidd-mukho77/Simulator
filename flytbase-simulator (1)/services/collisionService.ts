import type { Mission, Waypoint, Conflict } from '../types';

const METERS_TO_FEET = 3.28084;
const RED_ALERT_FEET = 10;
const YELLOW_ALERT_FEET = 20;

/**
 * Calculates the great-circle distance between two points on the earth (specified in decimal degrees).
 * @returns distance in meters.
 */
function haversineDistance(p1: { lat: number, lng: number }, p2: { lat: number, lng: number }): number {
    const R = 6371e3; // metres
    const φ1 = p1.lat * Math.PI / 180;
    const φ2 = p2.lat * Math.PI / 180;
    const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
    const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Calculates the 3D distance between two waypoints, considering both horizontal and vertical distance.
 * @returns distance in feet.
 */
function get3DDistanceInFeet(p1: Waypoint, p2: Waypoint): number {
    const horizontalDist = haversineDistance(p1, p2); // in meters
    const verticalDist = Math.abs(p1.alt - p2.alt); // in meters
    const distanceInMeters = Math.sqrt(horizontalDist ** 2 + verticalDist ** 2);
    return distanceInMeters * METERS_TO_FEET;
}

/**
 * Linearly interpolates a Waypoint between two other Waypoints.
 */
function interpolatePosition(startWp: Waypoint, endWp: Waypoint, fraction: number): Waypoint {
    const lat = startWp.lat + (endWp.lat - startWp.lat) * fraction;
    const lng = startWp.lng + (endWp.lng - startWp.lng) * fraction;
    const alt = startWp.alt + (endWp.alt - startWp.alt) * fraction;
    return { lat, lng, alt };
}

const timeToSeconds = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60;
}

const secondsToTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}


export const detectCollisions = (missions: Mission[]): Promise<Conflict[]> => {
    if (missions.length < 2) {
        return Promise.resolve([]);
    }

    // 1. Pre-process missions to calculate speeds and segment data
    const missionDetails = missions.map(mission => {
        const segments = [];
        let totalDistance = 0;
        for (let i = 0; i < mission.waypoints.length - 1; i++) {
            const start = mission.waypoints[i];
            const end = mission.waypoints[i + 1];
            const distance = haversineDistance(start, end);
            segments.push({ start, end, distance });
            totalDistance += distance;
        }
        const speed = totalDistance > 0 ? totalDistance / (mission.duration * 60) : 0; // meters per second
        const startTimeSeconds = timeToSeconds(mission.startTime);
        const endTimeSeconds = startTimeSeconds + mission.duration * 60;

        return { ...mission, segments, totalDistance, speed, startTimeSeconds, endTimeSeconds };
    });

    const getPositionAtTime = (mission: typeof missionDetails[0], time: number): Waypoint | null => {
        if (time < mission.startTimeSeconds || time > mission.endTimeSeconds || mission.speed === 0) {
            return null;
        }

        const timeIntoMission = time - mission.startTimeSeconds;
        let distanceTravelled = timeIntoMission * mission.speed;

        for (const segment of mission.segments) {
            if (distanceTravelled <= segment.distance && segment.distance > 0) {
                const fraction = distanceTravelled / segment.distance;
                return interpolatePosition(segment.start, segment.end, fraction);
            }
            distanceTravelled -= segment.distance;
        }
        return mission.waypoints[mission.waypoints.length - 1]; // Should be at the end
    };


    const potentialConflicts = new Map<string, Conflict>();

    // 2. Determine the simulation time range
    const minTime = Math.min(...missionDetails.map(m => m.startTimeSeconds));
    const maxTime = Math.max(...missionDetails.map(m => m.endTimeSeconds));

    // 3. Iterate second-by-second
    for (let t = minTime; t <= maxTime; t++) {
        const activePositions: { missionId: string, droneId: string, position: Waypoint }[] = [];
        for (const mission of missionDetails) {
            const position = getPositionAtTime(mission, t);
            if (position) {
                activePositions.push({ missionId: mission.id, droneId: mission.droneId, position });
            }
        }

        if (activePositions.length < 2) continue;

        // 4. Compare every pair of active drones
        for (let i = 0; i < activePositions.length; i++) {
            for (let j = i + 1; j < activePositions.length; j++) {
                const droneA = activePositions[i];
                const droneB = activePositions[j];

                const distance = get3DDistanceInFeet(droneA.position, droneB.position);

                let severity: 'Red' | 'Yellow' | null = null;
                if (distance <= RED_ALERT_FEET) {
                    severity = 'Red';
                } else if (distance <= YELLOW_ALERT_FEET) {
                    severity = 'Yellow';
                }

                if (severity) {
                    const pairKey = [droneA.droneId, droneB.droneId].sort().join('-');
                    const newConflict: Conflict = {
                        droneIds: [droneA.droneId, droneB.droneId],
                        time: secondsToTime(t),
                        location: droneA.position, // Arbitrarily choose one drone's location
                        distance,
                        severity,
                        description: severity === 'Red'
                            ? `Drones are predicted to be within ${RED_ALERT_FEET} feet of each other.`
                            : `Drones are predicted to come within ${YELLOW_ALERT_FEET} feet of each other.`
                    };

                    const existingConflict = potentialConflicts.get(pairKey);
                    
                    // Always prioritize Red alerts. If severities are the same, prioritize the closest pass.
                    if (!existingConflict || 
                        (newConflict.severity === 'Red' && existingConflict.severity === 'Yellow') || 
                        (newConflict.severity === existingConflict.severity && newConflict.distance < existingConflict.distance)) 
                    {
                        potentialConflicts.set(pairKey, newConflict);
                    }
                }
            }
        }
    }
    
    const finalConflicts = Array.from(potentialConflicts.values());
    
    // Simulate a short delay to mimic processing time
    return new Promise(resolve => setTimeout(() => resolve(finalConflicts), 1000));
};