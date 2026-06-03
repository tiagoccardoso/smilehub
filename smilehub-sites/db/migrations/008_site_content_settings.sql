CREATE TABLE IF NOT EXISTS public.site_content_settings (
  section text PRIMARY KEY CHECK (section IN ('home', 'about', 'services')),
  title text,
  subtitle text,
  body text,
  image_url text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_content_settings (section, title, subtitle, body, extra)
VALUES
  ('home', 'Reconecte-se com o seu sorriso', 'SmileHub - Uma nova abordagem para o conforto odontológico', 'Torne seu sorriso perfeito ainda melhor', '{}'::jsonb),
  ('about', 'Conheça a SmileHub: onde os sorrisos brilham mais', 'Nossa missão', 'Na SmileHub, nossa missão é oferecer cuidado odontológico excepcional em um ambiente confortável e acolhedor.', '{}'::jsonb),
  ('services', 'Nossos serviços odontológicos', 'Tratamentos completos para prevenção, estética, restauração e reabilitação oral.', 'Edite esta área nas configurações para destacar serviços, diferenciais e orientações da clínica.', '{}'::jsonb)
ON CONFLICT (section) DO NOTHING;

DO $$ BEGIN
  CREATE TRIGGER set_site_content_settings_updated_at
  BEFORE UPDATE ON public.site_content_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
