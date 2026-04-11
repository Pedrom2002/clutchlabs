'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle, Crosshair, FileUp, Rocket, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')

  const STEPS = [
    {
      icon: Crosshair,
      titleKey: 'welcome',
      descKey: 'welcomeDesc',
    },
    { icon: Users, titleKey: 'step1Title', descKey: 'step1Desc' },
    { icon: Users, titleKey: 'step2Title', descKey: 'step2Desc' },
    { icon: FileUp, titleKey: 'step3Title', descKey: 'step3Desc' },
    { icon: Sparkles, titleKey: 'step4Title', descKey: 'step4Desc' },
    { icon: Rocket, titleKey: 'step5Title', descKey: 'step5Desc' },
  ] as const

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('onboarding_completed', 'true')
      router.push('/dashboard/demos')
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-all',
                i === step
                  ? 'w-8 bg-primary'
                  : i < step
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-border'
              )}
              aria-current={i === step ? 'step' : undefined}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        <Card>
          <CardContent className="space-y-6 p-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              {isLast ? (
                <CheckCircle className="h-8 w-8 text-success" />
              ) : (
                <Icon className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{t(current.titleKey)}</h1>
              <p className="text-muted-foreground">{t(current.descKey)}</p>
            </div>
            <div className="flex justify-center gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                  {tCommon('back')}
                </Button>
              )}
              <Button onClick={handleNext}>
                {isLast ? t('finish') : t('next')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {!isLast && (
          <button
            onClick={() => {
              localStorage.setItem('onboarding_completed', 'true')
              router.push('/dashboard')
            }}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('skip')}
          </button>
        )}
      </div>
    </div>
  )
}
