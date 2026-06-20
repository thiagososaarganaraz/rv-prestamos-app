'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ClienteFormData, PrestamoFormData } from '@/lib/types'

// ─── Clientes ────────────────────────────────────────────────────────────────

export async function getClientes() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('user_id', user.id)
    .order('nombre', { ascending: true })

  if (error) return []
  return data
}

export async function crearCliente(formData: ClienteFormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...formData, user_id: user.id })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
  return data.id as string
}

export async function actualizarCliente(id: string, formData: Partial<ClienteFormData>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('clientes')
    .update(formData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
  revalidatePath(`/clientes/${id}`, 'page')
}

export async function eliminarCliente(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
}

// ─── Préstamos ───────────────────────────────────────────────────────────────

export async function getPrestamos() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('prestamos')
    .select('*, clientes(id, nombre, telefono)')
    .eq('user_id', user.id)
    .order('fecha_vencimiento', { ascending: true })

  if (error) return []
  return data
}

export async function getPrestamosPorCliente(clienteId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('prestamos')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('user_id', user.id)
    .order('fecha_prestamo', { ascending: false })

  if (error) return []
  return data
}

export async function getClienteConPrestamos(clienteId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: cliente, error: cError } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .eq('user_id', user.id)
    .single()

  if (cError || !cliente) return null

  const { data: prestamos } = await supabase
    .from('prestamos')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('user_id', user.id)
    .order('fecha_prestamo', { ascending: false })

  return { ...cliente, prestamos: prestamos ?? [] }
}

export async function crearPrestamo(formData: PrestamoFormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.from('prestamos').insert({
    ...formData,
    estado: 'pendiente',
    user_id: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
  revalidatePath(`/clientes/${formData.cliente_id}`, 'page')
}

export async function actualizarPrestamo(id: string, formData: Partial<PrestamoFormData>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('prestamos')
    .update(formData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
}

export async function marcarPrestamoPagado(
  id: string,
  fechaPago: string,
  metodoPago: 'efectivo' | 'transferencia'
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: prestamo } = await supabase
    .from('prestamos')
    .select('cliente_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('prestamos')
    .update({ estado: 'pagado', fecha_pago: fechaPago, metodo_pago: metodoPago })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
  if (prestamo?.cliente_id) revalidatePath(`/clientes/${prestamo.cliente_id}`, 'page')
}

export async function eliminarPrestamo(id: string, clienteId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('prestamos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
  revalidatePath(`/clientes/${clienteId}`, 'page')
}

export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}

// ─── Tasas de Interés ───────────────────────────────────────────────────────────────

export async function setNuevaTasa(tasa: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  await supabase.from('configuracion_interes').insert({
    tasa_porcentaje: tasa,
    user_id: user.id
  })
  revalidatePath('/ajustes')
}

export async function getTasaVigente() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('configuracion_interes')
    .select('tasa_porcentaje')
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .single()
    
  return data?.tasa_porcentaje ?? 0
}