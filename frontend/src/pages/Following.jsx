import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Loader, EmptyState } from "@/components/common/States";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { VerifiedBadge, RatingStars } from "@/components/common/Badges";
import { Button } from "@/components/ui/button";
import { Users, UserMinus, MapPin } from "lucide-react";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";

export default function Following() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api.get("/following").then(({ data }) => setItems(data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const unfollow = async (id) => { try { await api.delete(`/follows/${id}`); toast("Unfollowed"); load(); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <div data-testid="following-page">
      <PageHeader title="Following" subtitle="Farmers and buyers you follow" />
      {loading ? <Loader /> : items.length === 0 ? <EmptyState icon={Users} title="Not following anyone yet" description="Follow farmers and buyers to see them here." testId="following-empty" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((u) => (
            <div key={u.id} className="rounded-2xl border border-border bg-card p-5" data-testid={`following-${u.id}`}>
              <Link to={`/users/${u.id}`} className="flex items-center gap-3">
                <ImageWithFallback src={u.photo} alt={u.name} className="h-12 w-12 rounded-xl object-cover" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5"><span className="truncate font-semibold text-foreground">{u.business_name || u.name}</span><VerifiedBadge verified={u.verified} label="" /></div>
                  <div className="text-xs capitalize text-muted-foreground">{u.role}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /> {u.location_approx}</div>
                </div>
              </Link>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <RatingStars value={u.rating || 0} size={12} />
                <Button size="sm" variant="outline" onClick={() => unfollow(u.id)} data-testid={`unfollow-${u.id}`} className="gap-1.5"><UserMinus size={13} /> Unfollow</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
