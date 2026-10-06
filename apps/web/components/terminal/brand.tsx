import Link from "next/link";
export function TerminalBrand({ href = "/app/recap" }: { href?: string }) {
  return (
    <Link
      prefetch={false}
      href={href}
      className="logo"
      aria-label={href === "/" ? "StackReplay home" : "StackReplay overview"}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 22 22">
        <rect width="22" height="22" rx="3" fill="var(--signal)" />
        <path d="M5 16V7m4 9V10m4 6V4m4 12v-4" stroke="#120800" strokeWidth="2" />
      </svg>
      stackreplay
    </Link>
  );
}
