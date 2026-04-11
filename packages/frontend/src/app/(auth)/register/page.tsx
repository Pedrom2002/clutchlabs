'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const router = useRouter()
  const register = useAuthStore((s) => s.register)
  const t = useTranslations('auth')
  const [form, setForm] = useState({
    org_name: '',
    display_name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form)
      toast.success(t('registerSuccess'))
      router.push('/dashboard/onboarding')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('registerError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold">{t('registerCta')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="org_name">{t('orgName')}</Label>
          <Input
            id="org_name"
            value={form.org_name}
            onChange={(e) => update('org_name', e.target.value)}
            required
            placeholder={t('orgNamePlaceholder')}
            autoComplete="organization"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="display_name">{t('displayName')}</Label>
          <Input
            id="display_name"
            value={form.display_name}
            onChange={(e) => update('display_name', e.target.value)}
            required
            placeholder={t('namePlaceholder')}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
            minLength={8}
            placeholder={t('passwordPlaceholder')}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('signUp')}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t('termsAgreement')}</p>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link href="/login" className="text-primary hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </>
  )
}
