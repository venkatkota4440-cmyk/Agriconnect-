import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Loader, EmptyState } from "@/components/common/States";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { VerifiedBadge } from "@/components/common/Badges";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heart, MapPin } from "lucide-react";
import api from "@/lib/api";

export default function SavedItems() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/saved").then(({ data }) => setData(data)).catch(() => setData({ listing: [], farmer: [], buyer: [], market: [], transport: [] })); }, []);
  if (!data) return <Loader />;

  const tabs = [
    ["listings", "Listings", data.listing], ["farmers", "Farmers", data.farmer], ["buyers", "Buyers", data.buyer],
    ["markets", "Markets", data.market], ["transport", "Transport", data.transport],
  ];

  return (
    <div data-testid="saved-page">
      <PageHeader title="Saved Items" subtitle="Your private saved listings and profiles" />
      <Tabs defaultValue="listings">
        <TabsList data-testid="saved-tabs" className="flex-wrap">
          {tabs.map(([k, label, arr]) => <TabsTrigger key={k} value={k} data-testid={`saved-tab-${k}`}>{label} ({arr.length})</TabsTrigger>)}
        </TabsList>

        <TabsContent value="listings" className="mt-5">
          {data.listing.length === 0 ? <EmptyState icon={Heart} title="No saved listings" testId="saved-listings-empty" /> : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.listing.map((l) => <ProductCard key={l.id} listing={l} saved />)}</div>
          )}
        </TabsContent>

        {[["farmers", data.farmer], ["buyers", data.buyer]].map(([k, arr]) => (
          <TabsContent key={k} value={k} className="mt-5">
            {arr.length === 0 ? <EmptyState icon={Heart} title={`No saved ${k}`} testId={`saved-${k}-empty`} /> : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {arr.map((u) => (
                  <Link key={u.id} to={`/users/${u.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 card-lift" data-testid={`saved-user-${u.id}`}>
                    <ImageWithFallback src={u.photo} alt={u.name} className="h-12 w-12 rounded-xl object-cover" />
                    <div className="min-w-0"><div className="flex items-center gap-1.5"><span className="truncate font-semibold">{u.business_name || u.name}</span><VerifiedBadge verified={u.verified} label="" /></div><div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /> {u.location_approx}</div></div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        ))}

        {[["markets"], ["transport"]].map(([k]) => (
          <TabsContent key={k} value={k} className="mt-5"><EmptyState icon={Heart} title={`No saved ${k}`} description="Saved items are private to you." testId={`saved-${k}-empty`} /></TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
