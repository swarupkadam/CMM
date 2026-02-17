import { clsx } from "clsx";
import logo from "@/assets/croma-logo.png";

type LogoProps = {
  className?: string;
  logoClassName?: string;
  titleClassName?: string;
  cropTopBottomPx?: number;
};

const Logo = ({
  className,
  logoClassName,
  titleClassName,
  cropTopBottomPx = 10,
}: LogoProps) => {
  const cropStyle = {
    height: `calc(100% + ${cropTopBottomPx * 2}px)`,
    transform: `translateY(-${cropTopBottomPx}px)`,
  } as const;

  return (
    <div className={clsx("flex flex-col items-center gap-2", className)}>
      <div className={clsx("h-14 w-24 overflow-hidden", logoClassName)}>
        <img
          src={logo}
          alt="Croma"
          className="h-full w-full object-contain opacity-90"
          style={cropStyle}
        />
      </div>
      <p
        className={clsx(
          "text-sm tracking-widest text-slate-400",
          titleClassName
        )}
      >
        Croma Cloudstream
      </p>
      {/* TODO: Extend with dynamic branding config when available. */}
    </div>
  );
};

export default Logo;
