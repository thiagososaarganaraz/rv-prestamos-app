import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClienteConPrestamos, getClientes } from '@/lib/actions'
import { ClienteDetalleClient } from '@/components/cliente-detalle-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClienteDetallePage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [data, clientes] = await Promise.all([
    getClienteConPrestamos(id),
    getClientes(),
  ])

  if (!data) notFound()

  const { prestamos, ...cliente } = data

  return (
    <ClienteDetalleClient
      cliente={cliente}
      prestamos={prestamos}
      clientes={clientes}
    />
  )
}
