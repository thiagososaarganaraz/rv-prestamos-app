-- Ejecutar en QA y luego producción ANTES de desplegar la aplicación.
-- La tasa general actual se copia una sola vez; no reconstruye tasas históricas.
BEGIN;

ALTER TABLE public.prestamos ADD COLUMN IF NOT EXISTS tasa_interes NUMERIC;

DO $$
BEGIN
  -- configuracion_interes no tiene DDL propio en el repositorio.
  IF to_regclass('public.configuracion_interes') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.prestamos p
      CROSS JOIN LATERAL (
        SELECT c.tasa_porcentaje::numeric AS rate
        FROM public.configuracion_interes c
        WHERE c.user_id = p.user_id
        ORDER BY c.fecha_inicio DESC
        LIMIT 1
      ) current_rate
      WHERE p.tasa_interes IS NULL
        AND (current_rate.rate IS NULL
          OR current_rate.rate::text IN ('NaN', 'Infinity', '-Infinity')
          OR current_rate.rate < 0
          OR current_rate.rate <> round(current_rate.rate, 2))
    ) THEN
      RAISE EXCEPTION 'Hay tasas generales inválidas. Corregir configuracion_interes (valor finito, no negativo y hasta dos decimales) y volver a ejecutar la migración.';
    END IF;

    UPDATE public.prestamos p
    SET tasa_interes = COALESCE((
      SELECT c.tasa_porcentaje::numeric
      FROM public.configuracion_interes c
      WHERE c.user_id = p.user_id
      ORDER BY c.fecha_inicio DESC
      LIMIT 1
    ), 0)
    WHERE p.tasa_interes IS NULL;
  ELSE
    UPDATE public.prestamos SET tasa_interes = 0 WHERE tasa_interes IS NULL;
  END IF;
END $$;

ALTER TABLE public.prestamos ALTER COLUMN tasa_interes SET NOT NULL;
ALTER TABLE public.prestamos ALTER COLUMN tasa_interes DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.prestamos'::regclass
      AND conname = 'prestamos_tasa_interes_check'
  ) THEN
    ALTER TABLE public.prestamos ADD CONSTRAINT prestamos_tasa_interes_check CHECK (
      tasa_interes::text NOT IN ('NaN', 'Infinity', '-Infinity')
      AND tasa_interes >= 0
      AND tasa_interes = round(tasa_interes, 2)
    );
  END IF;
END $$;

COMMIT;
