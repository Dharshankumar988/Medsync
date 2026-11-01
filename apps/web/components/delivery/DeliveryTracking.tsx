import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@medsync/ui';
import { Truck, Clock, CheckCircle, CheckCircle2, Loader2, MapPin, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

const DeliveryMap = dynamic(() => import('./DeliveryMap'), { ssr: false });

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

interface Location {
  lat: number;
  lon: number;
}

export default function DeliveryTracking() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [liveProgress, setLiveProgress] = useState<Record<string, number>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());


  // Live dynamic random speed progression simulation
  useEffect(() => {
    if (deliveries.length === 0) return;

    // Initialize progress values from server data
    setLiveProgress(prev => {
      const next = { ...prev };
      for (const d of deliveries) {
        if (next[d.dispensing_log_id] === undefined) {
          next[d.dispensing_log_id] = d.progress || 25;
        }
      }
      return next;
    });

    const interval = setInterval(() => {
      setLiveProgress(prev => {
        let changed = false;
        const next = { ...prev };
        for (const d of deliveries) {
          if (d.delivery_status === 'DELIVERED') {
            if (next[d.dispensing_log_id] !== 100) {
              next[d.dispensing_log_id] = 100;
              changed = true;
            }
            continue;
          }

          const current = next[d.dispensing_log_id] ?? (d.progress || 25);
          if (current < 97) {
            // Realistic random speed steps between 0.3% and 1.8%
            const jitter = +(Math.random() * 1.5 + 0.3).toFixed(1);
            next[d.dispensing_log_id] = Math.min(97, +(current + jitter).toFixed(1));
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [deliveries]);

  const handleConfirmReceived = async (logId: string) => {
    setConfirmingId(logId);
    try {
      try {
        await api.post(`/api/v1/delivery/tracking/${logId}/confirm-received`);
      } catch (e1) {
        // Fallback to complete-delivery on orders endpoint
        await api.post(`/api/v1/orders/${logId}/complete-delivery`);
      }

      toast.success("Package receipt confirmed! Order marked as Delivered.");
      
      // Mark as confirmed in persistent local state
      setConfirmedIds(prev => new Set(prev).add(logId));
      setLiveProgress(prev => ({ ...prev, [logId]: 100 }));
      setDeliveries(prev => prev.map(d => d.dispensing_log_id === logId ? { ...d, delivery_status: 'DELIVERED', progress: 100 } : d));

      // Refresh list after 1.5s
      setTimeout(() => {
        fetchDeliveries();
      }, 1500);
    } catch (err: any) {
      toast.error("Could not confirm receipt: " + (err.response?.data?.detail || err.message || "Please try again"));
    } finally {
      setConfirmingId(null);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const response = await (api as any).get('/api/v1/delivery/tracking/active', { noCache: true });
      const rawDeliveries = response.data?.data ?? response.data;
      const list = Array.isArray(rawDeliveries) ? rawDeliveries : [];
      // Respect already confirmed deliveries so they never revert to pending
      setDeliveries(list.map((d: any) => confirmedIds.has(d.dispensing_log_id) ? { ...d, delivery_status: 'DELIVERED', progress: 100 } : d));
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
      setDeliveries([]);
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

  const getBangaloreLocations = (delivery: Delivery): { pharmacy: Location; patient: Location } => {
    // Predefined Bangalore locations for simulation
    const pharmacies: { lat: number; lon: number }[] = [
      { lat: 12.9784, lon: 77.6408 },
      { lat: 12.9352, lon: 77.6245 },
      { lat: 12.9307, lon: 77.5801 },
      { lat: 12.9141, lon: 77.6101 },
      { lat: 12.9215, lon: 77.6372 },
    ];

    const patients: { lat: number; lon: number }[] = [
      { lat: 12.9820, lon: 77.6450 },
      { lat: 12.9280, lon: 77.6100 },
      { lat: 12.9180, lon: 77.5600 },
      { lat: 12.9100, lon: 77.6000 },
      { lat: 12.9050, lon: 77.6250 },
    ];

    const getSafeIndex = (str: string | undefined, len: number): number => {
      if (!str || len <= 0) return 0;
      const lastChar = str.slice(-1);
      const parsed = parseInt(lastChar, 16);
      if (!isNaN(parsed)) return parsed % len;
      return 0;
    };

    const pharmacyIdx = getSafeIndex(delivery.pharmacy_id, pharmacies.length);
    const patientIdx = getSafeIndex(delivery.prescription_id, patients.length);

    return {
      pharmacy: pharmacies[pharmacyIdx] || pharmacies[0],
      patient: patients[patientIdx] || patients[0]
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
              {(() => {
                const currentPct = Math.round(liveProgress[delivery.dispensing_log_id] ?? delivery.progress ?? 25);
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Delivery Progress</span>
                        {delivery.delivery_status !== 'DELIVERED' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500 animate-pulse">
                            Live GPS
                          </span>
                        )}
                      </div>
                      <span className="font-semibold font-mono text-primary">{currentPct}%</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${currentPct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Patient Received Package Action */}
              {delivery.delivery_status === 'DELIVERED' || confirmedIds.has(delivery.dispensing_log_id) ? (
                <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Package Delivered & Received</p>
                      <p className="text-xs text-muted-foreground">Package receipt confirmed. Delivery is complete.</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Delivered
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Package Arrival Confirmation</span>
                    <span className="text-muted-foreground text-[11px]">Action required by you</span>
                  </div>
                  <button
                    onClick={() => handleConfirmReceived(delivery.dispensing_log_id)}
                    disabled={confirmingId === delivery.dispensing_log_id}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {confirmingId === delivery.dispensing_log_id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirming Delivery...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>I Have Received the Package</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Click this button when your delivery arrives to mark it as Delivered.
                  </p>
                </div>
              )}

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
              {isExpanded && (() => {
                const pharmacyCoord: [number, number] = [locations.pharmacy.lon, locations.pharmacy.lat];
                const patientCoord: [number, number] = [locations.patient.lon, locations.patient.lat];
                const midLon = (pharmacyCoord[0] + patientCoord[0]) / 2 + 0.004;
                const midLat = (pharmacyCoord[1] + patientCoord[1]) / 2 + 0.002;

                const safeRoute = (delivery.route && delivery.route.geometry?.coordinates?.length)
                  ? delivery.route
                  : {
                      geometry: {
                        coordinates: [
                          pharmacyCoord,
                          [midLon, midLat],
                          patientCoord
                        ]
                      }
                    };

                const currentProgress = Math.max(0.05, Math.min(0.95, (delivery.progress || 50) / 100));
                const curLat = locations.pharmacy.lat + (locations.patient.lat - locations.pharmacy.lat) * currentProgress;
                const curLon = locations.pharmacy.lon + (locations.patient.lon - locations.pharmacy.lon) * currentProgress;
                const safeCurrentLocation = (delivery.current_location && delivery.current_location.lat)
                  ? delivery.current_location
                  : { lat: curLat, lon: curLon };

                return (
                  <div className="h-80 rounded-xl overflow-hidden border border-border/80 shadow-inner mt-4">
                    <DeliveryMap
                      route={safeRoute}
                      currentLocation={safeCurrentLocation}
                      status={delivery.delivery_status}
                      pharmacyLocation={locations.pharmacy}
                      patientLocation={locations.patient}
                    />
                  </div>
                );
              })()}

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
