import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Loader, EmptyState } from "@/components/common/States";
import { VerifiedBadge, RatingStars } from "@/components/common/Badges";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPin, UserPlus, UserCheck, MessageCircle, Heart, Ruler, Briefcase, Package, Star } from "lucide-react";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function UserProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [following, setFollowing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const isSelf = user && user.id === id;

  const load = () => {
    setLoading(true);
    api.get(`/users/${id}`).then(({ data }) => {
      setProfile(data);
      if (data.role === "farmer") api.get(`/listings?page_size=12`).then(({ data: ld }) => setListings(ld.items.filter((l) => l.farmer_id === id))).catch(() => {});
    }).catch(() => toast.error("Profile not found")).finally(() => setLoading(false));
    api.get(`/users/${id}/ratings`).then(({ data }) => setRatings(data)).catch(() => {});
  };
  useEffect(load, [id]);
  useEffect(() => {
    if (user && !isSelf) {
      api.get(`/follows/check/${id}`).then(({ data }) => setFollowing(data.following)).catch(() => {});
    }
  }, [user, id, isSelf]);

  const requireAuth = () => { if (!user) { toast.error("Please sign in"); nav("/login"); return false; } return true; };
  const toggleFollow = async () => {
    if (!requireAuth()) return;
    try {
      if (following) { await api.delete(`/follows/${id}`); setFollowing(false); }
      else { await api.post(`/follows/${id}`); setFollowing(true); toast.success("Following"); }
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const saveProfile = async () => {
    if (!requireAuth()) return;
    try { await api.post("/saved", { item_type: profile.role, item_id: id }); setSaved(true); toast.success("Saved"); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const message = async () => {
    if (!requireAuth()) return;
    try { const { data } = await api.post("/conversations", { participant_id: id }); nav(`/messages/${data.id}`); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><Loader /></div>;
  if (!profile) return <div className="min-h-screen bg-background"><Navbar /><p className="p-16 text-center text-muted-foreground">Profile not found.</p></div>;

  const isFarmer = profile.role === "farmer";
  const stats = isFarmer
    ? [["Active Listings", profile.active_listings], ["Completed", profile.completed_transactions], ["Followers", profile.followers_count], ["Rating", profile.rating?.toFixed(1) || "—"]]
    : [["Completed", profile.completed_transactions], ["Rating", profile.rating?.toFixed(1) || "—"], ["Following", profile.following_count], ["Type", profile.buyer_type || "Buyer"]];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="h-32 bg-[hsl(var(--primary))]" />
          <div className="px-6 pb-6">
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <ImageWithFallback src={profile.photo} alt={profile.name} className="h-24 w-24 rounded-2xl border-4 border-card object-cover bg-secondary" />
                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl font-bold text-foreground" data-testid="profile-name">{isFarmer ? profile.name : profile.business_name || profile.name}</h1>
                    <VerifiedBadge verified={profile.verified} />
                  </div>
                  <p className="text-sm text-muted-foreground">{isFarmer ? profile.specialization || "Farmer" : `${profile.buyer_type || "Buyer"} · ${profile.name}`}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} /> {profile.location_approx}</div>
                </div>
              </div>
              {!isSelf && (
                <div className="flex gap-2">
                  <Button onClick={toggleFollow} data-testid="profile-follow" className="gap-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9]">
                    {following ? <><UserCheck size={16} /> Following</> : <><UserPlus size={16} /> Follow</>}
                  </Button>
                  <Button variant="outline" onClick={message} data-testid="profile-message" className="gap-1.5"><MessageCircle size={16} /> Message</Button>
                  <Button variant="outline" onClick={saveProfile} data-testid="profile-save"><Heart size={16} className={saved ? "fill-[hsl(var(--destructive))] text-[hsl(var(--destructive))]" : ""} /></Button>
                </div>
              )}
              {isSelf && <Button variant="outline" onClick={() => nav("/settings")} data-testid="profile-edit">Edit Profile</Button>}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(([label, val]) => (
                <div key={label} className="rounded-xl bg-secondary px-4 py-3 text-center">
                  <div className="text-xl font-bold text-[hsl(var(--primary))]">{val ?? 0}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Tabs defaultValue="about" className="mt-6">
          <TabsList data-testid="profile-tabs">
            <TabsTrigger value="about" data-testid="tab-about">About</TabsTrigger>
            {isFarmer && <TabsTrigger value="listings" data-testid="tab-listings">Listings ({listings.length})</TabsTrigger>}
            <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews ({ratings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-5">
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-foreground">{isFarmer ? "About the Farmer" : "About the Business"}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{profile.about || "No description provided yet."}</p>
                {isFarmer && profile.crops?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Crops</div>
                    <div className="mt-2 flex flex-wrap gap-2">{profile.crops.map((c) => <span key={c} className="rounded-full bg-secondary px-3 py-1 text-sm text-[hsl(var(--primary))]">{c}</span>)}</div>
                  </div>
                )}
                {!isFarmer && profile.crops_required?.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Crops Required</div>
                    <div className="mt-2 flex flex-wrap gap-2">{profile.crops_required.map((c) => <span key={c} className="rounded-full bg-secondary px-3 py-1 text-sm text-[hsl(var(--primary))]">{c}</span>)}</div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {isFarmer ? (
                  <>
                    <InfoRow icon={Ruler} label="Farm Size" value={profile.farm_size} />
                    <InfoRow icon={Briefcase} label="Experience" value={profile.experience_years ? `${profile.experience_years} years` : null} />
                  </>
                ) : (
                  <InfoRow icon={Package} label="Procurement" value={profile.procurement_quantity} />
                )}
                <InfoRow icon={Star} label="Rating" value={`${profile.rating?.toFixed(1) || 0} (${profile.rating_count})`} />
              </div>
            </div>
          </TabsContent>

          {isFarmer && (
            <TabsContent value="listings" className="mt-5">
              {listings.length === 0 ? <EmptyState icon={Package} title="No active listings" testId="profile-no-listings" /> : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{listings.map((l) => <ProductCard key={l.id} listing={l} />)}</div>
              )}
            </TabsContent>
          )}

          <TabsContent value="reviews" className="mt-5">
            {ratings.length === 0 ? <EmptyState icon={Star} title="No reviews yet" testId="profile-no-reviews" /> : (
              <div className="space-y-3">
                {ratings.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-border bg-card p-5" data-testid={`review-${r.id}`}>
                    <div className="flex items-center gap-3">
                      <ImageWithFallback src={r.rater?.photo} alt={r.rater?.name} className="h-9 w-9 rounded-full object-cover" />
                      <div className="flex-1"><div className="text-sm font-semibold">{r.rater?.name || "User"}</div></div>
                      <RatingStars value={r.rating} size={13} />
                    </div>
                    {r.review && <p className="mt-2 text-sm text-muted-foreground">{r.review}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-[hsl(var(--primary))]"><Icon size={16} /></div>
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-sm font-semibold text-foreground">{value || "—"}</div></div>
    </div>
  );
}
