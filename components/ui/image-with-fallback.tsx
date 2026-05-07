"use client";

import { useState } from "react";

type ImageWithFallbackProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export function ImageWithFallback({ src, alt, className, fallbackClassName }: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <div className={fallbackClassName ?? "h-full w-full bg-slate-200"} aria-label={`${alt} unavailable`} />;
  }

  return <img src={src} alt={alt} className={className} onError={() => setHasError(true)} />;
}
