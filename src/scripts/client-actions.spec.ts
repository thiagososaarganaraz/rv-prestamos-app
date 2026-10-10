import { before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import sharp from 'sharp'

// Ejecutar las acciones reales, reemplazando únicamente Next y el transporte
// Supabase. No requiere credenciales ni modifica una base de datos.
const serverStub = 'data:text/javascript,export async function createClient(){return globalThis.__clientActionsSupabase}'
const cacheStub = 'data:text/javascript,export function revalidatePath(){}'
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/supabase/server') return { url: serverStub, shortCircuit: true }
    if (specifier === 'next/cache') return { url: cacheStub, shortCircuit: true }
    if (specifier.startsWith('@/')) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context)
    return nextResolve(specifier, context)
  },
})
let actions: typeof import('../lib/actions.ts')
before(async () => { actions = await import('../lib/actions.ts') })

type Row = Record<string, unknown>
type DbResult = { data: Row | null; error: { message: string } | null }
const oldPath = 'owner/client/dni_frente-old.jpg'
let userId: string | null
let row: Row | null
let failUpload: boolean
let failUpdate: boolean
let failRemove: boolean
let conflict: boolean
let calls: string[]
let stored: Set<string>

class Query {
  private filters: [string, unknown][] = []
  private patch: Row | null = null
  private deletion = false
  select() { return this }
  eq(key: string, value: unknown) { this.filters.push([key, value]); return this }
  is(key: string, value: unknown) { return this.eq(key, value) }
  update(patch: Row) { this.patch = patch; return this }
  delete() { this.deletion = true; return this }
  single() { return Promise.resolve(this.execute()) }
  maybeSingle() { return Promise.resolve(this.execute()) }
  then(resolve: (value: DbResult) => unknown, reject?: (reason: unknown) => unknown) { return Promise.resolve(this.execute()).then(resolve, reject) }
  private execute(): DbResult {
    if (!row || !this.filters.every(([key, value]) => row?.[key] === value)) return { data: null, error: null }
    if (this.patch) {
      calls.push('db.update')
      if (failUpdate) return { data: null, error: { message: 'DB no disponible' } }
      if (conflict) return { data: null, error: null }
      row = { ...row, ...this.patch }
    }
    const data = { ...row }
    if (this.deletion) { calls.push('db.delete'); row = null }
    return { data, error: null }
  }
}

beforeEach(() => {
  userId = 'owner'
  row = { id: 'client', user_id: 'owner', nombre: 'Cliente', telefono: null, dni_frente: oldPath, dni_dorso: null }
  failUpload = failUpdate = failRemove = conflict = false
  calls = []
  stored = new Set([oldPath])
  const harness = globalThis as typeof globalThis & { __clientActionsSupabase?: unknown }
  harness.__clientActionsSupabase = {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from: () => new Query(),
    storage: { from: (bucket: string) => {
      assert.equal(bucket, 'clientes-dni')
      return {
        upload: async (path: string, bytes: Buffer, options: { upsert: boolean; contentType: string }) => {
          calls.push('storage.upload')
          assert.ok(path.startsWith(`${userId}/client/dni_frente-`))
          assert.equal(options.upsert, false)
          assert.equal(options.contentType, 'image/jpeg')
          assert.ok(bytes.length > 0)
          if (failUpload) return { error: { message: 'Carga fallida' } }
          stored.add(path)
          return { error: null }
        },
        remove: async (paths: string[]) => {
          calls.push('storage.remove')
          for (const path of paths) assert.ok(path.startsWith(`${userId}/`))
          if (failRemove) return { error: { message: 'Limpieza fallida' } }
          paths.forEach((path) => stored.delete(path))
          return { error: null }
        },
        createSignedUrl: async (path: string, seconds: number) => {
          calls.push('storage.sign')
          assert.equal(seconds, 300)
          assert.equal(path, oldPath)
          return { data: { signedUrl: 'https://example.test/temporary' }, error: null }
        },
        list: async (prefix: string) => ({ data: [...stored].filter((p) => p.startsWith(`${prefix}/`)).map((p) => ({ name: p.slice(prefix.length + 1) })), error: null }),
      }
    } },
  }
})

async function photoForm() {
  const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'white' } }).jpeg().toBuffer()
  const form = new FormData()
  form.set('file', new File([new Uint8Array(bytes)], 'dni.jpg', { type: 'image/jpeg' }))
  return form
}

test('no permite leer o modificar DNI ni datos sin sesión o desde otra cuenta', async () => {
  for (const identity of [null, 'other-owner']) {
    userId = identity
    await assert.rejects(() => actions.verFotoDni('client', 'dni_frente'))
    await assert.rejects(() => actions.quitarFotoDni('client', 'dni_frente'))
    await assert.rejects(() => actions.actualizarCliente('client', { telefono: '123' }))
    await assert.rejects(async () => actions.guardarFotoDni('client', 'dni_frente', await photoForm()))
    await assert.rejects(() => actions.eliminarCliente('client'))
  }
  assert.deepEqual(calls, [])
  assert.equal(row?.dni_frente, oldPath)
})

test('una carga fallida conserva la foto anterior y no modifica la base', async () => {
  failUpload = true
  await assert.rejects(async () => actions.guardarFotoDni('client', 'dni_frente', await photoForm()))
  assert.equal(row?.dni_frente, oldPath)
  assert.deepEqual(calls, ['storage.upload'])
  assert.deepEqual([...stored], [oldPath])
})

test('una escritura fallida o concurrente limpia solo la foto nueva', async () => {
  for (const mode of ['error', 'conflict']) {
    failUpdate = mode === 'error'
    conflict = mode === 'conflict'
    await assert.rejects(async () => actions.guardarFotoDni('client', 'dni_frente', await photoForm()))
    assert.equal(row?.dni_frente, oldPath)
    assert.deepEqual([...stored], [oldPath])
  }
})

test('reemplazo exitoso guarda primero la ruta nueva y luego limpia la anterior', async () => {
  const result = await actions.guardarFotoDni('client', 'dni_frente', await photoForm())
  assert.equal(result.warning, null)
  assert.equal(row?.dni_frente, result.path)
  assert.deepEqual(calls, ['storage.upload', 'db.update', 'storage.remove'])
  assert.deepEqual([...stored], [result.path])
})

test('un fallo de limpieza devuelve ruta guardada y advertencia, sin fingir fallo de carga', async () => {
  failRemove = true
  const result = await actions.guardarFotoDni('client', 'dni_frente', await photoForm())
  assert.ok(result.warning)
  assert.equal(row?.dni_frente, result.path)
  assert.equal(stored.size, 2)
})

test('quitar foto actualiza la ficha y reporta limpieza fallida; reintentar es seguro', async () => {
  failRemove = true
  assert.ok((await actions.quitarFotoDni('client', 'dni_frente')).warning)
  assert.equal(row?.dni_frente, null)
  assert.deepEqual(await actions.quitarFotoDni('client', 'dni_frente'), { warning: null })
})

test('enlace temporal se emite solo para una cara válida y guardada', async () => {
  assert.equal(await actions.verFotoDni('client', 'dni_frente'), 'https://example.test/temporary')
  await assert.rejects(() => actions.verFotoDni('client', 'dni_dorso'))
  await assert.rejects(() => actions.verFotoDni('client', 'user_id' as never))
  assert.deepEqual(calls, ['storage.sign'])
})

test('eliminar cliente limpia sus fotos y reporta una limpieza pendiente', async () => {
  failRemove = true
  const result = await actions.eliminarCliente('client')
  assert.ok(result.warning)
  assert.equal(row, null)
  assert.deepEqual(calls, ['db.delete', 'storage.remove'])
})
