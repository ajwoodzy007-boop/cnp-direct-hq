import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

type AdSize = "banner" | "sidebar" | "inline";

interface AdBannerProps {
  size?: AdSize;
  className?: string;
}

const sizeConfig = {
  banner: {
    width: "w-full",
    height: "h-24",
    text: "Advertisement",
  },
  sidebar: {
    width: "w-full",
    height: "h-48",
    text: "Sponsored",
  },
  inline: {
    width: "w-full",
    height: "h-20",
    text: "Ad",
  },
};

export function AdBanner({ size = "banner", className = "" }: AdBannerProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={`${config.width} ${config.height} ${className} bg-gradient-to-r from-muted/50 to-muted border border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground relative overflow-hidden`}
      data-testid={`ad-banner-${size}`}
    >
      <span className="absolute top-1 right-2 text-[10px] uppercase tracking-wider opacity-50">
        {config.text}
      </span>
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm font-medium">Your Ad Here</div>
        <div className="text-xs opacity-70 flex items-center gap-1">
          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          Advertise with us
        </div>
      </div>
    </div>
  );
}

export function AdSidebar({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <AdBanner size="sidebar" />
      <div className="text-center">
        <a
          href="/pricing"
          className="text-xs text-primary hover:underline"
          data-testid="link-remove-ads"
        >
          Upgrade to Pro to remove ads
        </a>
      </div>
    </div>
  );
}
