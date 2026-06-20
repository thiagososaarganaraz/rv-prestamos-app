-- Create enum type for client status (idempotent)
DO $$ BEGIN
  CREATE TYPE estado_cliente AS ENUM ('pendiente', 'pagado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  monto_deuda NUMERIC(12, 2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado estado_cliente NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only the owner can access their clients (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Users can view their own clients'
  ) THEN
    CREATE POLICY "Users can view their own clients" ON public.clientes FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Users can insert their own clients'
  ) THEN
    CREATE POLICY "Users can insert their own clients" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Users can update their own clients'
  ) THEN
    CREATE POLICY "Users can update their own clients" ON public.clientes FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Users can delete their own clients'
  ) THEN
    CREATE POLICY "Users can delete their own clients" ON public.clientes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for faster queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_clientes_fecha_vencimiento ON public.clientes(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes(estado);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
