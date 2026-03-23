export function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
      <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
    </div>
  )
}
