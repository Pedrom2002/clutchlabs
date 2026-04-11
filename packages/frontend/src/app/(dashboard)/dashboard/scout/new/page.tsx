'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import * as scoutApi from '@/lib/api/scout'
import { ACTIVE_DUTY_MAPS, mapName, QUERY_KEYS } from '@/lib/constants'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

export default function NewScoutReportPage() {
  const router = useRouter()
  const t = useTranslations('scout')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()

  const [opponent, setOpponent] = useState('')
  const [maps, setMaps] = useState<string[]>([])
  const [matchesCount, setMatchesCount] = useState(10)

  const { data: opponents } = useQuery({
    queryKey: ['scout', 'opponents'],
    queryFn: () => scoutApi.opponents(),
  })

  const create = useMutation({
    mutationFn: scoutApi.create,
    onSuccess: (report) => {
      toast.success('Scout report criado')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.scoutReports })
      router.push(`/dashboard/scout/${report.id}`)
    },
    onError: (err) => {
      toast.error('Erro ao criar relatório', {
        description: err instanceof Error ? err.message : undefined,
      })
    },
  })

  function toggleMap(map: string) {
    setMaps((prev) =>
      prev.includes(map) ? prev.filter((m) => m !== map) : [...prev, map]
    )
  }

  function handleSubmit() {
    if (!opponent || maps.length === 0) {
      toast.error('Selecione um adversário e pelo menos um mapa')
      return
    }
    create.mutate({
      opponent_id: opponent,
      maps,
      matches_to_analyze: matchesCount,
    })
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        {tCommon('back')}
      </Button>

      <PageHeader title={t('generateReport')} description={t('subtitle')} />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t('selectOpponent')}</Label>
            <Select value={opponent} onValueChange={setOpponent}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {opponents?.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('selectMaps')}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACTIVE_DUTY_MAPS.map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-secondary"
                >
                  <Checkbox
                    checked={maps.includes(m)}
                    onCheckedChange={() => toggleMap(m)}
                  />
                  <span>{mapName(m)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matches">{t('matchesToAnalyze')}</Label>
            <Input
              id="matches"
              type="number"
              min={3}
              max={50}
              value={matchesCount}
              onChange={(e) => setMatchesCount(Number(e.target.value))}
              className="max-w-[120px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => router.back()}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('generateReport')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
