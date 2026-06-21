'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, EyeOff, ArrowUpRight, Wallet, ArrowDownCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils-clientes'

interface WalletOverviewProps {
  capitalColocado: number
  gananciaProyectada: number
  proximosCobrosSemana: number
}

export function WalletOverview({ 
  capitalColocado, 
  gananciaProyectada, 
  proximosCobrosSemana 
}: WalletOverviewProps) {
  const [showBalance, setShowBalance] = useState(true)

  return (
    <Card className="w-full bg-gradient-to-br from-card to-secondary/20 border-border overflow-hidden shadow-md">
      <CardContent className="p-6 space-y-6">
        
        {/* Fila Superior: Título y Ocultar Saldo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Wallet className="h-4 w-4" />
            <span>Mi Cartera Activa</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setShowBalance(!showBalance)}
          >
            {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        {/* Balance Principal */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Capital Invertido
          </p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-bold tracking-tight text-foreground transition-all">
              {showBalance ? formatCurrency(capitalColocado) : '•••••••'}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="h-3 w-3" />
              +{showBalance ? formatCurrency(gananciaProyectada) : '•••'}
            </span>
          </div>
        </div>

        {/* Métricas Secundarias Estilo Fintech */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/60">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
              <ArrowDownCircle className="h-3 w-3 text-primary" />
              Retornos a 7d
            </span>
            <p className="text-base font-bold text-foreground">
              {showBalance ? formatCurrency(proximosCobrosSemana) : '••••••'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
              Rendimiento Cartera
            </span>
            <p className="text-base font-bold text-emerald-500">
              {capitalColocado > 0 
                ? `${((gananciaProyectada / capitalColocado) * 100).toFixed(1)}%` 
                : '0%'
              }
            </p>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}