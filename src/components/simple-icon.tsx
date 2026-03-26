interface SimpleIconProps {
  icon: { path: string }
  className?: string
}

export function SimpleIcon({ icon, className }: SimpleIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={icon.path} />
    </svg>
  )
}
