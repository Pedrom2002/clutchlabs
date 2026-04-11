'use client'

import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WeaknessProfile } from '@/types/training'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  profile: WeaknessProfile | null | undefined
  loading?: boolean
}

export function WeaknessProfileCard({ profile, loading }: Props) {
  const t = useTranslations('player')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-warning" />
          {t('weaknessProfile')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <Skeleton className="h-24 w-full" />}
        {!loading && profile && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="critical">{t('primary')}</Badge>
                  <span className="text-sm font-semibold">{profile.primary.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{profile.primary.description}</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.round(profile.primary.confidence * 100)}%
              </span>
            </div>
            {profile.secondary && (
              <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="major">{t('secondary')}</Badge>
                    <span className="text-sm font-semibold">{profile.secondary.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{profile.secondary.description}</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {Math.round(profile.secondary.confidence * 100)}%
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
