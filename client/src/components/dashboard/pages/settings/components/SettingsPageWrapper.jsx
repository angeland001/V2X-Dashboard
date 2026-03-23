export function SettingsPageWrapper({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-800">
        <Icon className="h-5 w-5 text-neutral-400" />
        <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-6">
        {children}
      </div>
    </div>
  )
}
