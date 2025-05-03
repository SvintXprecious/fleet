'use client';

import React, { useState } from 'react';
import { Droplet, Edit, Trash2, Plus, Search, Filter, Car, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AdminFuel = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFuelLog, setEditingFuelLog] = useState(null);
  const [fuelLogs, setFuelLogs] = useState([
    {
      id: 'FUEL001',
      date: '2025-02-11',
      vehicle: 'Toyota Hilux',
      vehicleId: 'LUA001',
      driver: 'John Doe',
      liters: 45.5,
      costPerLiter: 2.50,
      totalCost: 113.75,
      odometer: 15420,
      fuelType: 'Diesel',
      location: 'Main Depot',
      notes: 'Regular refill'
    },
    {
      id: 'FUEL002',
      date: '2025-02-10',
      vehicle: 'Toyota Land Cruiser',
      vehicleId: 'LUA002',
      driver: 'Jane Smith',
      liters: 65.2,
      costPerLiter: 2.50,
      totalCost: 163.00,
      odometer: 22150,
      fuelType: 'Diesel',
      location: 'City Station',
      notes: 'Tank was nearly empty'
    },
    {
      id: 'FUEL003',
      date: '2025-02-09',
      vehicle: 'Nissan Patrol',
      vehicleId: 'LUA003',
      driver: 'Mike Johnson',
      liters: 55.8,
      costPerLiter: 2.50,
      totalCost: 139.50,
      odometer: 18760,
      fuelType: 'Diesel',
      location: 'Highway Station',
      notes: 'Long trip preparation'
    }
  ]);

  const [newFuelLog, setNewFuelLog] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicle: '',
    vehicleId: '',
    driver: '',
    liters: 0,
    costPerLiter: 2.50,
    totalCost: 0,
    odometer: 0,
    fuelType: 'Diesel',
    location: '',
    notes: ''
  });

  // Available vehicles and drivers (would typically come from an API)
  const vehicles = [
    { name: 'Toyota Hilux', id: 'LUA001' },
    { name: 'Toyota Land Cruiser', id: 'LUA002' },
    { name: 'Nissan Patrol', id: 'LUA003' }
  ];
  
  const drivers = ['John Doe', 'Jane Smith', 'Mike Johnson'];
  const fuelTypes = ['Diesel', 'Petrol', 'Premium'];
  const refillLocations = ['Main Depot', 'City Station', 'Highway Station', 'Other'];

  // Stats calculations
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const stats = {
    totalLiters: fuelLogs.reduce((sum, log) => sum + log.liters, 0),
    totalCost: fuelLogs.reduce((sum, log) => sum + log.totalCost, 0),
    monthlyConsumption: fuelLogs
      .filter(log => {
        const logDate = new Date(log.date);
        return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
      })
      .reduce((sum, log) => sum + log.liters, 0),
    averageCostPerLiter: fuelLogs.reduce((sum, log) => sum + log.totalCost, 0) / 
                        fuelLogs.reduce((sum, log) => sum + log.liters, 0)
  };

  // Calculate consumption trends per vehicle
  const vehicleConsumption = vehicles.map(vehicle => {
    const vehicleLogs = fuelLogs.filter(log => log.vehicleId === vehicle.id);
    const totalLiters = vehicleLogs.reduce((sum, log) => sum + log.liters, 0);
    const totalCost = vehicleLogs.reduce((sum, log) => sum + log.totalCost, 0);
    
    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      totalLiters,
      totalCost,
      averagePerRefill: totalLiters / (vehicleLogs.length || 1)
    };
  });

  // Filtering logic
  const filteredFuelLogs = fuelLogs.filter(log => {
    const matchesSearch = 
      log.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.driver.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVehicle = filterVehicle === 'all' || log.vehicleId === filterVehicle;
    
    return matchesSearch && matchesVehicle;
  });

  // Add new fuel log
  const handleAddFuelLog = () => {
    const id = `FUEL${String(fuelLogs.length + 1).padStart(3, '0')}`;
    setFuelLogs([...fuelLogs, { ...newFuelLog, id }]);
    setShowAddDialog(false);
    setNewFuelLog({
      date: new Date().toISOString().split('T')[0],
      vehicle: '',
      vehicleId: '',
      driver: '',
      liters: 0,
      costPerLiter: 2.50,
      totalCost: 0,
      odometer: 0,
      fuelType: 'Diesel',
      location: '',
      notes: ''
    });
  };

  // Edit fuel log
  const handleEditFuelLog = () => {
    setFuelLogs(fuelLogs.map(log => 
      log.id === editingFuelLog.id ? editingFuelLog : log
    ));
    setShowEditDialog(false);
    setEditingFuelLog(null);
  };

  // Delete fuel log
  const handleDeleteFuelLog = (id) => {
    setFuelLogs(fuelLogs.filter(log => log.id !== id));
  };

  // Calculate total cost when liters or cost per liter changes
  const calculateTotalCost = (liters, costPerLiter) => {
    return (parseFloat(liters) * parseFloat(costPerLiter)).toFixed(2);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Fuel Management</h1>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Fuel Log
        </Button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Fuel Used</p>
              <p className="text-2xl font-bold">{stats.totalLiters.toFixed(1)}L</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Droplet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-blue-600">All time consumption</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-green-600">Cumulative expenses</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Usage</p>
              <p className="text-2xl font-bold">{stats.monthlyConsumption.toFixed(1)}L</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Droplet className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-yellow-600">Current month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Cost/Liter</p>
              <p className="text-2xl font-bold">${stats.averageCostPerLiter.toFixed(2)}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-purple-600">Average cost</p>
          </div>
        </div>
      </div>

      {/* Vehicle Consumption Summary */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Vehicle Consumption Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicleConsumption.map(vehicle => (
            <div key={vehicle.vehicleId} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Car className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">{vehicle.vehicleName}</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p>Total Consumption: <span className="font-medium">{vehicle.totalLiters.toFixed(1)}L</span></p>
                <p>Total Cost: <span className="font-medium">${vehicle.totalCost.toFixed(2)}</span></p>
                <p>Avg. per Refill: <span className="font-medium">{vehicle.averagePerRefill.toFixed(1)}L</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fuel Logs List */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Fuel Logs</h2>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search logs..."
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterVehicle} onValueChange={setFilterVehicle}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredFuelLogs.map((log) => (
            <div key={log.id} className="flex items-center py-4 border-b last:border-0">
              <div className="bg-blue-100 p-2 rounded-lg mr-4">
                <Droplet className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{log.vehicle}</p>
                      <span className="text-sm text-gray-500">#{log.id}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{log.date}</span>
                      <span>•</span>
                      <span>{log.driver}</span>
                      <span>•</span>
                      <span>{log.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">Cost</p>
                      <p className="text-sm text-green-600">${log.totalCost.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Odometer</p>
                      <p className="text-sm text-gray-600">{log.odometer} km</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingFuelLog(log);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteFuelLog(log.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Fuel Log Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fuel Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-lg"
                  value={newFuelLog.date}
                  onChange={(e) => setNewFuelLog({...newFuelLog, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle</label>
                <Select 
                  value={newFuelLog.vehicleId}
                  onValueChange={(value) => {
                    const vehicle = vehicles.find(v => v.id === value);
                    setNewFuelLog({
                      ...newFuelLog, 
                      vehicleId: value,
                      vehicle: vehicle ? vehicle.name : ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Driver</label>
                <Select 
                  value={newFuelLog.driver}
                  onValueChange={(value) => setNewFuelLog({...newFuelLog, driver: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(driver => (
                      <SelectItem key={driver} value={driver}>{driver}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Select 
                  value={newFuelLog.location}
                  onValueChange={(value) => setNewFuelLog({...newFuelLog, location: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {refillLocations.map(location => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fuel Type</label>
                <Select 
                  value={newFuelLog.fuelType}
                  onValueChange={(value) => setNewFuelLog({...newFuelLog, fuelType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Odometer (km)</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded-lg"
                  value={newFuelLog.odometer}
                  onChange={(e) => setNewFuelLog({...newFuelLog, odometer: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Liters</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-2 border rounded-lg"
                  value={newFuelLog.liters}
                  onChange={(e) => {
                    const liters = parseFloat(e.target.value);
                    const totalCost = calculateTotalCost(liters, newFuelLog.costPerLiter);
                    setNewFuelLog({
                      ...newFuelLog, 
                      liters,
                      totalCost: parseFloat(totalCost)
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost per Liter</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded-lg"
                  value={newFuelLog.costPerLiter}
                  onChange={(e) => {
                    const costPerLiter = parseFloat(e.target.value);
                    const totalCost = calculateTotalCost(newFuelLog.liters, costPerLiter);
                    setNewFuelLog({
                      ...newFuelLog, 
                      costPerLiter,
                      totalCost: parseFloat(totalCost)
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Cost</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded-lg bg-gray-50"
                  value={newFuelLog.totalCost}
                  readOnly
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="w-full p-2 border rounded-lg"
                rows="3"
                value={newFuelLog.notes}
                onChange={(e) => setNewFuelLog({...newFuelLog, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddFuelLog}>Add Fuel Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Fuel Log Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Fuel Log</DialogTitle>
          </DialogHeader>
          {editingFuelLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg"
                    value={editingFuelLog.date}
                    onChange={(e) => setEditingFuelLog({...editingFuelLog, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vehicle</label>
                  <Select 
                    value={editingFuelLog.vehicleId}
                    onValueChange={(value) => {
                      const vehicle = vehicles.find(v => v.id === value);
                      setEditingFuelLog({
                        ...editingFuelLog, 
                        vehicleId: value,
                        vehicle: vehicle ? vehicle.name : ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Driver</label>
                  <Select 
                    value={editingFuelLog.driver}
                    onValueChange={(value) => setEditingFuelLog({...editingFuelLog, driver: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map(driver => (
                        <SelectItem key={driver} value={driver}>{driver}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Select 
                    value={editingFuelLog.location}
                    onValueChange={(value) => setEditingFuelLog({...editingFuelLog, location: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {refillLocations.map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuel Type</label>
                  <Select 
                    value={editingFuelLog.fuelType}
                    onValueChange={(value) => setEditingFuelLog({...editingFuelLog, fuelType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Odometer (km)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg"
                    value={editingFuelLog.odometer}
                    onChange={(e) => setEditingFuelLog({...editingFuelLog, odometer: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Liters</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border rounded-lg"
                    value={editingFuelLog.liters}
                    onChange={(e) => {
                      const liters = parseFloat(e.target.value);
                      const totalCost = calculateTotalCost(liters, editingFuelLog.costPerLiter);
                      setEditingFuelLog({
                        ...editingFuelLog, 
                        liters,
                        totalCost: parseFloat(totalCost)
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost per Liter</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border rounded-lg"
                    value={editingFuelLog.costPerLiter}
                    onChange={(e) => {
                      const costPerLiter = parseFloat(e.target.value);
                      const totalCost = calculateTotalCost(editingFuelLog.liters, costPerLiter);
                      setEditingFuelLog({
                        ...editingFuelLog, 
                        costPerLiter,
                        totalCost: parseFloat(totalCost)
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border rounded-lg bg-gray-50"
                    value={editingFuelLog.totalCost}
                    readOnly
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows="3"
                  value={editingFuelLog.notes}
                  onChange={(e) => setEditingFuelLog({...editingFuelLog, notes: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingFuelLog(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditFuelLog}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFuel;