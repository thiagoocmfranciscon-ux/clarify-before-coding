ALTER TABLE public.vehicles DROP CONSTRAINT vehicles_plate_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_plate_check CHECK (length(trim(plate)) > 0);
COMMENT ON COLUMN public.vehicles.plate IS 'Fleet serial identifier; legacy column name retained for compatibility.';
COMMENT ON COLUMN public.vehicles.odometer IS 'Fleet hour-meter reading in hours; legacy column name retained for compatibility.';
COMMENT ON COLUMN public.vehicles.next_service_km IS 'Next fleet service hour-meter threshold in hours; legacy column name retained for compatibility.';
COMMENT ON COLUMN public.vehicle_events.odometer IS 'Fleet hour-meter event reading in hours; legacy column name retained for compatibility.';