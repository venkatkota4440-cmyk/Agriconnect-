import React, { useEffect, useState } from "react";
import { PageHeader, Loader, EmptyState } from "@/components/common/States";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Boxes, MoreVertical, Upload, Loader2, ImagePlus } from "lucide-react";
import { CATEGORIES, GRADES, UNITS } from "@/lib/constants";
import { inr, fmtDate } from "@/lib/format";
import api, { errMsg, fileUrl } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_COLORS = { available: "bg-[hsl(var(--verified))/0.12] text-[hsl(var(--verified))]", reserved: "bg-[hsl(var(--harvest))/0.12] text-[hsl(var(--harvest))]", sold: "bg-secondary text-muted-foreground", expired: "bg-[hsl(var(--destructive))/0.1] text-[hsl(var(--destructive))]" };
const EMPTY = { crop_name: "", category: "Vegetables", variety: "", description: "", quantity: "", unit: "kg", grade: "A", price: "", harvest_date: "", available_date: "", organic: false, delivery_available: false, images: [] };

function StockDialog({ open, onOpenChange, editing, onSaved }) {
  const [f, setF] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (editing) setF({ ...EMPTY, ...editing, quantity: editing.quantity_total, images: editing.images || [] });
    else setF(EMPTY);
  }, [editing, open]);

  const uploadImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("images", [...(f.images || []), data.url]);
      toast.success("Image uploaded");
    } catch (err) { toast.error(errMsg(err)); } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!f.crop_name || !f.quantity || !f.price) return toast.error("Crop, quantity and price are required");
    setLoading(true);
    const payload = { ...f, quantity: Number(f.quantity), price: Number(f.price), price_unit: f.unit };
    try {
      if (editing) await api.put(`/listings/${editing.id}`, payload);
      else await api.post("/listings", payload);
      toast.success(editing ? "Listing updated" : "Listing published");
      onOpenChange(false); onSaved();
    } catch (err) { toast.error(errMsg(err)); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" data-testid="stock-dialog">
        <DialogHeader><DialogTitle>{editing ? "Edit Listing" : "Add to Stock"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Crop name *</Label><Input data-testid="stock-crop" value={f.crop_name} onChange={(e) => set("crop_name", e.target.value)} placeholder="e.g. Tomato" /></div>
          <div><Label>Category *</Label>
            <Select value={f.category} onValueChange={(v) => set("category", v)}><SelectTrigger data-testid="stock-category"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Variety</Label><Input data-testid="stock-variety" value={f.variety} onChange={(e) => set("variety", e.target.value)} placeholder="e.g. Hybrid Nati" /></div>
          <div><Label>Grade</Label>
            <Select value={f.grade} onValueChange={(v) => set("grade", v)}><SelectTrigger data-testid="stock-grade"><SelectValue /></SelectTrigger>
              <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Quantity *</Label><Input data-testid="stock-quantity" type="number" value={f.quantity} onChange={(e) => set("quantity", e.target.value)} /></div>
          <div><Label>Unit</Label>
            <Select value={f.unit} onValueChange={(v) => set("unit", v)}><SelectTrigger data-testid="stock-unit"><SelectValue /></SelectTrigger>
              <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Price (per {f.unit}) *</Label><Input data-testid="stock-price" type="number" value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
          <div><Label>Harvest date</Label><Input data-testid="stock-harvest" type="date" value={f.harvest_date || ""} onChange={(e) => set("harvest_date", e.target.value)} /></div>
          <div><Label>Available from</Label><Input data-testid="stock-available" type="date" value={f.available_date || ""} onChange={(e) => set("available_date", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea data-testid="stock-description" value={f.description} onChange={(e) => set("description", e.target.value)} rows={2} /></div>
          <div className="sm:col-span-2">
            <Label>Photos</Label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {(f.images || []).map((img, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
                  <ImageWithFallback src={img} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => set("images", f.images.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1 text-xs text-white">×</button>
                </div>
              ))}
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:bg-secondary" data-testid="stock-upload">
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
                <input type="file" accept="image/*" className="hidden" onChange={uploadImage} disabled={uploading} />
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Checkbox data-testid="stock-organic" checked={f.organic} onCheckedChange={(v) => set("organic", !!v)} /> Organic</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox data-testid="stock-delivery" checked={f.delivery_available} onCheckedChange={(v) => set("delivery_available", !!v)} /> Delivery available</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading} data-testid="stock-submit" className="bg-[hsl(var(--primary))]">{loading ? "Saving..." : editing ? "Update" : "Publish"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MyStock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => { setLoading(true); api.get("/my/stock").then(({ data }) => setItems(data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const setStatus = async (id, status) => { try { await api.patch(`/listings/${id}/status?status=${status}`); toast.success("Updated"); load(); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <div data-testid="mystock-page">
      <PageHeader title="My Stock" subtitle="Manage your crop listings and inventory"
        action={<Button onClick={() => { setEditing(null); setOpen(true); }} data-testid="add-stock-btn" className="gap-2 bg-[hsl(var(--primary))]"><Plus size={16} /> Add Stock</Button>} />

      {loading ? <Loader /> : items.length === 0 ? (
        <EmptyState icon={Boxes} title="No stock yet" description="Add your first crop listing to start selling." testId="mystock-empty"
          action={<Button onClick={() => setOpen(true)} className="bg-[hsl(var(--primary))]">Add Stock</Button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="stock-table">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-3">Crop</th><th className="px-4 py-3">Available</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Harvest</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id} className="border-t border-border" data-testid={`stock-row-${l.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ImageWithFallback src={l.images?.[0]} alt={l.crop_name} className="h-11 w-11 rounded-lg object-cover" />
                        <div><div className="font-semibold text-foreground">{l.crop_name}</div><div className="text-xs text-muted-foreground">{l.variety} · {l.category}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{l.quantity_available}/{l.quantity_total} {l.unit}{l.quantity_reserved > 0 && <div className="text-xs text-[hsl(var(--harvest))]">{l.quantity_reserved} reserved</div>}</td>
                    <td className="px-4 py-3 font-semibold">{inr(l.price)}</td>
                    <td className="px-4 py-3">{l.grade}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(l.harvest_date)}</td>
                    <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", STATUS_COLORS[l.status] || "bg-secondary")}>{l.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button data-testid={`stock-menu-${l.id}`} className="rounded-lg p-1.5 hover:bg-secondary"><MoreVertical size={16} /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(l); setOpen(true); }} data-testid={`stock-edit-${l.id}`}>Edit</DropdownMenuItem>
                          {l.status !== "available" && <DropdownMenuItem onClick={() => setStatus(l.id, "available")}>Mark Available</DropdownMenuItem>}
                          {l.status !== "expired" && <DropdownMenuItem onClick={() => setStatus(l.id, "expired")}>Mark Expired</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => setStatus(l.id, "deleted")} className="text-[hsl(var(--destructive))]" data-testid={`stock-delete-${l.id}`}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <StockDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={load} />
    </div>
  );
}
