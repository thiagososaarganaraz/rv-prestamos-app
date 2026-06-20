export type EstadoPrestamo = 'pendiente' | 'pagado'
export type MetodoPago = 'efectivo' | 'transferencia'

export interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  notas: string | null
  user_id: string
  created_at: string
}

export interface Prestamo {
  id: string
  cliente_id: string
  monto: number
  fecha_prestamo: string
  fecha_vencimiento: string
  estado: EstadoPrestamo
  metodo_pago: MetodoPago | null
  fecha_pago: string | null
  notas: string | null
  user_id: string
  created_at: string
  clientes?: Pick<Cliente, 'id' | 'nombre' | 'telefono'>
}

export interface ClienteConPrestamos extends Cliente {
  prestamos: Prestamo[]
}

export type PrestamoFormData = {
  cliente_id: string
  monto: number
  fecha_prestamo: string
  fecha_vencimiento: string
  metodo_pago: MetodoPago | null
  notas: string | null
}

export type ClienteFormData = {
  nombre: string
  telefono: string | null
  notas: string | null
}

export type FiltroEstado = 'todos' | 'proximos' | 'vencidos' | 'pagados'
