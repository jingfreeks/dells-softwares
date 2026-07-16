const RING_COLOR = "#c9cc9c";
const INK = "#241f19";
const PAPER = "#f4ecd8";

const CART = (
  <g
    stroke={INK}
    strokeWidth={4}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  >
    {/* handle */}
    <path d="M296 312 L308 312 L332 322" />
    <circle cx="291" cy="312" r="6" fill={INK} stroke="none" />
    {/* items poking above the basket */}
    <path d="M378 300 L378 322 L400 322 L400 296 L389 288 Z" />
    <rect x="404" y="298" width="20" height="26" transform="rotate(-6 414 311)" />
    <rect x="426" y="304" width="20" height="24" transform="rotate(5 436 316)" />
    {/* basket */}
    <path d="M332 322 L470 322 L458 402 L356 402 Z" />
    <path d="M348 322 L354 402" />
    <path d="M366 322 L368 402" />
    <path d="M400 322 L400 402" />
    <path d="M432 322 L426 402" />
    <path d="M452 322 L442 402" />
    <path d="M337 348 L465 348" />
    <path d="M340 376 L462 376" />
    {/* wheel struts */}
    <path d="M362 402 L354 424" />
    <path d="M452 402 L468 424" />
    {/* wheels */}
    <circle cx="352" cy="432" r="12" />
    <circle cx="352" cy="432" r="3" fill={INK} stroke="none" />
    <circle cx="470" cy="432" r="12" />
    <circle cx="470" cy="432" r="3" fill={INK} stroke="none" />
  </g>
);

export function LogoBadge({ size = 224 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      role="img"
      aria-label="Dell's Sari-Sari Store — Your Neighborhood, Your Store."
    >
      <circle cx="400" cy="400" r="390" fill={RING_COLOR} />
      <circle cx="400" cy="400" r="250" fill={PAPER} />
      <circle cx="84.9" cy="455.6" r="9" fill={INK} />
      <circle cx="715.1" cy="455.6" r="9" fill={INK} />

      <path
        id="badge-top-arc"
        d="M 84.9,455.6 A 320,320 0 1 1 715.1,455.6"
        fill="none"
      />
      <path
        id="badge-bottom-arc"
        d="M 84.9,455.6 A 320,320 0 0 0 715.1,455.6"
        fill="none"
      />

      <text
        fontSize="58"
        fontWeight="800"
        letterSpacing="2"
        fill={INK}
        fontFamily="var(--font-tag), monospace"
      >
        <textPath href="#badge-top-arc" startOffset="50%" textAnchor="middle">
          DELL&apos;S SARI-SARI STORE
        </textPath>
      </text>
      <text
        fontSize="30"
        fontWeight="500"
        letterSpacing="2"
        fill={INK}
        fontFamily="var(--font-tag), monospace"
      >
        <textPath
          href="#badge-bottom-arc"
          startOffset="50%"
          textAnchor="middle"
        >
          YOUR NEIGHBORHOOD, YOUR STORE.
        </textPath>
      </text>

      {CART}
    </svg>
  );
}

export function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 800 800" width={size} height={size} aria-hidden>
      <circle cx="400" cy="400" r="390" fill={RING_COLOR} />
      <circle cx="400" cy="400" r="250" fill={PAPER} />
      {CART}
    </svg>
  );
}
