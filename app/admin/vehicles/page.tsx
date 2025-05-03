'use client';

import React, { useState, useEffect } from 'react';
import { Car, Edit, Trash2, Plus, Search, Filter, AlertTriangle, Calendar, MoreVertical } from 'lucide-react';
import { db } from '@/firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  orderBy,
  Timestamp,
  where,
  getDoc 
} from 'firebase/firestore';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// TypeScript interfaces
interface VehicleType {
  id: string;
  name: string;
}

interface Driver {
  docId: string;
  name: string;
  status: 'On Duty' | 'Off Duty' | 'On Leave' | 'Training';
  phone: string;
}

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
  docId?: string;
  name: string;
  licensePlate: string;
  typeId: string;
  typeName?: string;  // Added typeName for UI display
  status: 'Available' | 'In Use' | 'Maintenance';
  driverId: string | null;
  lastMaintenance: string;
  fuelLevel: string;
  metadata?: VehicleMetadata;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
}

const AdminVehicles = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [driverDetails, setDriverDetails] = useState<Record<string, Driver>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial vehicle state
  const initialVehicleState: Vehicle = {
    name: '',
    licensePlate: '',
    typeId: '',
    status: 'Available',
    driverId: null,
    lastMaintenance: new Date().toISOString().split('T')[0],
    fuelLevel: '100%',
    metadata: {
      model: '',
      year: new Date().getFullYear(),
      color: '',
      engineNumber: '',
      mileage: 0,
      fuelType: '',
      transmission: ''
    }
  };

  const [newVehicle, setNewVehicle] = useState<Vehicle>(initialVehicleState);

  // Fetch vehicle types from Firestore
  const fetchVehicleTypes = async () => {
    try {
      const vehicleTypesRef = collection(db, 'VehicleType');
      const querySnapshot = await getDocs(vehicleTypesRef);
      
      const types = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VehicleType[];
      
      setVehicleTypes(types);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      setError('Failed to load vehicle types');
    }
  };

  // Fetch available drivers
  const fetchAvailableDrivers = async () => {
    try {
      const driversRef = collection(db, 'drivers');
      const q = query(driversRef, where('status', '==', 'Off Duty'));
      const querySnapshot = await getDocs(q);
      
      const driversList = querySnapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
      })) as Driver[];
      
      setAvailableDrivers(driversList);

      // Update driver details cache
      const newDriverDetails: Record<string, Driver> = {};
      driversList.forEach(driver => {
        newDriverDetails[driver.docId] = driver;
      });
      setDriverDetails(prevDetails => ({
        ...prevDetails,
        ...newDriverDetails
      }));
    } catch (error) {
      console.error('Error fetching available drivers:', error);
      setError('Failed to load available drivers');
    }
  };

  // Fetch driver details
  const fetchDriverDetails = async (driverId: string) => {
    if (!driverId || driverDetails[driverId]) return;
    
    try {
      const driverRef = doc(db, 'drivers', driverId);
      const driverSnap = await getDoc(driverRef);
      
      if (driverSnap.exists()) {
        const driverData = driverSnap.data() as Driver;
        setDriverDetails(prev => ({
          ...prev,
          [driverId]: { docId: driverSnap.id, ...driverData }
        }));
      }
    } catch (error) {
      console.error('Error fetching driver details:', error);
    }
  };

  // Fetch vehicles with improved TypeScript typing
  const fetchVehicles = async () => {
    try {
      const vehiclesRef = collection(db, 'vehicles');
      const q = query(vehiclesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const vehiclesList = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data() as Omit<Vehicle, 'docId' | 'typeName'>;
        let typeName = 'Unknown Type';

        if (data.typeId) {
          // Fetch the vehicle type document
          const typeDoc = doc(db, 'VehicleType', data.typeId);
          const typeSnapshot = await getDoc(typeDoc);
          if (typeSnapshot.exists()) {
            typeName = typeSnapshot.data().name;
          }
        }

        return {
          ...data,
          docId: docSnapshot.id,
          typeName
        } as Vehicle;
      }));
      
      setVehicles(vehiclesList);

      // Fetch details for all assigned drivers
      const driverIds = vehiclesList
        .map(v => v.driverId)
        .filter((id): id is string => id !== null);
      
      await Promise.all(driverIds.map(fetchDriverDetails));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const initializePage = async () => {
      await fetchVehicleTypes();
      await fetchAvailableDrivers();
      await fetchVehicles();
    };

    initializePage();
  }, []);

  // Update driver status
  const updateDriverStatus = async (driverId: string | null, isAssigning: boolean) => {
    if (!driverId) return;

    try {
      const driverRef = doc(db, 'drivers', driverId);
      await updateDoc(driverRef, {
        status: isAssigning ? 'On Duty' : 'Off Duty',
        updatedAt: Timestamp.now()
      });

      await fetchAvailableDrivers();
    } catch (error) {
      console.error('Error updating driver status:', error);
      throw error;
    }
  };

  // Stats calculations
  const stats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'Available').length,
    inUse: vehicles.filter(v => v.status === 'In Use').length,
    maintenance: vehicles.filter(v => v.status === 'Maintenance').length
  };

  // Filtering logic
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driverDetails[vehicle.driverId || '']?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;
    const matchesType = filterType === 'all' || vehicle.typeName === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Validation function
  const validateRequiredFields = (vehicle: Vehicle): boolean => {
    return !!(
      vehicle.name &&
      vehicle.licensePlate &&
      vehicle.typeId
    );
  };

  // Add new vehicle
  const handleAddVehicle = async () => {
    try {
      if (!validateRequiredFields(newVehicle)) {
        alert('Please fill in all required fields (Name, License Plate, and Type)');
        return;
      }
  
      const vehicleData = {
        ...newVehicle,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
  
      const docRef = await addDoc(collection(db, 'vehicles'), vehicleData);
      
      if (vehicleData.driverId) {
        await updateDriverStatus(vehicleData.driverId, true);
      }
  
      await fetchVehicles();
      setShowAddDialog(false);
      setNewVehicle(initialVehicleState);
    } catch (error) {
      console.error('Error adding vehicle:', error);
      setError('Failed to add vehicle');
    }
  };

  // Edit vehicle
  const handleEditVehicle = async () => {
    try {
      if (!editingVehicle?.docId) return;
      
      if (!validateRequiredFields(editingVehicle)) {
        alert('Please fill in all required fields (Name, License Plate, and Type)');
        return;
      }

      const oldVehicle = vehicles.find(v => v.docId === editingVehicle.docId);
      const vehicleRef = doc(db, 'vehicles', editingVehicle.docId);
      
      // Exclude docId and typeName from the update data
      const { docId, typeName, ...updateData } = editingVehicle;
      updateData.updatedAt = Timestamp.now();
      
      await updateDoc(vehicleRef, updateData);
      
      // Handle driver status updates
      if (oldVehicle?.driverId !== editingVehicle.driverId) {
        if (oldVehicle?.driverId) {
          await updateDriverStatus(oldVehicle.driverId, false);
        }
        if (editingVehicle.driverId) {
          await updateDriverStatus(editingVehicle.driverId, true);
        }
      }

      await fetchVehicles();
      setShowEditDialog(false);
      setEditingVehicle(null);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      setError('Failed to update vehicle');
    }
  };

  // Delete vehicle
  const handleDeleteVehicle = async (docId: string) => {
    try {
      const vehicle = vehicles.find(v => v.docId === docId);
      if (vehicle?.driverId) {
        await updateDriverStatus(vehicle.driverId, false);
      }

      const vehicleRef = doc(db, 'vehicles', docId);
      await deleteDoc(vehicleRef);
      
      setVehicles(vehicles.filter(v => v.docId !== docId));
      setShowDeleteDialog(false);
      setDeletingVehicleId(null);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setError('Failed to delete vehicle');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vehicles Overview</h1>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </Button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Vehicles</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Total fleet size</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold">{stats.available}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Car className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-green-600">Ready for assignment</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Use</p>
              <p className="text-2xl font-bold">{stats.inUse}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-blue-600">Currently on trips</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Maintenance</p>
              <p className="text-2xl font-bold">{stats.maintenance}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-red-600">Requires attention</p>
          </div>
        </div>
      </div>

      {/* Vehicle List Card */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Vehicle List</h2>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search vehicles..."
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="In Use">In Use</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {vehicleTypes.map(type => (
                  <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVehicles.map((vehicle) => (
              <div key={vehicle.docId} className="flex items-center py-4 border-b last:border-0">
                <div className="bg-blue-100 p-2 rounded-lg mr-4">
                  <Car className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{vehicle.name}</p>
                      <div className="flex gap-3 text-sm text-gray-600">
                        <span>{vehicle.licensePlate}</span>
                        <span>•</span>
                        <span>{vehicle.typeName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">Driver</p>
                        <p className="text-sm text-gray-600">
                          {vehicle.driverId ? driverDetails[vehicle.driverId]?.name : 'Unassigned'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Status</p>
                        <p className={`text-sm ${
                          vehicle.status === 'Available' ? 'text-green-600' :
                          vehicle.status === 'In Use' ? 'text-blue-600' :
                          'text-red-600'
                        }`}>{vehicle.status}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingVehicle(vehicle);
                            setShowEditDialog(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setDeletingVehicleId(vehicle.docId!);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Vehicle Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="metadata">Additional Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Vehicle Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  value={newVehicle.name}
                  onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  License Plate <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  value={newVehicle.licensePlate}
                  onChange={(e) => setNewVehicle({...newVehicle, licensePlate: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Type <span className="text-red-500">*</span>
                </label>
                <Select 
                  value={newVehicle.typeId}
                  onValueChange={(value) => setNewVehicle({...newVehicle, typeId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
  <label className="text-sm font-medium">Driver</label>
  <Select 
    value={newVehicle.driverId || 'unassigned'} // Changed from empty string
    onValueChange={(value) => setNewVehicle({
      ...newVehicle, 
      driverId: value === 'unassigned' ? null : value // Changed comparison
    })}
  >
    <SelectTrigger>
      <SelectValue placeholder="Assign driver" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="unassigned">Unassigned</SelectItem>
      {availableDrivers.map(driver => (
        <SelectItem key={driver.docId} value={driver.docId}>
          {driver.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={newVehicle.status}
                  onValueChange={(value: 'Available' | 'In Use' | 'Maintenance') => {
                    const newStatus = value;
                    let newDriverId = newVehicle.driverId;
                    
                    if (newStatus === 'Maintenance') {
                      newDriverId = null;
                    }
                    
                    setNewVehicle({
                      ...newVehicle, 
                      status: newStatus,
                      driverId: newDriverId
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="In Use">In Use</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Last Maintenance Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-lg"
                  value={newVehicle.lastMaintenance}
                  onChange={(e) => setNewVehicle({...newVehicle, lastMaintenance: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fuel Level</label>
                <Select 
                  value={newVehicle.fuelLevel}
                  onValueChange={(value) => setNewVehicle({...newVehicle, fuelLevel: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100%">100%</SelectItem>
                    <SelectItem value="75%">75%</SelectItem>
                    <SelectItem value="50%">50%</SelectItem>
                    <SelectItem value="25%">25%</SelectItem>
                    <SelectItem value="10%">10% (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4 py-4">
              <div className="text-sm text-gray-500 mb-4">
                Additional details are optional and can be added later
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    value={newVehicle.metadata?.model || ''}
                    onChange={(e) => setNewVehicle({
                      ...newVehicle,
                      metadata: {
                        ...newVehicle.metadata,
                        model: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg"
                    value={newVehicle.metadata?.year || ''}
                    onChange={(e) => setNewVehicle({
                      ...newVehicle,
                      metadata: {
                        ...newVehicle.metadata,
                        year: parseInt(e.target.value) || undefined
                      }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Color</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    value={newVehicle.metadata?.color || ''}
                    onChange={(e) => setNewVehicle({
                      ...newVehicle,
                      metadata: {
                        ...newVehicle.metadata,
                        color: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Engine Number</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    value={newVehicle.metadata?.engineNumber || ''}
                    onChange={(e) => setNewVehicle({
                      ...newVehicle,
                      metadata: {
                        ...newVehicle.metadata,
                        engineNumber: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Mileage</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg"
                    value={newVehicle.metadata?.mileage || ''}
                    onChange={(e) => setNewVehicle({
                      ...newVehicle,
                      metadata: {
                        ...newVehicle.metadata,
                        mileage: parseInt(e.target.value) || undefined
                      }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuel Type</label>
                  <Select 
                    value={newVehicle.metadata?.fuelType || 'none'}
                    onValueChange={(value) => setNewVehicle({
                      ...newVehicle,
                      metadata: {
                        ...newVehicle.metadata,
                        fuelType: value
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select fuel type</SelectItem>
                      <SelectItem value="Petrol">Petrol</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Electric">Electric</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Transmission</label>
                  <Select 
                    value={newVehicle.metadata?.transmission || 'none'}
                    onValueChange={(value) => setNewVehicle({
                      ...newVehicle,
                      metadata: {
                        ...newVehicle.metadata,
                        transmission: value
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transmission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select transmission</SelectItem>
                      <SelectItem value="Manual">Manual</SelectItem>
                      <SelectItem value="Automatic">Automatic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setNewVehicle(initialVehicleState);
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddVehicle}>Add Vehicle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          {editingVehicle && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="metadata">Additional Details</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Vehicle Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    value={editingVehicle.name}
                    onChange={(e) => setEditingVehicle({...editingVehicle, name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    License Plate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    value={editingVehicle.licensePlate}
                    onChange={(e) => setEditingVehicle({...editingVehicle, licensePlate: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <Select 
                    value={editingVehicle.typeId}
                    onValueChange={(value) => setEditingVehicle({...editingVehicle, typeId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select 
                    value={editingVehicle.status}
                    onValueChange={(value: 'Available' | 'In Use' | 'Maintenance') => {
                      const newStatus = value;
                      let newDriverId = editingVehicle.driverId;
                      
                      if (newStatus === 'Maintenance') {
                        newDriverId = null;
                      }
                      
                      setEditingVehicle({
                        ...editingVehicle, 
                        status: newStatus,
                        driverId: newDriverId
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="In Use">In Use</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
  <label className="text-sm font-medium">Driver</label>
  <Select 
    value={editingVehicle.driverId || 'unassigned'} // Changed from empty string
    onValueChange={(value) => {
      const newDriverId = value === 'unassigned' ? null : value; // Changed comparison
      let newStatus = editingVehicle.status;
      
      if (newDriverId && editingVehicle.status === 'Available') {
        newStatus = 'In Use';
      }
      else if (!newDriverId && editingVehicle.status === 'In Use') {
        newStatus = 'Available';
      }
      
      setEditingVehicle({
        ...editingVehicle,
        driverId: newDriverId,
        status: newStatus
      });
    }}
    disabled={editingVehicle.status === 'Maintenance'}
  >
    <SelectTrigger>
      <SelectValue placeholder="Assign driver" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="unassigned">Unassigned</SelectItem>
      {availableDrivers.map(driver => (
        <SelectItem key={driver.docId} value={driver.docId}>
          {driver.name}
        </SelectItem>
      ))}
      {editingVehicle.driverId && driverDetails[editingVehicle.driverId] && (
        <SelectItem value={editingVehicle.driverId}>
          {driverDetails[editingVehicle.driverId].name} (Current)
        </SelectItem>
      )}
    </SelectContent>
  </Select>
</div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Maintenance Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg"
                    value={editingVehicle.lastMaintenance}
                    onChange={(e) => setEditingVehicle({...editingVehicle, lastMaintenance: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuel Level</label>
                  <Select 
                    value={editingVehicle.fuelLevel}
                    onValueChange={(value) => setEditingVehicle({...editingVehicle, fuelLevel: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100%">100%</SelectItem>
                      <SelectItem value="75%">75%</SelectItem>
                      <SelectItem value="50%">50%</SelectItem>
                      <SelectItem value="25%">25%</SelectItem>
                      <SelectItem value="10%">10% (Low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4 py-4">
                <div className="text-sm text-gray-500 mb-4">
                  Additional details are optional and can be updated anytime
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg"
                      value={editingVehicle.metadata?.model || ''}
                      onChange={(e) => setEditingVehicle({
                        ...editingVehicle,
                        metadata: {
                          ...editingVehicle.metadata,
                          model: e.target.value
                        }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Year</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-lg"
                      value={editingVehicle.metadata?.year || ''}
                      onChange={(e) => setEditingVehicle({
                        ...editingVehicle,
                        metadata: {
                          ...editingVehicle.metadata,
                          year: parseInt(e.target.value) || undefined
                        }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg"
                      value={editingVehicle.metadata?.color || ''}
                      onChange={(e) => setEditingVehicle({
                        ...editingVehicle,
                        metadata: {
                          ...editingVehicle.metadata,
                          color: e.target.value
                        }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Engine Number</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg"
                      value={editingVehicle.metadata?.engineNumber || ''}
                      onChange={(e) => setEditingVehicle({
                        ...editingVehicle,
                        metadata: {
                          ...editingVehicle.metadata,
                          engineNumber: e.target.value
                        }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mileage</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-lg"
                      value={editingVehicle.metadata?.mileage || ''}
                      onChange={(e) => setEditingVehicle({
                        ...editingVehicle,
                        metadata: {
                          ...editingVehicle.metadata,
                          mileage: parseInt(e.target.value) || undefined
                        }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fuel Type</label>
                    <Select 
                      value={editingVehicle.metadata?.fuelType || ''}
                      onValueChange={(value) => setEditingVehicle({
                        ...editingVehicle,
                        metadata: {
                          ...editingVehicle.metadata,
                          fuelType: value
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Transmission</label>
                    <Select 
                      value={editingVehicle.metadata?.transmission || ''}
                      onValueChange={(value) => setEditingVehicle({
                        ...editingVehicle,
                        metadata: {
                          ...editingVehicle.metadata,
                          transmission: value
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transmission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="Automatic">Automatic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingVehicle(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditVehicle}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the vehicle
              record and free up any assigned driver.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setDeletingVehicleId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingVehicleId && handleDeleteVehicle(deletingVehicleId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminVehicles;