import logo from "@/assets/idoc-business-logo-2026.png.asset.json";

/** Logotipo oficial IDOC BUSINESS. */
export function Brand({ className = "h-7" }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="IDOC BUSINESS"
      className={`w-auto shrink-0 object-contain ${className}`}
    />
  );
}
