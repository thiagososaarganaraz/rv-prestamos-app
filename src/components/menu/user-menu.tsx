'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, MenuIcon, Percent, Settings, Sun, Moon, Monitor } from 'lucide-react'

export function UserMenu() {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline"><MenuIcon className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Configuración</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/ajustes')}>
            <Percent className="mr-2 h-4 w-4" />
            <span>Interés</span>
          </DropdownMenuItem>
          {/* Espacio para futuras configuraciones */}
          <DropdownMenuItem onClick={() => router.push('/ajustes')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Ajustes Generales</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Tema</p>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light" className="cursor-pointer">
              <Sun className="mr-2 h-4 w-4" />
              <span>Claro</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark" className="cursor-pointer">
              <Moon className="mr-2 h-4 w-4" />
              <span>Oscuro</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system" className="cursor-pointer">
              <Monitor className="mr-2 h-4 w-4" />
              <span>Sistema</span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}