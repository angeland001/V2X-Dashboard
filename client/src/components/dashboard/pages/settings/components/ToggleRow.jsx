import { ToggleButton } from '@/components/ui/ToggleButton'

export function ToggleRow({ label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-neutral-200">{label}</p>
        {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
      </div>
      <ToggleButton checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
