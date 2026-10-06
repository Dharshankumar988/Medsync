import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@medsync/ui';
import { Truck, Clock, CheckCircle, Loader2, MapPin, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import DeliveryMap from './DeliveryMap';

interface Delivery {
  dispensing_log_id: string;
  prescription_id: string;
  pharmacy_id: string;
  pharmacy_name: string;
  delivery_status: string;
  delivery_started_at: string;
  estimated_delivery_minutes: number;
  progress: number;
  route: any;
  current_location: any;
}

export default function DeliveryTracking() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      const response = await api.get('/api/v1/delivery/tracking/active');
      setDeliveries(response.data || []);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    // Poll every 5 seconds for updates
    const interval = setInterval(fetchDeliveries, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DISPATCHED':
        return <Truck className="w-5 h-5 text-blue-500" />;
      case 'IN_TRANSIT':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'DELIVERED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DISPATCHED':
        return 'Dispatched';
      case 'IN_TRANSIT':
        return 'In Transit';
      case 'DELIVERED':
        return 'Delivered';
      default:
        return 'Pending';
    }
  };

  const getBangaloreLocations = (delivery: Delivery) => {
    // Simulate predefined Bangalore locations
    const pharmacies = [
      { lat: 12.9784, lon: 77.6408 },
      { lat: 12.9352, lon: 77.6245 },
      { lat: 12.9307, lon: 77.5801 },
      { lat: 12.9141, lon: 77.6101 },
      { lat: 12.9215, lon: 77.6372 },
    ];

    const patients = [
      { lat: 12.9820, lon: 77.6450 },
      { lat: 12.9280, lon: 77.6100 },
      { lat: 12.9180, lon: 77.5600 },
      { lat: 12.9100, lon: 77.6000 },
      { lat: 12.9050, lon: 77.6250 },
    ];

    const pharmacyIdx = parseInt(delivery.pharmacy_id.slice(-1)) % pharmacies.length;
    const patientIdx = parseInt(delivery.prescription_id.slice(-1)) % patients.length;

    return {
      pharmacy: pharmacies[pharmacyIdx],
      patient: patients[patientIdx]
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Active Deliveries</h3>
          <p className="text-sm text-muted-foreground">
            Your dispensed prescriptions will appear here for tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Active Deliveries</h2>

      {deliveries.map((delivery) => {
        const locations = getBangaloreLocations(delivery);
        const isExpanded = expandedDelivery === delivery.dispensing_log_id;

        return (
          <Card key={delivery.dispensing_log_id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(delivery.delivery_status)}
                  <div>
                    <CardTitle className="text-lg">{delivery.pharmacy_name}</CardTitle>
                    <CardDescription>
                      {getStatusText(delivery.delivery_status)} • Est. {delivery.estimated_delivery_minutes} min
                    </CardDescription>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedDelivery(isExpanded ? null : delivery.dispensing_log_id)}
                  className="text-sm text-primary hover:underline"
                >
                  {isExpanded ? 'Hide Map' : 'View Map'}
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Progress</span>
                  <span className="font-medium">{delivery.progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${delivery.progress}%` }}
                  />
                </div>
              </div>

              {/* Delivery details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Started:</span>
                  <span className="font-medium">
                    {new Date(delivery.delivery_started_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{getStatusText(delivery.delivery_status)}</span>
                </div>
              </div>

              {/* Map */}
              {isExpanded && delivery.route && (
                <div className="h-80 rounded-lg overflow-hidden border">
                  <DeliveryMap
                    route={delivery.route}
                    currentLocation={delivery.current_location}
                    status={delivery.delivery_status}
                    pharmacyLocation={locations.pharmacy}
                    patientLocation={locations.patient}
                  />
                </div>
              )}

              {delivery.delivery_status === 'DELIVERED' && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Delivery Completed</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
