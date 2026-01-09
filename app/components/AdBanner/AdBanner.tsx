"use client";

import { useEffect, useState } from "react";

interface AdBannerProps {
  slot: string;
  format?: "auto" | "fluid" | "rectangle";
  responsive?: "true" | "false";
  style?: React.CSSProperties;
  className?: string;
  isPremium?: boolean;
}

const AdBanner = ({
  slot,
  format = "auto",
  responsive = "true",
  style,
  className = "",
  isPremium = false,
}: AdBannerProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    // Skip if premium or no client ID
    if (isPremium || !adsenseClientId) return;

    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      setIsLoaded(true);
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, [isPremium, adsenseClientId]);

  // Don't render anything for premium users
  if (isPremium) return null;

  // Render placeholder if no client ID (development or not configured)
  if (!adsenseClientId || adsenseClientId === "ca-pub-0000000000000000") {
    return (
      <div
        className={`bg-stone-100 border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center p-8 text-stone-400 select-none ${className}`}
        style={{ minHeight: "100px", ...style }}
      >
        <span className="text-xs font-bold uppercase tracking-widest mb-2 opacity-50">
          Advertisement
        </span>
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 opacity-30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium">Ad Placeholder ({slot})</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ad-container overflow-hidden flex justify-center w-full my-4 ${className}`}
      style={style}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client={adsenseClientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
};

export default AdBanner;
