"use client";

import DeliveryTracking from '@/components/delivery/DeliveryTracking';

export default function DeliveryTrackingPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pt-4 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Delivery Tracking</h1>
        <p className="text-muted-foreground">
          Track your prescription deliveries in real-time
        </p>
      </div>

      <DeliveryTracking />
    </div>
  );
}
