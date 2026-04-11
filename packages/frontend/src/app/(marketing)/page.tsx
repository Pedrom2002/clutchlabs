import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  Map,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from 'lucide-react'
import { EmailCaptureForm } from '@/components/marketing/email-capture-form'
import { tiers } from '@/lib/pricing-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const FAQS = [
  {
    q: 'Que ficheiros são suportados?',
    qEn: 'Which files are supported?',
    a: 'Suportamos ficheiros .dem (CS2). Para CS:GO legacy, está em desenvolvimento.',
    aEn: 'We support .dem files (CS2). CS:GO legacy support is in development.',
  },
  {
    q: 'Quanto tempo demora a análise?',
    qEn: 'How long does analysis take?',
    a: 'Tipicamente 2-5 minutos por demo de 30 minutos, dependendo da carga.',
    aEn: 'Typically 2-5 minutes per 30-minute demo, depending on load.',
  },
  {
    q: 'Os meus dados ficam privados?',
    qEn: 'Are my files kept private?',
    a: 'Sim. As demos são acessíveis apenas pela tua organização e nunca são partilhadas.',
    aEn: 'Yes. Demos are only accessible to your organization and never shared.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    qEn: 'Can I cancel anytime?',
    a: 'Sim, a subscrição é mensal sem fidelização. Cancela com um clique.',
    aEn: 'Yes, monthly subscription with no commitment. Cancel with one click.',
  },
]

export default async function LandingPage() {
  const t = await getTranslations('marketing')
  const tCommon = await getTranslations('common')

  const features = [
    {
      icon: Brain,
      title: t('feature1Title'),
      description: t('feature1Desc'),
    },
    {
      icon: Map,
      title: t('feature2Title'),
      description: t('feature2Desc'),
    },
    {
      icon: TrendingUp,
      title: t('feature3Title'),
      description: t('feature3Desc'),
    },
    {
      icon: Target,
      title: t('feature4Title'),
      description: t('feature4Desc'),
    },
    {
      icon: BarChart3,
      title: 'Live match prediction',
      description: 'Real-time round win probability with explainable factors.',
    },
    {
      icon: Sparkles,
      title: 'SHAP explanations',
      description: 'Every detected error comes with a feature-importance waterfall.',
    },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(24_100%_50%/0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-24 text-center">
          <Badge variant="default" className="mb-8 inline-flex items-center gap-2 px-3 py-1">
            <Zap className="h-3.5 w-3.5" />
            {t('tagline')}
          </Badge>
          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            {t('heroTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            {t('heroSubtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="xl">
                <Link href="/register">{t('ctaStart')}</Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/pricing">{tCommon('view')} pricing</Link>
              </Button>
            </div>
            <EmailCaptureForm />
            <p className="text-xs text-muted-foreground">
              Free during beta. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-16 text-center text-3xl font-bold">
            {t('howItWorks')}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: '01', icon: Upload, titleKey: 'step1', descKey: 'step1Desc' },
              { step: '02', icon: Brain, titleKey: 'step2', descKey: 'step2Desc' },
              { step: '03', icon: BarChart3, titleKey: 'step3', descKey: 'step3Desc' },
            ].map((item) => (
              <Card key={item.step} className="hover:border-primary/40">
                <CardContent className="p-8">
                  <div className="mb-4 font-mono text-sm text-primary">{item.step}</div>
                  <item.icon className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 text-lg font-semibold">
                    {t(item.titleKey as 'step1' | 'step2' | 'step3')}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(item.descKey as 'step1Desc' | 'step2Desc' | 'step3Desc')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold">{t('featuresTitle')}</h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-muted-foreground">
            Built for serious teams. Every insight backed by ML models trained on thousands of pro matches.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:border-primary/40">
                <CardContent className="p-6">
                  <feature.icon className="mb-4 h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold">{t('pricingTitle')}</h2>
          <p className="mb-16 text-center text-muted-foreground">
            Start free, upgrade when you need more.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={tier.popular ? 'border-primary' : ''}
              >
                <CardHeader>
                  {tier.popular && (
                    <Badge variant="default" className="w-fit">
                      Most popular
                    </Badge>
                  )}
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <div>
                    <span className="font-mono text-3xl font-bold">€{tier.price}</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.demos}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="w-full"
                    variant={tier.popular ? 'default' : 'outline'}
                  >
                    <Link href="/register">Get started</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold">{t('faqTitle')}</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <h3 className="mb-2 flex items-start gap-2 text-base font-semibold">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{faq.q}</span>
                  </h3>
                  <p className="ml-6 text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Users className="mx-auto mb-6 h-12 w-12 text-primary" />
          <h2 className="mb-4 text-3xl font-bold">Ready to transform your game?</h2>
          <p className="mb-8 text-muted-foreground">
            Join the beta and experience explainable AI for CS2 analysis.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button asChild size="xl">
              <Link href="/register">{t('ctaStart')}</Link>
            </Button>
            <EmailCaptureForm />
          </div>
        </div>
      </section>
    </>
  )
}
