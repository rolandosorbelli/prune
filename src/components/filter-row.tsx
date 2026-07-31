import type { ComponentType } from 'react'

export function FilterRow({
  label,
  count,
  active,
  onClick,
  dot,
  icon: Icon,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  dot: string
  icon?: ComponentType<{ className?: string }>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-foreground hover:bg-accent'
      }`}
    >
      {Icon ? (
        <Icon className="size-4 shrink-0" />
      ) : (
        <span className={`size-2 shrink-0 rounded-full ${dot}`} />
      )}
      <span className="truncate">{label}</span>
      <span className="text-muted-foreground ml-auto text-xs tabular-nums">
        {count}
      </span>
    </button>
  )
}
