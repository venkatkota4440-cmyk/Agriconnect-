import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Package, Heart, MessageCircle, HandCoins, Leaf, Truck } from "lucide-react";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { VerifiedBadge, RatingStars } from "@/components/common/Badges";
import { inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { MakeOfferDialog } from "@/components/marketplace/MakeOfferDialog";

export function ProductCard({ listing, saved: initialSaved = false, onView }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [saved, setSaved] = useState(initialSaved);
  const [offerOpen, setOfferOpen] = useState(false);
  const farmer = listing.farmer || {};
  const loc = [listing.location?.district, listing.location?.state].filter(Boolean).join(", ");

  const requireAuth = () => {
    if (!user) { toast.error("Please sign in to continue"); nav("/login"); return false; }
    return true;
  };

  const toggleSave = async (e) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    try {
      if (saved) { await api.delete(`/saved/listing/${listing.id}`); setSaved(false); toast("Removed from saved"); }
      else { await api.post("/saved", { item_type: "listing", item_id: listing.id }); setSaved(true); toast.success("Saved"); }
    } catch (e2) { toast.error(errMsg(e2)); }
  };

  const contact = async (e) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    try {
      const { data } = await api.post("/conversations", { participant_id: listing.farmer_id, context: `Listing: ${listing.crop_name}` });
      nav(`/messages/${data.id}`);
    } catch (e2) { toast.error(errMsg(e2)); }
  };

  const openOffer = (e) => { e.stopPropagation(); if (!requireAuth()) return; if (user.role !== "buyer") { toast.error("Only buyers can make offers"); return; } setOfferOpen(true); };

  return (
    <>
      <article
        data-testid={`product-card-${listing.id}`}
        onClick={() => (onView ? onView(listing) : nav(`/listing/${listing.id}`))}
        className="group card-lift flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          <ImageWithFallback src={listing.images?.[0]} alt={listing.crop_name} className="h-full w-full object-cover transition-transform duration-700 ease-entrance group-hover:scale-105" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {listing.organic && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent))] px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                <Leaf size={11} /> Organic
              </span>
            )}
            {listing.delivery_available && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--earth))] shadow-sm">
                <Truck size={11} /> Delivery
              </span>
            )}
          </div>
          <button
            data-testid={`save-listing-${listing.id}`}
            onClick={toggleSave}
            aria-label="Save listing"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[hsl(var(--earth))] shadow-sm transition-colors ease-interact hover:bg-white"
          >
            <Heart size={17} className={cn(saved && "fill-[hsl(var(--destructive))] text-[hsl(var(--destructive))]")} />
          </button>
          <div className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2.5 py-1 text-white backdrop-blur-sm">
            <span className="text-base font-bold">{inr(listing.price)}</span>
            <span className="text-[11px] opacity-80">/{listing.price_unit}</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-foreground">{listing.crop_name}</h3>
              {listing.variety && <p className="truncate text-xs text-muted-foreground">{listing.variety} · Grade {listing.grade}</p>}
            </div>
            <span className="shrink-0 rounded-md bg-[hsl(var(--secondary))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--primary))]">{listing.category}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin size={13} className="shrink-0" /> <span className="truncate">{loc || "Location approx."}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Package size={13} /> {listing.quantity_available} {listing.unit} avail.</span>
            <RatingStars value={farmer.rating || 0} size={12} />
          </div>

          <div className="mt-1 flex items-center gap-2 border-t border-border pt-2.5">
            <ImageWithFallback src={farmer.photo} alt={farmer.name} className="h-7 w-7 rounded-full object-cover" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{farmer.name}</span>
            <VerifiedBadge verified={farmer.verified} label="" className="px-1.5" />
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button data-testid={`offer-listing-${listing.id}`} onClick={openOffer}
              className="col-span-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[hsl(var(--primary))] px-2 py-2 text-xs font-semibold text-white transition-colors ease-interact hover:bg-[hsl(var(--primary))/0.9]">
              <HandCoins size={14} /> Offer
            </button>
            <button data-testid={`view-listing-${listing.id}`} onClick={(e) => { e.stopPropagation(); nav(`/listing/${listing.id}`); }}
              className="col-span-1 inline-flex items-center justify-center rounded-lg border border-border px-2 py-2 text-xs font-semibold text-foreground transition-colors ease-interact hover:bg-secondary">
              View
            </button>
            <button data-testid={`contact-listing-${listing.id}`} onClick={contact}
              className="col-span-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-2 text-xs font-semibold text-foreground transition-colors ease-interact hover:bg-secondary">
              <MessageCircle size={14} /> Chat
            </button>
          </div>
        </div>
      </article>
      <MakeOfferDialog open={offerOpen} onOpenChange={setOfferOpen} listing={listing} />
    </>
  );
}
