'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Point = { x: number; y: number }
type View = Point & { scale: number }
const INITIAL_VIEW: View = { x: 0, y: 0, scale: 1 }

function ViewerCanvas({ src, alt }: { src: string; alt: string }) {
  const viewport = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const pointers = useRef(new Map<number, Point>())
  const current = useRef<View>(INITIAL_VIEW)
  const fitted = useRef({ width: 0, height: 0 })
  const [view, setView] = useState(INITIAL_VIEW)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  function update(next: View) {
    const element = viewport.current
    if (!element) return
    const scale = Math.max(1, Math.min(5, next.scale))
    const maxX = Math.max(0, (fitted.current.width * scale - element.clientWidth) / 2)
    const maxY = Math.max(0, (fitted.current.height * scale - element.clientHeight) / 2)
    current.current = { scale, x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) }
    setView(current.current)
  }

  function fit() {
    const element = viewport.current
    const photo = image.current
    if (!element || !photo?.naturalWidth) return
    const ratio = Math.min(element.clientWidth / photo.naturalWidth, element.clientHeight / photo.naturalHeight)
    fitted.current = { width: photo.naturalWidth * ratio, height: photo.naturalHeight * ratio }
    setSize(fitted.current)
    pointers.current.clear()
    update(INITIAL_VIEW)
  }

  function zoom(scale: number, anchor: Point = { x: 0, y: 0 }) {
    const previous = current.current
    const ratio = Math.max(1, Math.min(5, scale)) / previous.scale
    update({ scale, x: anchor.x - (anchor.x - previous.x) * ratio, y: anchor.y - (anchor.y - previous.y) * ratio })
  }

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    function wheel(event: WheelEvent) {
      event.preventDefault()
      if (!image.current?.naturalWidth) return
      const rect = element!.getBoundingClientRect()
      zoom(current.current.scale * Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.005), {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      })
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => {
      observer.disconnect()
      element.removeEventListener('wheel', wheel)
      pointers.current.clear()
    }
  }, [])

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    const before = Array.from(pointers.current.values())
    const next = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, next)
    const after = Array.from(pointers.current.values())
    if (before.length === 2) {
      const midpoint = (points: Point[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 })
      const distance = (points: Point[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const oldCenter = midpoint(before)
      const newCenter = midpoint(after)
      const rect = event.currentTarget.getBoundingClientRect()
      const oldView = current.current
      const scale = Math.max(1, Math.min(5, oldView.scale * distance(after) / Math.max(1, distance(before))))
      const ratio = scale / oldView.scale
      const anchor = { x: oldCenter.x - rect.left - rect.width / 2, y: oldCenter.y - rect.top - rect.height / 2 }
      update({ scale, x: anchor.x - (anchor.x - oldView.x) * ratio + newCenter.x - oldCenter.x, y: anchor.y - (anchor.y - oldView.y) * ratio + newCenter.y - oldCenter.y })
    } else {
      update({ ...current.current, x: current.current.x + next.x - previous.x, y: current.current.y + next.y - previous.y })
    }
  }

  return <>
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <DialogTitle className="text-base text-white">{alt}</DialogTitle>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="cursor-pointer" disabled={!loaded || error || view.scale <= 1} aria-label="Alejar imagen" onClick={() => zoom(current.current.scale - 0.5)}>−</Button>
        <span className="min-w-12 text-center text-sm tabular-nums" aria-live="polite">{Math.round(view.scale * 100)}%</span>
        <Button type="button" variant="secondary" className="cursor-pointer" disabled={!loaded || error || view.scale >= 5} aria-label="Acercar imagen" onClick={() => zoom(current.current.scale + 0.5)}>+</Button>
        <Button type="button" variant="secondary" className="cursor-pointer" disabled={!loaded || error} onClick={() => update(INITIAL_VIEW)}>Restablecer</Button>
        <DialogClose asChild><Button type="button" variant="secondary" className="cursor-pointer">Cerrar</Button></DialogClose>
      </div>
    </div>
    <DialogDescription className="sr-only">Usá los botones, la rueda del mouse o dos dedos para ampliar. Arrastrá para recorrer la imagen. Escape cierra el visor.</DialogDescription>
    <div ref={viewport} className={cn('relative min-h-0 flex-1 overflow-hidden touch-none select-none', view.scale > 1 && 'cursor-grab active:cursor-grabbing')}
      onPointerDown={(event) => {
        if (!loaded || error || event.button !== 0 || pointers.current.size >= 2) return
        event.currentTarget.setPointerCapture(event.pointerId)
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      }}
      onPointerMove={pointerMove}
      onPointerUp={(event) => pointers.current.delete(event.pointerId)}
      onPointerCancel={(event) => pointers.current.delete(event.pointerId)}
      onLostPointerCapture={(event) => pointers.current.delete(event.pointerId)}>
      {!loaded && !error && <p role="status" className="absolute inset-0 flex items-center justify-center">Cargando imagen…</p>}
      {error ? <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center">No se pudo cargar la imagen. Cerrá el visor e intentá abrir la foto nuevamente.</p> :
        <img ref={image} src={src} alt={alt} draggable={false}
          onLoad={() => { setLoaded(true); fit() }} onError={() => setError(true)}
          className="pointer-events-none absolute top-1/2 left-1/2 max-w-none object-contain"
          style={{ width: size.width, height: size.height, visibility: loaded ? 'visible' : 'hidden', transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />}
    </div>
  </>
}

export function DniImageViewer({ src, alt, className, onError }: { src: string; alt: string; className?: string; onError?: () => void }) {
  return <Dialog>
    <DialogTrigger asChild>
      <button type="button" aria-label={`Ampliar ${alt}`} className="block max-w-full cursor-zoom-in rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <img src={src} alt={alt} className={className} onError={onError} />
      </button>
    </DialogTrigger>
    <DialogContent showCloseButton={false} className="fixed inset-0 z-[60] flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-black p-0 text-white sm:max-w-none data-[state=open]:animate-none data-[state=closed]:animate-none">
      <ViewerCanvas key={src} src={src} alt={alt} />
    </DialogContent>
  </Dialog>
}
