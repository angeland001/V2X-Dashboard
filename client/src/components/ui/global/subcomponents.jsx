export function Card({ children }) {
  return (
    <div className="rounded-[14px] border border-[#262626] bg-[#0a0a0a] overflow-hidden">
      {children}
    </div>
  )
}

export function CardHeader({ title, description }) {
  return (
    <div className="px-6 pt-6 pb-0">
      <p className="text-base font-medium text-[#fafafa] leading-none">{title}</p>
      <p className="text-sm text-[#a1a1a1] mt-1">{description}</p>
    </div>
  )
}

export function CardBody({ children }) {
  return <div className="px-6 pb-6 pt-6 space-y-4">{children}</div>
}

export function FieldLabel({ children }) {
  return (
    <p className="text-sm font-medium text-[#fafafa] leading-none mb-2">{children}</p>
  )
}

export function TextInput({ value, onChange, placeholder }) {
  return (
    <div
      className="flex items-center rounded-lg px-3 h-9 text-sm text-[#fafafa]"
      style={{ background: 'rgba(38,38,38,0.3)', border: '1px solid #262626' }}
    >
      <input
        className="bg-transparent outline-none w-full text-sm text-[#fafafa] placeholder:text-[#a1a1a1]"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}

export function OutlineButton({ children, className = '', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 h-9 text-sm font-medium text-[#fafafa] text-center ${className}`}
      style={{ background: 'rgba(38,38,38,0.3)', border: '1px solid #262626' }}
    >
      {children}
    </button>
  )
}

export function StatusBadge({ children }) {
  return (
    <span
      className="rounded-lg px-2 py-0.5 text-xs font-medium text-[#fafafa] leading-[1.33]"
      style={{ background: '#262626', border: '1px solid transparent' }}
    >
      {children}
    </span>
  )
}

export function SelectDropdown({ label, value }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        className="flex items-center justify-between rounded-lg px-3 h-9 cursor-pointer"
        style={{ background: 'rgba(38,38,38,0.3)', border: '1px solid #262626' }}
      >
        <span className="text-sm text-[#fafafa]">{value}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="#a1a1a1" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

export function PrimaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg px-4 h-9 text-sm font-medium text-[#171717] bg-[#fafafa]"
    >
      {children}
    </button>
  )
}

export function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{ background: 'rgba(38,38,38,0.3)', border: '1px solid #262626' }}
    >
      <textarea
        rows={rows}
        className="bg-transparent outline-none w-full text-sm text-[#fafafa] placeholder:text-[#a1a1a1] resize-none"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}

export function DangerButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg px-4 h-9 text-sm font-medium text-white flex items-center justify-center"
      style={{ background: 'rgba(130,24,26,0.6)' }}
    >
      {children}
    </button>
  )
}