interface LogoMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

/** Inline SVG mark — single source of truth for in-app logo and browser favicon. */
export function LogoMark({ size = 40, className, title }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
    >
      {title ? <title>{title}</title> : null}
      <path d="M18.5002 23L36.5002 5V37.5H4L18.5002 23Z" fill="#1E3A5F" />
      <path d="M21.9998 19.5L3.99985 37.5V5H36.5L21.9998 19.5Z" fill="#FF9500" />
      <path
        d="M4 37.5L14.8333 26.6667H25.6667V15.8333L36.5 26.6667L25.6667 37.5H4Z"
        fill="white"
      />
      <path
        d="M4 15.8333L14.8333 26.6667V15.8333H25.6667L36.5 5H14.8333L4 15.8333Z"
        fill="white"
      />
    </svg>
  );
}

export const LOGO_MARK_SVG = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18.5002 23L36.5002 5V37.5H4L18.5002 23Z" fill="#1E3A5F"/><path d="M21.9998 19.5L3.99985 37.5V5H36.5L21.9998 19.5Z" fill="#FF9500"/><path d="M4 37.5L14.8333 26.6667H25.6667V15.8333L36.5 26.6667L25.6667 37.5H4Z" fill="white"/><path d="M4 15.8333L14.8333 26.6667V15.8333H25.6667L36.5 5H14.8333L4 15.8333Z" fill="white"/></svg>`;

export function logoMarkDataUri(): string {
  return `data:image/svg+xml,${encodeURIComponent(LOGO_MARK_SVG)}`;
}

function upsertLink(rel: string, href: string, type?: string): void {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  if (type) {
    link.type = type;
  }
}

/** Sets tab favicon and apple touch icon from the TSX logo source. */
export function applyLogoFavicon(): void {
  const href = logoMarkDataUri();
  upsertLink('icon', href, 'image/svg+xml');
  upsertLink('apple-touch-icon', href);
}
