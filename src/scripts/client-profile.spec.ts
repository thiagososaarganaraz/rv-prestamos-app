import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { DNI_MAX_BYTES, missingClientData, normalizeClientData, validateDniFile } from '../lib/client-profile.ts'
import { prepareDniImage } from '../lib/dni-image.ts'

test('clientes anteriores y datos vacíos muestran todos los faltantes', () => {
  assert.equal(missingClientData({}).length, 5)
  assert.equal(missingClientData({ telefono: '  ', ocupacion: '', redes_sociales: [{ red: ' ', usuario: ' ' }] }).length, 5)
})

test('cada cara del DNI es independiente y una red completa basta', () => {
  const data = { telefono: '+54 9 11 1234 5678', ocupacion: 'Comerciante', redes_sociales: [{ red: 'Instagram', usuario: '@cliente' }], dni_frente: 'frente.jpg' }
  assert.deepEqual(missingClientData(data), ['Foto del dorso del DNI'])
  assert.deepEqual(missingClientData({ ...data, dni_dorso: 'dorso.jpg' }), [])
  assert.deepEqual(missingClientData({ ...data, redes_sociales: [{ red: 'Instagram', usuario: '' }] }), ['Redes sociales', 'Foto del dorso del DNI'])
})

test('normaliza texto y redes, permite borrar opcionales sin alterar campos omitidos', () => {
  assert.deepEqual(normalizeClientData({ telefono: '   ', ocupacion: ' Comerciante ', redes_sociales: [{ red: ' ', usuario: '' }, { red: ' Facebook ', usuario: ' https://example.com/cliente ' }] }), {
    telefono: null, ocupacion: 'Comerciante', redes_sociales: [{ red: 'Facebook', usuario: 'https://example.com/cliente' }],
  })
  assert.deepEqual(normalizeClientData({ telefono: null, redes_sociales: [] }), { telefono: null, redes_sociales: [] })
  assert.deepEqual(normalizeClientData({}), {})
  assert.throws(() => normalizeClientData({ nombre: ' ' }))
  assert.throws(() => normalizeClientData({ redes_sociales: [{ red: 'Instagram', usuario: '' }] }))
  assert.throws(() => normalizeClientData({ redes_sociales: [{ red: '', usuario: '@cliente' }] }))
})

test('rechaza entradas malformadas y descarta identificadores o rutas inyectados', () => {
  assert.throws(() => normalizeClientData({ telefono: 123 } as never))
  assert.throws(() => normalizeClientData({ redes_sociales: 'texto' } as never))
  assert.throws(() => normalizeClientData({ redes_sociales: [null] } as never))
  assert.deepEqual(normalizeClientData({ telefono: '123', user_id: 'otra-cuenta', dni_frente: 'ruta-ajena', id: 'otro-cliente' } as never), { telefono: '123' })
})

test('valida tipos y límites de archivo antes de subir', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.doesNotThrow(() => validateDniFile({ type, size: DNI_MAX_BYTES }))
  }
  for (const size of [0, -1, DNI_MAX_BYTES + 1]) assert.throws(() => validateDniFile({ type: 'image/jpeg', size }))
  for (const type of ['image/svg+xml', 'image/gif', 'application/pdf', '']) assert.throws(() => validateDniFile({ type, size: 100 }))
})

test('rechaza un archivo renombrado, MIME falso, contenido truncado e imagen animada', async () => {
  await assert.rejects(() => prepareDniImage(new File(['no es una imagen'], 'dni.jpg', { type: 'image/jpeg' })))
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'white' } }).png().toBuffer()
  await assert.rejects(() => prepareDniImage(new File([new Uint8Array(png)], 'dni.jpg', { type: 'image/jpeg' })))
  await assert.rejects(() => prepareDniImage(new File([new Uint8Array(png.subarray(0, 45))], 'dni.png', { type: 'image/png' })))
  // Dos frames verticales en una imagen WebP animada.
  const pixels = Buffer.alloc(10 * 20 * 3)
  pixels.fill(255, 10 * 10 * 3)
  const animated = await sharp(pixels, { raw: { width: 10, height: 20, channels: 3, pageHeight: 10 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer()
  assert.equal((await sharp(animated).metadata()).pages, 2)
  await assert.rejects(() => prepareDniImage(new File([new Uint8Array(animated)], 'dni.webp', { type: 'image/webp' })))
})

test('decodifica JPEG, PNG y WebP y elimina metadatos al producir un JPEG', async () => {
  for (const format of ['jpeg', 'png', 'webp'] as const) {
    const source = await sharp({ create: { width: 20, height: 10, channels: 3, background: 'white' } }).withMetadata().toFormat(format).toBuffer()
    const prepared = await prepareDniImage(new File([new Uint8Array(source)], `dni.${format}`, { type: `image/${format}` }))
    const metadata = await sharp(prepared).metadata()
    assert.equal(metadata.format, 'jpeg')
    assert.equal(metadata.width, 20)
    assert.equal(metadata.height, 10)
    assert.equal(metadata.exif, undefined)
  }
})
