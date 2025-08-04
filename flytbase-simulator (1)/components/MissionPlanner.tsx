import React, { useState, useEffect } from 'react';
import type { Drone, Waypoint, Mission } from '../types';
import { DroneStatus } from '../types';
import { TrashIcon } from './icons';


interface MissionPlannerProps {
  drones: Drone[];
  onAddMission: (mission: Omit<Mission, 'id' | 'status' | 'pathColor'>) => void;
  planningWaypoints: Partial<Waypoint>[];
  onPlanningWaypointsChange: (waypoints: Partial<Waypoint>[]) => void;
}

const MissionPlanner: React.FC<MissionPlannerProps> = ({ drones, onAddMission, planningWaypoints, onPlanningWaypointsChange }) => {
  const availableDrones = drones.filter(d => d.status === DroneStatus.Idle);
  
  const [selectedDrone, setSelectedDrone] = useState<string>(availableDrones[0]?.id || '');
  const [startTime, setStartTime] = useState('12:00');
  const [duration, setDuration] = useState(30);
  const [isRthEnabled, setIsRthEnabled] = useState(false);

  useEffect(() => {
    if (availableDrones.length > 0 && !availableDrones.find(d => d.id === selectedDrone)) {
        setSelectedDrone(availableDrones[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drones]);
  
  const handleWaypointChange = (index: number, field: keyof Waypoint, value: string) => {
    const newWaypoints = [...planningWaypoints];
    const numericValue = value === '' ? undefined : parseFloat(value);
    newWaypoints[index] = { ...newWaypoints[index], [field]: numericValue };
    onPlanningWaypointsChange(newWaypoints);
  };

  const handleAddWaypoint = () => {
    onPlanningWaypointsChange([...planningWaypoints, { alt: 50 }]);
  }

  const handleRemoveWaypoint = (index: number) => {
    onPlanningWaypointsChange(planningWaypoints.filter((_, i) => i !== index));
  }

  const handleAssignMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrone) {
      alert('Please select an available drone.');
      return;
    }
    
    const finalWaypoints = planningWaypoints.filter(wp => wp.lat != null && wp.lng != null && wp.alt != null) as Waypoint[];

    if(finalWaypoints.length < 2) {
      alert('A mission requires at least 2 waypoints. Please click on the map or add them manually.');
      return;
    }

    let missionWaypoints = [...finalWaypoints];
    if (isRthEnabled) {
      const lastWaypoint = missionWaypoints[missionWaypoints.length - 1];
      const firstWaypoint = missionWaypoints[0];
      const rthWaypoint: Waypoint = {
        lat: firstWaypoint.lat,
        lng: firstWaypoint.lng,
        alt: lastWaypoint.alt, // Maintain altitude of last waypoint for return
      };
      missionWaypoints.push(rthWaypoint);
    }

    onAddMission({ droneId: selectedDrone, waypoints: missionWaypoints, startTime, duration });
    
    // Reset form
    setIsRthEnabled(false);
    if(availableDrones.length > 1) {
        setSelectedDrone(availableDrones.find(d => d.id !== selectedDrone)?.id || '');
    }
  };

  return (
    <div className="bg-dark-surface p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-4 text-light-text">Assign Mission</h3>
      <form onSubmit={handleAssignMission} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-medium-text mb-1">Select Drone</label>
          <select
            value={selectedDrone}
            onChange={(e) => setSelectedDrone(e.target.value)}
            className="w-full bg-gray-700 text-light-text border border-dark-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {availableDrones.length > 0 ? (
                availableDrones.map(d => <option key={d.id} value={d.id}>{d.id}</option>)
            ) : (
                <option disabled>No idle drones available</option>
            )}
          </select>
        </div>
        
        <p className="block text-sm font-medium text-medium-text">Waypoints (click map or add manually)</p>
        <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
            {planningWaypoints.map((wp, i) => (
                <div key={i} className="p-3 bg-gray-700 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold text-brand-primary">Waypoint {i + 1}</p>
                      <button type="button" onClick={() => handleRemoveWaypoint(i)} className="text-red-400 hover:text-red-300">
                          <TrashIcon className="w-4 h-4"/>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <input type="number" step="any" placeholder="Lat" value={wp.lat ?? ''} onChange={e => handleWaypointChange(i, 'lat', e.target.value)} className="w-full bg-gray-800 text-light-text border border-dark-border rounded-md px-2 py-1 text-sm"/>
                        <input type="number" step="any" placeholder="Lng" value={wp.lng ?? ''} onChange={e => handleWaypointChange(i, 'lng', e.target.value)} className="w-full bg-gray-800 text-light-text border border-dark-border rounded-md px-2 py-1 text-sm"/>
                        <input type="number" placeholder="Alt (m)" value={wp.alt ?? ''} onChange={e => handleWaypointChange(i, 'alt', e.target.value)} className="w-full bg-gray-800 text-light-text border border-dark-border rounded-md px-2 py-1 text-sm"/>
                    </div>
                </div>
            ))}
             {planningWaypoints.length === 0 && <p className="text-medium-text text-center text-sm py-2">Click on the map to add a starting point.</p>}
        </div>

        <button type="button" onClick={handleAddWaypoint} className="w-full bg-dark-border hover:bg-gray-600 text-light-text font-bold py-2 px-4 rounded-md transition duration-300">
          Add Waypoint Manually
        </button>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-medium-text mb-1">Start Time (24h)</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-gray-700 text-light-text border border-dark-border rounded-md px-3 py-2"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-medium-text mb-1">Duration (min)</label>
                <input type="number" min="1" value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full bg-gray-700 text-light-text border border-dark-border rounded-md px-3 py-2"/>
            </div>
        </div>

        <div className="flex items-center space-x-2 my-2">
         <input 
             type="checkbox"
             id="rth-checkbox"
             checked={isRthEnabled}
             onChange={(e) => setIsRthEnabled(e.target.checked)}
             className="h-4 w-4 rounded border-dark-border bg-gray-700 text-brand-primary focus:ring-brand-primary"
         />
         <label htmlFor="rth-checkbox" className="text-sm font-medium text-medium-text">
             Enable Return-to-Home (RTH)
         </label>
        </div>

        <button type="submit" disabled={!selectedDrone} className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
          Assign Mission
        </button>
      </form>
    </div>
  );
};

export default MissionPlanner;