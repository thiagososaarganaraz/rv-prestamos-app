'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ClienteFormData, PrestamoFormData, DniSide } from '@/lib/types'
import { validateInterestRate } from '@/lib/interest'
import { DNI_SIDES, normalizeClientData } from '@/lib/client-profile'
import { prepareDniImage } from '@/lib/dni-image'

const DNI_BUCKET = 'clientes-dni'

async function ownedClient(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: cliente, error } = await supabase.from('clientes').select('*').eq('id', id).eq('user_id', user.id).single()
  if (error || !cliente) throw new Error('Cliente no encontrado o sin autorización.')
  return { supabase, user, cliente }
}

function refreshClient(id: string) {
  revalidatePath('/dashboard', 'page')
  revalidatePath(`/clientes/${id}`, 'page')
}

function checkDniSide(side: DniSide) {
  if (!DNI_SIDES.includes(side)) throw new Error('Cara del DNI no válida.')
}

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
  const values = normalizeClientData(formData)
  if (!values.nombre) throw new Error('El nombre del cliente es obligatorio.')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...values, user_id: user.id })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
  return data.id as string
}

export async function actualizarCliente(id: string, formData: Partial<ClienteFormData>) {
  const values = normalizeClientData(formData)
  const { supabase, user } = await ownedClient(id)

  const { error } = await supabase
    .from('clientes')
    .update(values)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
  revalidatePath(`/clientes/${id}`, 'page')
}

export async function eliminarCliente(id: string) {
  const { supabase, user } = await ownedClient(id)
  // Listar antes de borrar: incluye archivos pendientes de limpieza de reemplazos.
  const prefix = `${user.id}/${id}`
  const paths: string[] = []
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(DNI_BUCKET).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error('No se pudieron consultar las fotos. El cliente no fue eliminado; intentá nuevamente.')
    paths.push(...data.map((file) => `${prefix}/${file.name}`))
    if (data.length < 100) break
  }

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
  if (paths.length) {
    const { error: cleanupError } = await supabase.storage.from(DNI_BUCKET).remove(paths)
    if (cleanupError) return { warning: 'El cliente fue eliminado, pero no se pudieron borrar todas sus fotos. Revisar el almacenamiento privado en Supabase.' }
  }
  return { warning: null }
}

export async function guardarFotoDni(id: string, side: DniSide, form: FormData) {
  checkDniSide(side)
  const { supabase, user, cliente } = await ownedClient(id)
  const file = form.get('file')
  if (!(file instanceof File)) throw new Error('Seleccioná una foto del DNI.')
  const bytes = await prepareDniImage(file)
  const path = `${user.id}/${id}/${side}-${crypto.randomUUID()}.jpg`
  const { error: uploadError } = await supabase.storage.from(DNI_BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: false })
  if (uploadError) throw new Error('No se pudo subir la foto del DNI. Podés reintentar o quitar la selección para continuar sin ella.')
  // Comparación con la ruta anterior: no perder cambios de otra sesión.
  let update = supabase.from('clientes').update({ [side]: path }).eq('id', id).eq('user_id', user.id)
  update = cliente[side] ? update.eq(side, cliente[side]) : update.is(side, null)
  const { data, error } = await update.select('id').maybeSingle()
  if (error || !data) {
    const { error: cleanup } = await supabase.storage.from(DNI_BUCKET).remove([path])
    throw new Error(`No se pudo asociar la foto. Volvé a abrir la ficha para consultar los datos actuales.${cleanup ? ' Además, quedó una foto pendiente de limpieza en Supabase.' : ''}`)
  }
  refreshClient(id)
  let warning: string | null = null
  if (cliente[side]) {
    const { error: cleanup } = await supabase.storage.from(DNI_BUCKET).remove([cliente[side]])
    if (cleanup) warning = 'La foto se guardó, pero la versión anterior quedó pendiente de limpieza en Supabase.'
  }
  return { path, warning }
}

export async function quitarFotoDni(id: string, side: DniSide) {
  checkDniSide(side)
  const { supabase, user, cliente } = await ownedClient(id)
  if (!cliente[side]) return { warning: null }
  const { data, error } = await supabase.from('clientes').update({ [side]: null }).eq('id', id).eq('user_id', user.id).eq(side, cliente[side]).select('id').maybeSingle()
  if (error || !data) throw new Error('No se pudo quitar la foto. Volvé a abrir la ficha para consultar los datos actuales.')
  refreshClient(id)
  const { error: cleanup } = await supabase.storage.from(DNI_BUCKET).remove([cliente[side]])
  return { warning: cleanup ? 'La foto se quitó de la ficha, pero su archivo quedó pendiente de limpieza en Supabase.' : null }
}

export async function verFotoDni(id: string, side: DniSide) {
  checkDniSide(side)
  const { supabase, cliente } = await ownedClient(id)
  if (!cliente[side]) throw new Error('No hay foto guardada para esta cara del DNI.')
  const { data, error } = await supabase.storage.from(DNI_BUCKET).createSignedUrl(cliente[side], 300)
  if (error) throw new Error('No se pudo abrir la foto. Intentá nuevamente.')
  return data.signedUrl
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
  validateInterestRate(formData.tasa_interes)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  await ownedClient(formData.cliente_id)

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
  if ('tasa_interes' in formData) validateInterestRate(formData.tasa_interes)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  if (formData.cliente_id) await ownedClient(formData.cliente_id)

  const { data: existing, error: readError } = await supabase
    .from('prestamos')
    .select('cliente_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (readError) throw new Error(readError.message)

  const { error } = await supabase
    .from('prestamos')
    .update(formData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'page')
  revalidatePath(`/clientes/${existing.cliente_id}`, 'page')
  if (formData.cliente_id && formData.cliente_id !== existing.cliente_id) {
    revalidatePath(`/clientes/${formData.cliente_id}`, 'page')
  }
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
    .eq('user_id', user.id)
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
  validateInterestRate(tasa)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const { error } = await supabase.from('configuracion_interes').insert({
    tasa_porcentaje: tasa,
    user_id: user.id
  })
  if (error) throw new Error(error.message)
  revalidatePath('/ajustes')
}

export async function getTasaVigente() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase
    .from('configuracion_interes')
    .select('tasa_porcentaje')
    .eq('user_id', user.id)
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()
    
  if (error) throw new Error(error.message)
  const rate = data?.tasa_porcentaje ?? 0
  validateInterestRate(rate)
  return rate
}
