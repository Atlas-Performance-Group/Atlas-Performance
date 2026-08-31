export function AtlasLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const heights = { sm: "h-8", md: "h-11", lg: "h-16" } as const;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/atlas-logo-mark.png"
      alt="Atlas Performance Group"
      className={`${heights[size]} w-auto object-contain`}
    />
  );
}
