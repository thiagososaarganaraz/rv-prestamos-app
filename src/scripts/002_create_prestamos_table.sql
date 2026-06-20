-- Create method of payment enum type
DO $$ BEGIN
  CREATE TYPE metodo_pago_enum AS ENUM ('efectivo', 'transferencia');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create prestamos table
CREATE TABLE IF NOT EXISTS public.prestamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  monto NUMERIC(12, 2) NOT NULL,
  fecha_prestamo DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  estado estado_cliente NOT NULL DEFAULT 'pendiente',
  metodo_pago metodo_pago_enum,
  fecha_pago DATE,
  notas TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on prestamos
ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prestamos (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prestamos' AND policyname = 'Users can view their own prestamos'
  ) THEN
    CREATE POLICY "Users can view their own prestamos" ON public.prestamos FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prestamos' AND policyname = 'Users can insert their own prestamos'
  ) THEN
    CREATE POLICY "Users can insert their own prestamos" ON public.prestamos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prestamos' AND policyname = 'Users can update their own prestamos'
  ) THEN
    CREATE POLICY "Users can update their own prestamos" ON public.prestamos FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prestamos' AND policyname = 'Users can delete their own prestamos'
  ) THEN
    CREATE POLICY "Users can delete their own prestamos" ON public.prestamos FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Indexes for prestamos
CREATE INDEX IF NOT EXISTS idx_prestamos_cliente_id ON public.prestamos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_fecha_vencimiento ON public.prestamos(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON public.prestamos(estado);
CREATE INDEX IF NOT EXISTS idx_prestamos_user_id ON public.prestamos(user_id);

-- Migrate existing clientes loan data into prestamos (only if clientes has loan columns)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'monto_deuda'
  ) THEN
    INSERT INTO public.prestamos (cliente_id, monto, fecha_prestamo, fecha_vencimiento, estado, user_id, created_at)
    SELECT id, monto_deuda, created_at::date, fecha_vencimiento, estado, user_id, created_at
    FROM public.clientes
    WHERE monto_deuda IS NOT NULL AND monto_deuda > 0;
  END IF;
END $$;

-- Drop old loan columns from clientes (keep it as a profile only)
ALTER TABLE public.clientes DROP COLUMN IF EXISTS monto_deuda;
ALTER TABLE public.clientes DROP COLUMN IF EXISTS fecha_vencimiento;
ALTER TABLE public.clientes DROP COLUMN IF EXISTS estado;
