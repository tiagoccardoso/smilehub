-- Expande o odontograma para registrar procedimentos por dente com metadados
-- sem remover dados existentes de odontogram_entries.

ALTER TABLE public.odontogram_entries
  ADD COLUMN IF NOT EXISTS procedure_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public."user"(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.odontogram_entries
    ADD CONSTRAINT odontogram_entries_status_check
    CHECK (status IN ('planned', 'in_progress', 'completed', 'canceled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS odontogram_entries_patient_tooth_idx
  ON public.odontogram_entries (patient_id, tooth_code, updated_at DESC);

CREATE INDEX IF NOT EXISTS odontogram_entries_procedure_idx
  ON public.odontogram_entries (procedure_id)
  WHERE procedure_id IS NOT NULL;

DO $$ BEGIN
  CREATE TRIGGER set_odontogram_entries_updated_at
  BEFORE UPDATE ON public.odontogram_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
