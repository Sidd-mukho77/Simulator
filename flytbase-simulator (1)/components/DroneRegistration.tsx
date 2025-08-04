
import React, { useState } from 'react';

interface DroneRegistrationProps {
  onAddDrone: (id: string) => void;
  drones: { id: string }[];
}

const DroneRegistration: React.FC<DroneRegistrationProps> = ({ onAddDrone, drones }) => {
  const [droneId, setDroneId] = useState('');
  const [error, setError] = useState('');

  const handleAddDrone = () => {
    if (!droneId.trim()) {
      setError('Drone ID cannot be empty.');
      return;
    }
    if (drones.some(d => d.id.toLowerCase() === droneId.trim().toLowerCase())) {
      setError('A drone with this ID already exists.');
      return;
    }
    onAddDrone(droneId.trim());
    setDroneId('');
    setError('');
  };

  return (
    <div className="bg-dark-surface p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-3 text-light-text">Register New Drone</h3>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={droneId}
          onChange={(e) => setDroneId(e.target.value)}
          placeholder="Enter Drone ID (e.g., DR-001)"
          className="flex-grow bg-gray-700 text-light-text placeholder-medium-text border border-dark-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <button
          onClick={handleAddDrone}
          className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
          Add
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default DroneRegistration;
