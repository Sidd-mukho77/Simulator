
export enum DroneStatus {
  Idle = 'Idle',
  Active = 'Active',
  Charging = 'Charging',
}

export interface Drone {
  id: string;
  status: DroneStatus;
}

export interface Waypoint {
  lat: number;
  lng: number;
  alt: number;
}

export enum MissionStatus {
    Pending = 'Pending',
    Executing = 'Executing',
    Completed = 'Completed',
    Conflict = 'Conflict',
}

export interface Mission {
  id: string;
  droneId: string;
  waypoints: Waypoint[];
  startTime: string; // "HH:mm"
  duration: number; // in minutes
  status: MissionStatus;
  pathColor: string;
}

export interface Conflict {
    droneIds: string[];
    time: string; // "HH:mm:ss"
    location: {
        lat: number;
        lng: number;
        alt: number; // in meters
    };
    description: string;
    severity: 'Red' | 'Yellow';
    distance: number; // in feet
}