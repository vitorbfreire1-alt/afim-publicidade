export default function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const grande = size === "lg";
  return (
    <span className="inline-flex flex-col leading-none">
      <span className={`font-display font-extrabold text-grad ${grande ? "text-6xl tracking-tight" : "text-2xl tracking-tight"}`}>
        AFIM
      </span>
      <span
        className={`flex items-center gap-2 font-semibold text-ink-soft ${grande ? "mt-2 text-[0.7rem] tracking-[0.5em]" : "mt-1 text-[0.5rem] tracking-[0.42em]"}`}
      >
        PUBLICIDADE
        <span aria-hidden className="pulse-dot size-1 rounded-full bg-gold shadow-[0_0_8px_var(--gold)]" />
      </span>
    </span>
  );
}
