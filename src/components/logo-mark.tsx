/**
 * tlyboy's mark (ring + T), matching the app icon in src-tauri/icons.
 * Colored with currentColor; callers can use text-primary to match the brand color.
 */
export function LogoMark({ className = 'size-12' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 216 216"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="108" cy="108" r="84" stroke="currentColor" strokeWidth="18" />
      <path
        d="M66 67C66 60.9249 70.9249 56 77 56H139C145.075 56 150 60.9249 150 67C150 73.0751 145.075 78 139 78H119V147C119 153.075 114.075 158 108 158C101.925 158 97 153.075 97 147V78H77C70.9249 78 66 73.0751 66 67Z"
        fill="currentColor"
      />
    </svg>
  )
}
