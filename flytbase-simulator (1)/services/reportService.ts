
import type { Conflict, Mission, Waypoint } from '../types';

function haversineDistance(p1: Waypoint, p2: Waypoint): number {
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

function getMissionSpeed(mission: Mission): number { // in meters per second
    let totalDistance = 0;
    for (let i = 0; i < mission.waypoints.length - 1; i++) {
        totalDistance += haversineDistance(mission.waypoints[i], mission.waypoints[i + 1]);
    }
    if (mission.duration === 0) return 0;
    return totalDistance / (mission.duration * 60);
}

function waypointsToMarkdownTable(waypoints: Waypoint[]): string {
    let table = '| # | Latitude | Longitude | Altitude (m) |\n';
    table += '|---|---|---|---|\n';
    waypoints.forEach((wp, i) => {
        table += `| ${i + 1} | ${wp.lat.toFixed(6)} | ${wp.lng.toFixed(6)} | ${wp.alt.toFixed(1)} |\n`;
    });
    return table;
}

export function generateMarkdownReport(
    resolvedConflicts: {
        conflict: Conflict;
        originalMission: Mission;
        suggestedMission: Mission;
    }[]
): string {
    if (resolvedConflicts.length === 0) {
        return "# Flight Resolution Report\n\nNo conflicts were resolved in this session.";
    }

    let report = `# Flight Resolution Report\n\nThis report summarizes the flight path conflicts that were detected and automatically resolved by the AI flight controller.\n\n---\n`;

    resolvedConflicts.forEach((res, index) => {
        const droneToModify = res.suggestedMission.droneId;
        const otherDrone = res.conflict.droneIds.find(id => id !== droneToModify);
        const droneSpeed = getMissionSpeed(res.originalMission);

        report += `### Resolved Conflict ${index + 1}: Drones ${droneToModify} & ${otherDrone}\n\n`;
        report += `**Initial Conflict Details:**\n`;
        report += `- **Time of Conflict:** ${res.conflict.time}\n`;
        report += `- **Severity:** ${res.conflict.severity} Alert\n`;
        report += `- **Location (Lat, Lng, Alt):** ${res.conflict.location.lat.toFixed(6)}, ${res.conflict.location.lng.toFixed(6)}, ${res.conflict.location.alt.toFixed(1)}m\n`;
        report += `- **Predicted Proximity:** ${res.conflict.distance.toFixed(1)} feet\n\n`;
        
        report += `**Resolution Details:**\n`;
        report += `- **Action Taken:** Modified flight path for Drone **${droneToModify}**.\n`;
        report += `- **Drone Speed (approx):** ${droneSpeed.toFixed(1)} m/s\n\n`;

        report += `**Path Change Analysis:**\n\n`;
        
        report += `**Original Waypoints (Drone ${droneToModify}):**\n`;
        report += waypointsToMarkdownTable(res.originalMission.waypoints);
        report += `\n`;
        
        report += `**New AI-Suggested Waypoints (Drone ${droneToModify}):**\n`;
        report += waypointsToMarkdownTable(res.suggestedMission.waypoints);
        report += `\n---\n`;
    });

    return report;
}
