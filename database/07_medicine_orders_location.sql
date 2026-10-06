-- 10_medicine_orders_location.sql
-- Add delivery_latitude and delivery_longitude to medicine_orders

BEGIN;

ALTER TABLE medicine_orders ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC(10, 8);
ALTER TABLE medicine_orders ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(11, 8);

COMMIT;
