'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { setNuevaTasa, getTasaVigente } from '@/lib/actions'
import { toast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils-clientes'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AjustesPage() {
  const [tasa, setTasa] = useState('')
  const [isPending, startTransition] = useTransition()
  
  // Aquí deberías tener una función que traiga el historial real de la DB
  // (podrías agregar una función getHistorialTasas en lib/actions.ts)
  const [historial, setHistorial] = useState<any[]>([]) 

  useEffect(() => {
    async function load() {
      const actual = await getTasaVigente()
      setTasa(String(actual))
    }
    load()
  }, [])

  function handleGuardar() {
    startTransition(async () => {
      try {
        await setNuevaTasa(Number(tasa))
        toast({ title: "Tasa actualizada", description: `Nueva tasa configurada: ${tasa}%` })
      } catch (error) {
        toast({ title: "Error", description: "No se pudo actualizar la tasa", variant: "destructive" })
      }
    })
  }

  return (
    <main className="max-w-lg mx-auto p-4 pb-28 space-y-6">
      <Button variant="ghost" size="icon" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <h1 className="text-2xl font-bold">Ajustes</h1>
      
      {/* Configuración de Tasa */}
      <Card>
        <CardHeader>
          <CardTitle>Interés por defecto</CardTitle>
          <CardDescription>Define el porcentaje que se aplicará en futuros préstamos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tasa">Tasa de interés (%)</Label>
            <Input 
              id="tasa"
              type="number" 
              step="0.01" 
              value={tasa} 
              onChange={(e) => setTasa(e.target.value)}
              className="h-12 text-lg"
            />
          </div>
          <Button className="w-full h-12" onClick={handleGuardar} disabled={isPending}>
            {isPending ? <Spinner className="mr-2" /> : 'Guardar nueva tasa'}
          </Button>
        </CardContent>
      </Card>

      {/* Historial de Tasas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de cambios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Tasa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                    Sin historial disponible
                  </TableCell>
                </TableRow>
              ) : (
                historial.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDate(h.fecha_inicio)}</TableCell>
                    <TableCell className="text-right font-medium">{h.tasa_porcentaje}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}