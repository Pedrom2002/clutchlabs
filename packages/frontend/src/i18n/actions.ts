'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { type Locale, isLocale } from './config'

export async function setLocaleAction(locale: Locale) {
  if (!isLocale(locale)) return
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}
