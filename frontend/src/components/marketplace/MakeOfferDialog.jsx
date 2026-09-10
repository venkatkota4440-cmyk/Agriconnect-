import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { inr } from "@/lib/format";
import api, { errMsg } from "@/lib/api";
import { toast } from "sonner";

export function MakeOfferDialog({ open, onOpenChange, listing }) {
  const nav = useNavigate();
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState(listing?.price || "");
  const [delivery, setDelivery] = useState("pickup");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => { if (open) { setPrice(listing?.price || ""); setQuantity(""); setMessage(""); } }, [open, listing]);

  const total = (Number(price) || 0) * (Number(quantity) || 0);

  const submit = async () => {
    if (!quantity || Number(quantity) <= 0) return toast.error("Enter a valid quantity");
    if (!price || Number(price) <= 0) return toast.error("Enter a valid price");
    if (Number(quantity) > listing.quantity_available) return toast.error(`Only ${listing.quantity_available} ${listing.unit} available`);
    setLoading(true);
    try {
      const { data } = await api.post("/offers", {
        listing_id: listing.id, quantity: Number(quantity), price: Number(price),
        delivery_method: delivery, message: message || null, expires_in_days: 7,
      });
      toast.success("Offer sent to farmer");
      onOpenChange(false);
      nav(`/offers/${data.id}`);
    } catch (e) { toast.error(errMsg(e)); } finally { setLoading(false); }
  };

  if (!listing) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="make-offer-dialog">
        <DialogHeader>
          <DialogTitle>Make an Offer · {listing.crop_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
            Listed at <span className="font-semibold text-foreground">{inr(listing.price)}/{listing.price_unit}</span> · {listing.quantity_available} {listing.unit} available
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="offer-qty">Quantity ({listing.unit})</Label>
              <Input id="offer-qty" data-testid="offer-quantity-input" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 200" />
            </div>
            <div>
              <Label htmlFor="offer-price">Your price (/{listing.price_unit})</Label>
              <Input id="offer-price" data-testid="offer-price-input" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Delivery</Label>
            <RadioGroup value={delivery} onValueChange={setDelivery} className="mt-1 flex gap-4">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="pickup" data-testid="offer-pickup" /> Pickup</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="delivery" data-testid="offer-delivery" /> Delivery</label>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="offer-msg">Message (optional)</Label>
            <Textarea id="offer-msg" data-testid="offer-message-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a note for the farmer" rows={2} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="text-sm text-muted-foreground">Offer total</span>
            <span className="text-lg font-bold text-[hsl(var(--primary))]" data-testid="offer-total">{inr(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="offer-cancel">Cancel</Button>
          <Button onClick={submit} disabled={loading} data-testid="offer-submit" className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.9]">
            {loading ? "Sending..." : "Send Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
