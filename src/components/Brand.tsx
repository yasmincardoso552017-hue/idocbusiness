import logo from "@/assets/idoc-business.png.asset.json";

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
