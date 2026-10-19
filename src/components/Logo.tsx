export default function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="inline-flex flex-col leading-none">
      <span
        className={`font-black tracking-tight text-gold ${size === "lg" ? "text-5xl" : "text-2xl"}`}
      >
        AFIM
      </span>
      <span
        className={`font-semibold tracking-[0.3em] text-ink-soft ${size === "lg" ? "text-xs" : "text-[0.55rem]"}`}
      >
        PUBLICIDADE
      </span>
    </span>
  );
}
