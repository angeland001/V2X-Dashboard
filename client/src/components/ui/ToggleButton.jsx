import React from 'react'
import { cn } from '@/lib/utils'

/**
 * ToggleButton — matches the Primitive.button design from pencil.pen.
 *
 * The knob is always a black (#171717) dot that slides between positions.
 * ON  state: #fafafa pill, knob on the right
 * OFF state: #a3a3a3 pill, knob on the left
 *
 * Props mirror Radix Switch so it's a drop-in replacement for <Switch />.
 */
export function ToggleButton({ checked, onCheckedChange, disabled, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        'relative shrink-0 cursor-pointer rounded-full border',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 36,
        height: 20,
        padding: 0,
        backgroundColor: checked ? '#fafafa' : '#a3a3a3',
        borderColor: checked ? '#d4d4d4' : '#737373',
        transition: 'background-color 200ms, border-color 200ms',
      }}
    >
      <span
        style={{
          display: 'block',
          width: 16,
          height: 16,
          borderRadius: '9999px',
          backgroundColor: '#171717',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
          transform: checked ? 'translateX(17px)' : 'translateX(2px)',
          transition: 'transform 200ms ease',
          flexShrink: 0,
        }}
      />
    </button>
  )
}

export default ToggleButton
