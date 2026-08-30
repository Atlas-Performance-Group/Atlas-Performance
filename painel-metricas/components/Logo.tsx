export function AtlasLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const heights = { sm: "h-8", md: "h-11", lg: "h-16" } as const;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/atlas-logo.webp"
      alt="Atlas Performance Group"
      className={`${heights[size]} w-auto object-contain`}
    />
  );
}

export function ClientLogo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} className="h-9 w-auto object-contain" />;
  }
  return (
    <div className="font-display text-lg" style={{ color: "#fff8ec" }}>
      {name.toUpperCase()}
    </div>
  );
}
