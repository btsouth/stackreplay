import Link from "next/link";
export function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" aria-label="StackReplay home" className="sr-brand" onClick={onNavigate}>
      <span aria-hidden="true">↺</span>StackReplay
    </Link>
  );
}
