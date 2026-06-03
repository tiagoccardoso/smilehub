CREATE TABLE IF NOT EXISTS public.professional_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_start time,
  break_end time,
  appointment_duration_minutes integer NOT NULL DEFAULT 60 CHECK (appointment_duration_minutes > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT professional_schedules_time_check CHECK (end_time > start_time),
  CONSTRAINT professional_schedules_break_check CHECK (
    (break_start IS NULL AND break_end IS NULL)
    OR (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS professional_schedules_unique_day_idx
ON public.professional_schedules (professional_id, weekday);

DO $$ BEGIN
  CREATE TRIGGER set_professional_schedules_updated_at BEFORE UPDATE ON public.professional_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_professional_date_time_idx
  ON public.bookings (professional_id, date, time)
  WHERE status <> 'canceled';

CREATE UNIQUE INDEX IF NOT EXISTS bookings_professional_slot_unique_idx
  ON public.bookings (professional_id, date, time)
  WHERE professional_id IS NOT NULL AND status <> 'canceled';
