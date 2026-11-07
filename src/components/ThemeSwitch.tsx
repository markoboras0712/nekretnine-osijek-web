'use client'

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

const OPCIJE = [
  { value: 'light', label: 'Svijetla tema', icon: SunIcon },
  { value: 'dark', label: 'Tamna tema', icon: MoonIcon },
  { value: 'system', label: 'Kao sustav', icon: MonitorIcon },
] as const

const nista = () => () => {}

/** Light, dark or follow the system. The theme is only known in the browser. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const ucitano = useSyncExternalStore(
    nista,
    () => true,
    () => false,
  )
  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn('inline-flex rounded-lg border bg-background p-0.5', className)}
    >
      {OPCIJE.map(({ value, label, icon: Icon }) => {
        const aktivna = ucitano && theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={aktivna}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:size-9',
              aktivna && 'bg-muted text-foreground',
            )}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
