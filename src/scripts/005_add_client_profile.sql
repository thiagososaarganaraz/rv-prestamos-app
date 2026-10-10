-- Ejecutar manualmente en QA antes del código y luego en producción.
BEGIN;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS ocupacion TEXT,
  ADD COLUMN IF NOT EXISTS redes_sociales JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dni_frente TEXT,
  ADD COLUMN IF NOT EXISTS dni_dorso TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.clientes'::regclass AND conname = 'clientes_redes_array_check') THEN
    ALTER TABLE public.clientes ADD CONSTRAINT clientes_redes_array_check CHECK (jsonb_typeof(redes_sociales) = 'array');
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clientes-dni', 'clientes-dni', false, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS clientes_dni_select ON storage.objects;
CREATE POLICY clientes_dni_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'clientes-dni'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS clientes_dni_insert ON storage.objects;
CREATE POLICY clientes_dni_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'clientes-dni'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.clientes c WHERE c.id::text = (storage.foldername(name))[2] AND c.user_id = (SELECT auth.uid()))
);

-- Permitir limpiar archivos propios después de eliminar el cliente.
DROP POLICY IF EXISTS clientes_dni_delete ON storage.objects;
CREATE POLICY clientes_dni_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'clientes-dni' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- SELECT y DELETE usan la carpeta del propietario para permitir la limpieza
-- después de eliminar al cliente. INSERT exige además que el cliente exista.

COMMIT;
