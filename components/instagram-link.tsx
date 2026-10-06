import { instagramHandle, siteConfig } from "@/lib/site-config";

// Link to the Instagram profile; renders nothing until the URL is set in lib/site-config.ts.
export function InstagramLink({ className, showHandle = false }: { className?: string; showHandle?: boolean }) {
  const handle = instagramHandle();
  if (!handle) return null;
  return (
    <a
      href={siteConfig.instagramUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={showHandle ? undefined : `Instagram (${handle})`}
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
      {showHandle && <span>{handle}</span>}
    </a>
  );
}
