
import React from 'react';
import type { Mission } from '../types';
import { MissionStatus } from '../types';
import { DroneIcon, AlertTriangleIcon } from './icons';

interface MissionListProps {
  missions: Mission[];
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

const statusStyles: Record<MissionStatus, { text: string; bg: string }> = {
    [MissionStatus.Pending]: { text: 'text-blue-300', bg: 'bg-blue-900' },
    [MissionStatus.Executing]: { text: 'text-yellow-300', bg: 'bg-yellow-900' },
    [MissionStatus.Completed]: { text: 'text-green-300', bg: 'bg-green-900' },
    [MissionStatus.Conflict]: { text: 'text-red-300', bg: 'bg-red-900' },
};

const MissionList: React.FC<MissionListProps> = ({ missions, onAnalyze, isAnalyzing }) => {
  return (
    <div className="bg-dark-surface p-4 rounded-lg shadow-lg mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-light-text">Mission Queue</h3>
        <button 
          onClick={onAnalyze} 
          disabled={isAnalyzing || missions.length < 2}
          className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <AlertTriangleIcon className="w-5 h-5" />
          )}
          <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Conflicts'}</span>
        </button>
      </div>

      <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
        {missions.length > 0 ? (
          missions.map((mission) => (
            <div key={mission.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
              <div className="flex items-center space-x-3">
                <DroneIcon className="w-6 h-6" style={{color: mission.pathColor}}/>
                <div>
                  <p className="font-semibold text-light-text">Mission {mission.id}</p>
                  <p className="text-sm text-medium-text">Drone: {mission.droneId}</p>
                </div>
              </div>
              <div className={`text-xs font-bold px-2 py-1 rounded-full ${statusStyles[mission.status].bg} ${statusStyles[mission.status].text}`}>
                {mission.status}
              </div>
            </div>
          ))
        ) : (
          <p className="text-medium-text text-center py-4">No missions assigned yet.</p>
        )}
      </div>
    </div>
  );
};

export default MissionList;
