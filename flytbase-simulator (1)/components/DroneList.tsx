
import React from 'react';
import type { Drone } from '../types';
import { DroneStatus } from '../types';
import { DroneIcon } from './icons';

interface DroneListProps {
  drones: Drone[];
}

const statusColorMap: Record<DroneStatus, string> = {
  [DroneStatus.Idle]: 'bg-green-500',
  [DroneStatus.Active]: 'bg-yellow-500 animate-pulse',
  [DroneStatus.Charging]: 'bg-blue-500',
};

const DroneList: React.FC<DroneListProps> = ({ drones }) => {
  return (
    <div className="bg-dark-surface p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-3 text-light-text">Drone Fleet</h3>
      <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
        {drones.length > 0 ? (
          drones.map((drone) => (
            <div key={drone.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
              <div className="flex items-center space-x-3">
                <DroneIcon className="w-6 h-6 text-brand-primary" />
                <span className="font-semibold text-light-text">{drone.id}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium text-gray-200`}>{drone.status}</span>
                <span className={`w-3 h-3 rounded-full ${statusColorMap[drone.status]}`}></span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-medium-text text-center py-4">No drones registered.</p>
        )}
      </div>
    </div>
  );
};

export default DroneList;
