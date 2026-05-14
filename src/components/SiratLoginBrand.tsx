import { SIRAT_TAGLINE } from "@/lib/sirat-brand";
const NAVY = "#002D56";
const BLUE = "#005DAA";
const GREEN = "#2D7A31";
const TAGLINE = "#4a4a4a";

function SiratEmblemImg({ className }: { className?: string }) {
  return (
    <img
      src="/logo-sirat.png"
      alt=""
      width={389}
      height={436}
      decoding="async"
      className={`shrink-0 object-contain ${className ?? ""}`}
    />
  );
}

function SiratWordmark() {
  return (
    <div
      className="flex items-baseline justify-start gap-[0.02em] font-sans text-[clamp(3.15rem,9.6vw,4.9rem)] font-bold leading-none tracking-[-0.03em]"
      style={{ color: NAVY }}
    >
      <span>S</span>
      <span>I</span>
      <span>R</span>
      <span>A</span>
      <span>T</span>
    </div>
  );
}

export function SiratLoginBrand() {
  return (
    <div className="mx-auto flex w-fit max-w-full flex-col items-stretch">
      <div className="inline-grid max-w-full grid-cols-[auto_auto] grid-rows-[auto_auto] items-stretch gap-x-3 sm:gap-x-5">
        <SiratEmblemImg className="col-start-1 row-span-2 self-end object-bottom h-28 w-28 shrink-0 sm:h-40 sm:w-40" />
        <div className="col-start-2 row-start-1 min-w-0 translate-y-6 self-end sm:translate-y-7">
          <SiratWordmark />
        </div>
        <div className="col-start-2 row-start-2 mt-0 w-full min-w-0 self-end">
          <div
            className="h-[2px] w-full shrink-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${BLUE} 0%, ${BLUE} 50%, ${GREEN} 50%, ${GREEN} 100%)`,
            }}
          />
        </div>
      </div>
      <div className="mt-2.5 flex w-full min-w-0 justify-center overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <p
          className="w-max whitespace-nowrap text-center text-[0.68rem] font-normal leading-snug sm:text-[0.8125rem]"
          style={{ color: TAGLINE }}
        >
          {SIRAT_TAGLINE}
        </p>
      </div>
    </div>
  );
}
