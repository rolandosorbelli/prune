import { Bell, Inbox, Mail, MessageSquare, Tag, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import type { Provider, SubscriptionCategory, SubscriptionStatus } from '@/lib/types'

type CategoryMeta = {
  label: string
  icon: ComponentType<{ className?: string }>
  badge: string
  dot: string
}

export const CATEGORY_META: Record<SubscriptionCategory, CategoryMeta> = {
  promotions: {
    label: 'Promotions',
    icon: Tag,
    badge:
      'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  social: {
    label: 'Social',
    icon: Users,
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  updates: {
    label: 'Updates',
    icon: Bell,
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-400',
    dot: 'bg-cyan-500',
  },
  forums: {
    label: 'Forums',
    icon: MessageSquare,
    badge:
      'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  other: {
    label: 'Other',
    icon: Mail,
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
}

type StatusMeta = {
  label: string
  dot: string
}

export const STATUS_META: Record<SubscriptionStatus, StatusMeta> = {
  active: { label: 'Active', dot: 'bg-primary' },
  unsubscribed: { label: 'Unsubscribed', dot: 'bg-emerald-500' },
  ignored: { label: 'Ignored', dot: 'bg-gray-400' },
}

type ProviderMeta = {
  label: string
  icon: ComponentType<{ className?: string }>
  badge: string
  dot: string
}

// Generic icons + brand-adjacent colors, deliberately not the actual
// Google/Microsoft logos (avoids trademark/brand-guideline questions for
// a small app) while still being visually distinct at a glance.
export const PROVIDER_META: Record<Provider, ProviderMeta> = {
  gmail: {
    label: 'Gmail',
    icon: Mail,
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    dot: 'bg-red-500',
  },
  outlook: {
    label: 'Outlook',
    icon: Inbox,
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
}
