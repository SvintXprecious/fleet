import React, { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

interface VehicleMetadata {
  model?: string;
  year?: number;
  color?: string;
  engineNumber?: string;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
}

interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  typeId: string;
  typeName?: string;
  status: 'Available' | 'In Use' | 'Maintenance';
  driverId: string | null;
  lastMaintenance: string;
  fuelLevel: string;
  metadata?: VehicleMetadata;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
}

const AvailableVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef, where('status', '==', 'Available'));
        const querySnapshot = await getDocs(q);
        
        const availableVehicles = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vehicle[];
        
        setVehicles(availableVehicles);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError('Failed to load available vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Available Vehicles</h2>
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Available Vehicles</h2>
          <div className="text-red-600 text-center py-4">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Available Vehicles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{vehicle.name}</h3>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Available
                </span>
              </div>
              <p className="text-sm text-gray-600">Registration: {vehicle.licensePlate}</p>
              {vehicle.metadata?.model && (
                <p className="text-sm text-gray-600">{vehicle.metadata.model}</p>
              )}
              {vehicle.metadata?.transmission && (
                <p className="text-sm text-gray-600">{vehicle.metadata.transmission}</p>
              )}
              <button 
                onClick={() => window.location.href = '/dashboard/request'}
                className="mt-3 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Request Booking
              </button>
            </div>
          ))}
          
          {vehicles.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No vehicles are currently available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailableVehicles;