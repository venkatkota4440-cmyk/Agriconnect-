import React from "react";
import { fileUrl } from "@/lib/api";
import { ImageOff } from "lucide-react";

export function ImageWithFallback({ src, alt, className, style }) {
  const [error, setError] = React.useState(false);
  const url = fileUrl(src);
  if (!url || error) {
    return (
      <div className={className} style={{ ...style, display: "grid", placeItems: "center", background: "hsl(var(--secondary))" }}>
        <ImageOff className="text-muted-foreground/40" size={28} />
      </div>
    );
  }
  return <img src={url} alt={alt || ""} className={className} style={style} loading="lazy" onError={() => setError(true)} />;
}
