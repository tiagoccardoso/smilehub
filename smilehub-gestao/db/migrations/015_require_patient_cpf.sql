-- SmileHub - CPF obrigatório no cadastro de pacientes
-- Abordagem segura para produção:
-- 1. Cria uma constraint NOT VALID para bloquear novos inserts/updates sem CPF.
-- 2. Se não houver pacientes antigos sem CPF, valida a constraint e torna a coluna NOT NULL.
-- 3. Se houver dados legados sem CPF, preserva os registros atuais e mantém a proteção para novos salvamentos.

DO $$
DECLARE
  has_missing_cpf boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'patients_cpf_required_check'
       AND conrelid = 'public.patients'::regclass
  ) THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT patients_cpf_required_check
      CHECK (cpf IS NOT NULL AND btrim(cpf) <> '') NOT VALID;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.patients
     WHERE cpf IS NULL OR btrim(cpf) = ''
     LIMIT 1
  ) INTO has_missing_cpf;

  IF NOT has_missing_cpf THEN
    ALTER TABLE public.patients VALIDATE CONSTRAINT patients_cpf_required_check;
    ALTER TABLE public.patients ALTER COLUMN cpf SET NOT NULL;
  END IF;
END $$;

-- Caso existam pacientes antigos sem CPF, preencha esses documentos e depois execute:
-- ALTER TABLE public.patients VALIDATE CONSTRAINT patients_cpf_required_check;
-- ALTER TABLE public.patients ALTER COLUMN cpf SET NOT NULL;
