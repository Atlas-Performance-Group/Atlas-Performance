export function AtlasLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" } as const;
  return (
    <div className={`font-display ${sizes[size]} leading-none flex items-baseline gap-1`}>
      <span style={{ color: "#fff8ec" }}>ATLAS</span>
      <span className="atlas-gold">PERFORMANCE</span>
    </div>
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
