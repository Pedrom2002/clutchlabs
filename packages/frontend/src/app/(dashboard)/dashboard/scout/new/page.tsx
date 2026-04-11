'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { scoutApi, type CreateScoutInput, ApiError } from '@/lib/api-client'

interface FormErrors {
  player_steam_id?: string
  rating?: string
}

/**
 * Minimal controlled form with inline validation. We intentionally avoid
 * pulling in react-hook-form + zod since they aren't in package.json —
 * this keeps the bundle small and the gate passing.
 */
function validate(input: CreateScoutInput, t: ReturnType<typeof useTranslations>): FormErrors {
  const errors: FormErrors = {}
  if (!input.player_steam_id || !/^\d{8,20}$/.test(input.player_steam_id)) {
    errors.player_steam_id = t('invalidSteamId')
  }
  if (Number.isNaN(input.rating) || input.rating < 0 || input.rating > 3) {
    errors.rating = t('invalidRating')
  }
  return errors
}

export default function NewScoutPage() {
  const t = useTranslations('scout')
  const tc = useTranslations('common')
  const router = useRouter()
  const qc = useQueryClient()

  const [form, setForm] = useState<CreateScoutInput>({
    player_steam_id: '',
    rating: 1.0,
    weaknesses: [''],
    strengths: [''],
    training_plan: [''],
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (input: CreateScoutInput) => scoutApi.create(input),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['scout'] })
      router.push(`/dashboard/scout/${created.id}`)
    },
    onError: (err) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to create report')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const cleaned: CreateScoutInput = {
      ...form,
      weaknesses: form.weaknesses.filter((s) => s.trim() !== ''),
      strengths: form.strengths.filter((s) => s.trim() !== ''),
      training_plan: form.training_plan.filter((s) => s.trim() !== ''),
    }
    const v = validate(cleaned, t)
    setErrors(v)
    if (Object.keys(v).length === 0) {
      mutation.mutate(cleaned)
    }
  }

  const updateList = (key: 'weaknesses' | 'strengths' | 'training_plan', idx: number, value: string) => {
    setForm((f) => {
      const next = [...f[key]]
      next[idx] = value
      return { ...f, [key]: next }
    })
  }
  const addItem = (key: 'weaknesses' | 'strengths' | 'training_plan') => {
    setForm((f) => ({ ...f, [key]: [...f[key], ''] }))
  }
  const removeItem = (key: 'weaknesses' | 'strengths' | 'training_plan', idx: number) => {
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }))
  }

  const renderList = (
    key: 'weaknesses' | 'strengths' | 'training_plan',
    label: string,
    itemLabel: string
  ) => (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">{label}</label>
      <div className="space-y-1.5">
        {form[key].map((item, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              value={item}
              onChange={(e) => updateList(key, i, e.target.value)}
              placeholder={itemLabel}
              className="flex-1 bg-bg-elevated border border-border rounded px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => removeItem(key, i)}
              className="p-1.5 rounded text-text-dim hover:text-red-400"
              aria-label="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addItem(key)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="h-3 w-3" /> {t('addItem')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-xl">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-text-muted hover:text-text text-sm mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc('back')}
      </button>

      <h1 className="text-xl font-bold mb-1">{t('createReport')}</h1>
      <p className="text-text-muted text-sm mb-6">{t('subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">
            {t('playerSteamId')}
          </label>
          <input
            value={form.player_steam_id}
            onChange={(e) => setForm({ ...form, player_steam_id: e.target.value })}
            placeholder="76561198000000000"
            className="w-full bg-bg-elevated border border-border rounded px-3 py-2 text-sm font-mono"
          />
          {errors.player_steam_id && (
            <p className="text-red-400 text-xs mt-1">{errors.player_steam_id}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">
            {t('formRating')}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="3"
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
            className="w-full bg-bg-elevated border border-border rounded px-3 py-2 text-sm"
          />
          {errors.rating && <p className="text-red-400 text-xs mt-1">{errors.rating}</p>}
        </div>

        {renderList('weaknesses', t('weaknesses'), t('formWeakness'))}
        {renderList('strengths', t('strengths'), t('formStrength'))}
        {renderList('training_plan', t('trainingPlan'), t('formTraining'))}

        {submitError && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/80 disabled:opacity-50"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('submit')}
        </button>
      </form>
    </div>
  )
}
