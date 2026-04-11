'use client'

import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

export function TeamSwitcher() {
  const [open, setOpen] = useState(false)
  const { organization } = useAuthStore()
  const t = useTranslations('settings')

  if (!organization) return null

  // Single-org for now; the popover allows future multi-org switching.
  const teams = [organization]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select team"
          className="w-[200px] justify-between"
        >
          <span className="truncate">{organization.name}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder={t('orgName')} />
          <CommandList>
            <CommandEmpty>—</CommandEmpty>
            <CommandGroup heading={t('tabOrg')}>
              {teams.map((team) => (
                <CommandItem
                  key={team.id}
                  onSelect={() => setOpen(false)}
                  className="text-sm"
                >
                  <span className="flex-1 truncate">{team.name}</span>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      team.id === organization.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem disabled>
                <Plus className="h-4 w-4" />
                <span className="text-muted-foreground">Create team</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
