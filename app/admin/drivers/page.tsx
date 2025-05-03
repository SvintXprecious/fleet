'use client';

import React, { useState, useEffect } from 'react';
import { Users, Edit, Trash2, Plus, Search, Filter, Car, PhoneCall, MoreVertical, Info } from 'lucide-react';
import { db, auth } from '@/firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  orderBy,
  where,
  Timestamp 
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// TypeScript interfaces
interface Driver {
  docId?: string;
  name: string;
  status: 'On Duty' | 'Off Duty' | 'On Leave';
  phone: string;
  license: string;
  totalTrips: number;
  rating: number;
  address: string;
  joinDate: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
}

interface Vehicle {
  docId: string;
  name: string;
  driverId: string | null;
}

const AdminDrivers = () => {
  // State management
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Constants
  const driverStatuses = ['On Duty', 'Off Duty', 'On Leave'];

  // Initial driver state
  const initialDriverState: Driver = {
    name: '',
    phone: '',
    license: '',
    status: 'Off Duty',
    totalTrips: 0,
    rating: 0.0,
    address: '',
    joinDate: new Date().toISOString().split('T')[0]
  };

  const [newDriver, setNewDriver] = useState<Driver>(initialDriverState);

  // Show alert helper function
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning') => {
    setAlertInfo({
      show: true,
      title,
      message,
      type
    });

    // Auto hide after 5 seconds
    setTimeout(() => {
      setAlertInfo(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Reset form helper function
  const resetForm = () => {
    setNewDriver(initialDriverState);
    setEditingDriver(null);
    setError(null);
  };

  // Fetch drivers and vehicles
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch drivers
        const driversRef = collection(db, 'drivers');
        const driversQuery = query(driversRef, orderBy('createdAt', 'desc'));
        const driversSnapshot = await getDocs(driversQuery);
        const driversList = driversSnapshot.docs.map(doc => ({
          ...doc.data(),
          docId: doc.id
        })) as Driver[];

        // Fetch vehicles
        const vehiclesRef = collection(db, 'vehicles');
        const vehiclesSnapshot = await getDocs(vehiclesRef);
        const vehiclesList = vehiclesSnapshot.docs.map(doc => ({
          docId: doc.id,
          name: doc.data().name,
          driverId: doc.data().driverId
        })) as Vehicle[];

        setDrivers(driversList);
        setVehicles(vehiclesList);
      } catch (error) {
        console.error('Error fetching data:', error);
        showAlert(
          'Error Loading Data',
          'Failed to load drivers and vehicles. Please try again.',
          'error'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper function to get assigned vehicle for a driver
  const getAssignedVehicle = (driverId: string) => {
    const assignedVehicle = vehicles.find(v => v.driverId === driverId);
    return assignedVehicle ? assignedVehicle.name : 'Unassigned';
  };

  // Stats calculations
  const stats = {
    total: drivers.length,
    onDuty: drivers.filter(d => d.status === 'On Duty').length,
    offDuty: drivers.filter(d => d.status === 'Off Duty').length,
    onLeave: drivers.filter(d => d.status === 'On Leave').length
  };

  // Filtering logic
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.phone.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || driver.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Validation function
  const validateDriver = (driver: Driver): { isValid: boolean; message: string } => {
    if (!driver.name.trim()) {
      return { isValid: false, message: 'Name is required' };
    }
    if (!driver.phone.trim()) {
      return { isValid: false, message: 'Phone number is required' };
    }
    if (!driver.license.trim()) {
      return { isValid: false, message: 'License number is required' };
    }
    return { isValid: true, message: '' };
  };

  // Add new driver
  const handleAddDriver = async () => {
    try {
      setError(null);
      const validation = validateDriver(newDriver);
      if (!validation.isValid) {
        showAlert('Validation Error', validation.message, 'error');
        return;
      }
  
      const driverData = {
        ...newDriver,
        status: 'Off Duty',
        createdBy: auth.currentUser?.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
  
      const docRef = await addDoc(collection(db, 'drivers'), driverData);
      
      setDrivers([...drivers, { ...driverData, docId: docRef.id }]);
      setShowAddDialog(false);
      resetForm();
      showAlert('Success', 'Driver added successfully', 'success');
    } catch (error) {
      console.error('Error adding driver:', error);
      showAlert(
        'Error',
        'Failed to add driver. Please try again.',
        'error'
      );
    }
  };

  // Edit driver
  const handleEditDriver = async () => {
    try {
      setError(null);
      if (!editingDriver?.docId) return;
      
      const validation = validateDriver(editingDriver);
      if (!validation.isValid) {
        showAlert('Validation Error', validation.message, 'error');
        return;
      }

      const driverRef = doc(db, 'drivers', editingDriver.docId);
      
      // Get the current driver to check their previous status
      const currentDriver = drivers.find(d => d.docId === editingDriver.docId);
      if (!currentDriver) {
        showAlert('Error', 'Driver not found', 'error');
        return;
      }

      // Handle status changes
      if (currentDriver.status === 'On Duty' && 
          (editingDriver.status === 'Off Duty' || editingDriver.status === 'On Leave')) {
        // Find the vehicle assigned to this driver
        const assignedVehicle = vehicles.find(v => v.driverId === editingDriver.docId);
        if (assignedVehicle) {
          // Update vehicle to remove driver assignment
          const vehicleRef = doc(db, 'vehicles', assignedVehicle.docId);
          await updateDoc(vehicleRef, {
            driverId: null,
            status: 'Available',
            updatedAt: Timestamp.now()
          });
          
          // Update local vehicles state
          setVehicles(vehicles.map(v => 
            v.docId === assignedVehicle.docId 
              ? { ...v, driverId: null, status: 'Available' }
              : v
          ));
        }
      }

      const { docId, ...updateData } = editingDriver;
      updateData.updatedAt = Timestamp.now();
      
      await updateDoc(driverRef, updateData);
      
      setDrivers(drivers.map(d => 
        d.docId === editingDriver.docId ? editingDriver : d
      ));
      
      setShowEditDialog(false);
      resetForm();
      showAlert('Success', 'Driver updated successfully', 'success');
    } catch (error) {
      console.error('Error updating driver:', error);
      showAlert(
        'Error',
        'Failed to update driver. Please try again.',
        'error'
      );
    }
  };

  // Delete driver
  const handleDeleteDriver = async (docId: string) => {
    try {
      setError(null);
      
      // Get the driver's current status
      const driver = drivers.find(d => d.docId === docId);
      if (!driver) {
        showAlert('Error', 'Driver not found', 'error');
        return;
      }

      const driverRef = doc(db, 'drivers', docId);
      await deleteDoc(driverRef);
      
      setDrivers(drivers.filter(d => d.docId !== docId));
      setShowDeleteDialog(false);
      setDeletingDriverId(null);
      showAlert('Success', 'Driver deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting driver:', error);
      showAlert(
        'Error',
        'Failed to delete driver. Please try again.',
        'error'
      );
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Drivers Management</h1>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </div>
      
      {/* Alert Display */}
      {alertInfo.show && (
        <Alert variant={alertInfo.type === 'success' ? 'default' : 
                        alertInfo.type === 'warning' ? 'destructive' : 'destructive'}
              className={`${
                alertInfo.type === 'success' ? 'border-green-500 text-green-800 bg-green-50' :
                alertInfo.type === 'warning' ? 'border-orange-500 text-orange-800 bg-orange-50' :
                'border-red-500 text-red-800 bg-red-50'
              } mb-6`}>
          <AlertTitle className="text-lg font-semibold">
            {alertInfo.title}
          </AlertTitle>
          <AlertDescription className="text-sm mt-1">
            {alertInfo.message}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Drivers</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-green-600">Fleet capacity</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">On Duty</p>
              <p className="text-2xl font-bold">{stats.onDuty}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Car className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Currently working</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Off Duty</p>
              <p className="text-2xl font-bold">{stats.offDuty}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
          <p className="text-sm text-orange-600">Available for dispatch</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">On Leave</p>
              <p className="text-2xl font-bold">{stats.onLeave}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-red-600">Currently unavailable</p>
          </div>
        </div>
      </div>

      {/* Driver List Card */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Driver List</h2>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search drivers..."
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
                {driverStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No drivers added yet. Click "Add Driver" to get started.
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No drivers found matching your search criteria
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDrivers.map((driver) => (
              <div key={driver.docId} className="flex items-center py-4 border-b last:border-0">
                <div className="bg-blue-100 p-2 rounded-lg mr-4">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{driver.name}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <PhoneCall className="h-4 w-4" />
                          {driver.phone}
                        </span>
                        <span>•</span>
                        <span>{driver.license}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">Vehicle</p>
                        <p className="text-sm text-gray-600">{getAssignedVehicle(driver.docId!)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Rating</p>
                        <p className="text-sm text-blue-600">{driver.rating.toFixed(1)} / 5.0</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Status</p>
                        <p className={`text-sm ${
                          driver.status === 'On Duty' ? 'text-green-600' :
                          driver.status === 'Off Duty' ? 'text-orange-600' :
                          'text-red-600'
                        }`}>{driver.status}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingDriver(driver);
                            setShowEditDialog(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {driver.status !== 'On Duty' && (
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                setDeletingDriverId(driver.docId!);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
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

      {/* Add Driver Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowAddDialog(open);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newDriver.phone}
                  onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newDriver.license}
                  onChange={(e) => setNewDriver({...newDriver, license: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Join Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newDriver.joinDate}
                  onChange={(e) => setNewDriver({...newDriver, joinDate: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newDriver.address}
                onChange={(e) => setNewDriver({...newDriver, address: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddDriver}>Add Driver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowEditDialog(open);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
          </DialogHeader>
          {editingDriver && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingDriver.name}
                    onChange={(e) => setEditingDriver({...editingDriver, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingDriver.phone}
                    onChange={(e) => setEditingDriver({...editingDriver, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingDriver.license}
                    onChange={(e) => setEditingDriver({...editingDriver, license: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Join Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingDriver.joinDate}
                    onChange={(e) => setEditingDriver({...editingDriver, joinDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingDriver.address}
                  onChange={(e) => setEditingDriver({...editingDriver, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Trips</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingDriver.totalTrips}
                    onChange={(e) => setEditingDriver({...editingDriver, totalTrips: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingDriver.rating}
                    onChange={(e) => setEditingDriver({...editingDriver, rating: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={editingDriver.status}
                  onValueChange={(value: 'On Duty' | 'Off Duty' | 'On Leave') => {
                    try {
                      const oldStatus = editingDriver.status;
                      const newStatus = value;
                      
                      // If changing from On Duty
                      if (oldStatus === 'On Duty' && newStatus !== oldStatus) {
                        // Find any vehicle assigned to this driver
                        const assignedVehicle = vehicles.find(v => v.driverId === editingDriver.docId);
                        
                        if (assignedVehicle) {
                          // Will be handled in handleEditDriver
                          setEditingDriver({...editingDriver, status: newStatus});
                        }
                      } else {
                        // For all other status changes
                        setEditingDriver({...editingDriver, status: newStatus});
                      }
                    } catch (error) {
                      console.error('Error updating driver status:', error);
                      showAlert(
                        'Error',
                        'Failed to update driver status. Please try again.',
                        'error'
                      );
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {editingDriver.status === 'On Duty' ? (
                      <>
                        <SelectItem value="Off Duty">Off Duty</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="Off Duty">Off Duty</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-blue-600 mt-1 flex items-center">
                  <Info className="h-4 w-4 mr-1" />
                  Assigning a driver to "On Duty" can only be done in the Vehicles page
                </p>
              </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowEditDialog(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleEditDriver}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
  
        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          open={showDeleteDialog} 
          onOpenChange={(open) => {
            if (!open) {
              setShowDeleteDialog(false);
              setDeletingDriverId(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the driver
                record from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteDialog(false);
                setDeletingDriverId(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deletingDriverId) {
                    const driver = drivers.find(d => d.docId === deletingDriverId);
                    if (driver) {
                      handleDeleteDriver(deletingDriverId);
                    }
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
  
        {/* Error Boundary Dialog */}
        <Dialog 
          open={!!error} 
          onOpenChange={() => setError(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Error Occurred</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600">{error}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setError(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  
  // Add component prop types
  interface AdminDriversProps {
    className?: string;
  }
  
  // Default exports
  export type { Driver, Vehicle };
  export default AdminDrivers;