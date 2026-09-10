import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Loader } from "@/components/common/States";
import { VerifiedBadge, RatingStars } from "@/components/common/Badges";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { MakeOfferDialog } from "@/components/marketplace/MakeOfferDialog";
import { Button } from "@/components/ui/button";
import { MapPin, Package, Calendar, Award, Heart, MessageCircle, UserPlus, UserCheck, Leaf, Truck, ArrowLeft } from "lucide-react";
import { inr } from "@/lib/format";
import { fmtDate } from "@/lib/format";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function ListingDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/listings/${id}`).then(({ data }) => setListing(data)).catch(() => toast.error("Listing not found")).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    if (user && listing) {
      api.get("/saved").then(({ data }) => setSaved((data.listing || []).some((l) => l.id === listing.id))).catch(() => {});
      api.get(`/follows/check/${listing.farmer_id}`).then(({ data }) => setFollowing(data.following)).catch(() => {});
    }
  }, [user, listing]);

  const requireAuth = () => { if (!user) { toast.error("Please sign in"); nav("/login"); return false; } return true; };

  const toggleSave = async () => {
    if (!requireAuth()) return;
    try {
      if (saved) { await api.delete(`/saved/listing/${listing.id}`); setSaved(false); }
      else { await api.post("/saved", { item_type: "listing", item_id: listing.id }); setSaved(true); toast.success("Saved"); }
    } catch (e) { toast.error(errMsg(e)); }
  };
  const toggleFollow = async () => {
    if (!requireAuth()) return;
    try {
      if (following) { await api.delete(`/follows/${listing.farmer_id}`); setFollowing(false); }
      else { await api.post(`/follows/${listing.farmer_id}`); setFollowing(true); toast.success("Following farmer"); }
    } catch (e) { toast.error(errMsg(e)); }
  };
  const message = async () => {
    if (!requireAuth()) return;
    try { const { data } = await api.post("/conversations", { participant_id: listing.farmer_id, context: `Listing: ${listing.crop_name}` }); nav(`/messages/${data.id}`); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const makeOffer = () => { if (!requireAuth()) return; if (user.role !== "buyer") return toast.error("Only buyers can make offers"); setOfferOpen(true); };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><Loader label="Loading listing..." /></div>;
  if (!listing) return <div className="min-h-screen bg-background"><Navbar /><p className="p-16 text-center text-muted-foreground">Listing not found.</p></div>;

  const farmer = listing.farmer || {};
  const images = listing.images?.length ? listing.images : [null];
  const loc = [listing.location?.district, listing.location?.state].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <button onClick={() => nav(-1)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> Back</button>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-secondary">
              <ImageWithFallback src={images[active]} alt={listing.crop_name} className="h-full w-full object-cover" />
              <div className="absolute left-4 top-4 flex gap-2">
                {listing.organic && <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent))] px-2.5 py-1 text-xs font-semibold text-white"><Leaf size={12} /> Organic</span>}
                {listing.delivery_available && <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[hsl(var(--earth))]"><Truck size={12} /> Delivery</span>}
              </div>
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-3">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActive(i)} data-testid={`gallery-thumb-${i}`}
                    className={cn("h-20 w-20 overflow-hidden rounded-xl border-2", active === i ? "border-[hsl(var(--primary))]" : "border-transparent")}>
                    <ImageWithFallback src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[hsl(var(--secondary))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--primary))]">{listing.category}</span>
              {listing.verified_seller && <VerifiedBadge verified label="Verified Seller" />}
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground" data-testid="listing-title">{listing.crop_name}</h1>
            {listing.variety && <p className="text-muted-foreground">{listing.variety}</p>}

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-[hsl(var(--primary))]" data-testid="listing-price">{inr(listing.price)}</span>
              <span className="text-muted-foreground">/ {listing.price_unit}</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                [Package, "Available", `${listing.quantity_available} ${listing.unit}`],
                [Award, "Grade", listing.grade],
                [Calendar, "Harvested", fmtDate(listing.harvest_date)],
                [Calendar, "Available from", fmtDate(listing.available_date)],
                [MapPin, "Location", loc || "Approx."],
                [Package, "Status", listing.status],
              ].map(([Icon, label, val], i) => (
                <div key={i} className="rounded-xl border border-border bg-card px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon size={13} /> {label}</div>
                  <div className="mt-0.5 text-sm font-semibold capitalize text-foreground">{val}</div>
                </div>
              ))}
            </div>

            {listing.description && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-foreground">Description</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button onClick={makeOffer} data-testid="listing-make-offer" className="col-span-2 h-12 bg-[hsl(var(--primary))] text-base hover:bg-[hsl(var(--primary))/0.9]">Make Offer</Button>
              <Button variant="outline" onClick={toggleSave} data-testid="listing-save" className="gap-2"><Heart size={16} className={saved ? "fill-[hsl(var(--destructive))] text-[hsl(var(--destructive))]" : ""} /> {saved ? "Saved" : "Save"}</Button>
              <Button variant="outline" onClick={message} data-testid="listing-message" className="gap-2"><MessageCircle size={16} /> Message</Button>
            </div>

            {/* Farmer card */}
            <Link to={`/users/${listing.farmer_id}`} className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 card-lift" data-testid="listing-farmer-card">
              <ImageWithFallback src={farmer.photo} alt={farmer.name} className="h-14 w-14 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate font-semibold text-foreground">{farmer.name}</span><VerifiedBadge verified={farmer.verified} label="" /></div>
                <div className="mt-0.5"><RatingStars value={farmer.rating || 0} size={12} count={farmer.rating_count} /></div>
                <div className="text-xs text-muted-foreground">{farmer.completed_transactions || 0} completed trades</div>
              </div>
              <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); toggleFollow(); }} data-testid="listing-follow" className="gap-1.5">
                {following ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <MakeOfferDialog open={offerOpen} onOpenChange={setOfferOpen} listing={listing} />
    </div>
  );
}
