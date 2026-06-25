// components/Logo.tsx
//
// A small geometric mark: two overlapping flashcards (a cooler one behind,
// a warm coral one in front with a folded corner and two "text line" marks
// suggesting a written question). Built as plain SVG shapes -- no embedded
// text glyphs -- so it renders identically everywhere, at any size.

export default function Logo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* back card */}
      <rect x="8" y="4" width="22" height="27" rx="5" transform="rotate(8 19 17.5)" fill="#3DA9FC" />
      {/* front card */}
      <rect x="4" y="6" width="22" height="27" rx="5" transform="rotate(-6 15 19.5)" fill="#FF6B5B" />
      {/* folded corner (dog-ear) on the front card */}
      <path d="M4 6 L4 13 L11 6 Z" transform="rotate(-6 15 19.5)" fill="#E2483A" />
      {/* two "text line" marks suggesting a written question */}
      <line x1="9" y1="17" x2="22" y2="17" transform="rotate(-6 15 19.5)" stroke="#FBF6EC" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="9" y1="22" x2="17" y2="22" transform="rotate(-6 15 19.5)" stroke="#FBF6EC" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}
