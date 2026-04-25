import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CATEGORIES, SUGGESTED_TAGS, COLORS } from "@/lib/types";
import { Loader2, Upload, X, Heart, ArrowRight, Link2 } from "lucide-react";

interface ItemFormData {
  title: string;
  brand: string;
  category: string;
  color: string;
  size: string;
  purchasePrice: string;
  currency: string;
  purchaseDate: string;
  imageUrl: string;
  buyUrl: string;
  personalNote: string;
  isLoved: boolean;
  tags: string[];
}

interface AddEditItemModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: any;
}

const DEFAULT_FORM: ItemFormData = {
  title: "",
  brand: "",
  category: "tops",
  color: "",
  size: "",
  purchasePrice: "",
  currency: "USD",
  purchaseDate: "",
  imageUrl: "",
  buyUrl: "",
  personalNote: "",
  isLoved: false,
  tags: [],
};

export default function AddEditItemModal({
  open,
  onClose,
  onSuccess,
  editItem,
}: AddEditItemModalProps) {
  const isEdit = !!editItem;
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [form, setForm] = useState<ItemFormData>(
    isEdit
      ? {
          title: editItem.title ?? "",
          brand: editItem.brand ?? "",
          category: editItem.category ?? "tops",
          color: editItem.color ?? "",
          size: editItem.size ?? "",
          purchasePrice: editItem.purchasePrice?.toString() ?? "",
          currency: editItem.currency ?? "USD",
          purchaseDate: editItem.purchaseDate
            ? new Date(editItem.purchaseDate).toISOString().split("T")[0]
            : "",
          imageUrl: editItem.imageUrl ?? "",
          buyUrl: editItem.buyUrl ?? "",
          personalNote: editItem.personalNote ?? "",
          isLoved: editItem.isLoved ?? false,
          tags: editItem.tags ?? [],
        }
      : DEFAULT_FORM
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(editItem?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const createItem = trpc.items.create.useMutation();
  const updateItem = trpc.items.update.useMutation();
  const uploadImage = trpc.items.uploadImage.useMutation();

  const handleClose = () => {
    setStep(isEdit ? 2 : 1);
    setUrlInput("");
    setForm(DEFAULT_FORM);
    setImageFile(null);
    setImagePreview("");
    onClose();
  };

  const handlePullDetails = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      // Try to extract metadata from the URL using LLM-assisted parsing
      // For MVP: pre-fill buyUrl and advance
      setForm((f) => ({ ...f, buyUrl: urlInput }));
      setStep(2);
    } catch {
      toast.error("Could not pull details — please fill in manually.");
      setForm((f) => ({ ...f, buyUrl: urlInput }));
      setStep(2);
    } finally {
      setUrlLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const toggleTag = (tag: string) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  const addCustomTag = () => {
    const t = customTag.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setCustomTag("");
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    let finalImageUrl = form.imageUrl;
    let finalImageKey: string | undefined;

    // Upload image if a file was selected
    if (imageFile) {
      setUploading(true);
      try {
        const base64 = imagePreview.split(",")[1];
        const result = await uploadImage.mutateAsync({
          fileName: imageFile.name,
          contentType: imageFile.type,
          base64Data: base64,
        });
        finalImageUrl = result.url;
        finalImageKey = result.key;
      } catch {
        toast.error("Image upload failed — saving without image.");
      } finally {
        setUploading(false);
      }
    }

    const payload = {
      title: form.title,
      brand: form.brand || undefined,
      category: form.category as any,
      color: form.color || undefined,
      size: form.size || undefined,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
      currency: form.currency,
      purchaseDate: form.purchaseDate || undefined,
      imageUrl: finalImageUrl || undefined,
      imageKey: finalImageKey,
      buyUrl: form.buyUrl || undefined,
      personalNote: form.personalNote || undefined,
      isLoved: form.isLoved,
      tags: form.tags,
    };

    try {
      if (isEdit) {
        await updateItem.mutateAsync({ id: editItem.id, ...payload });
        toast.success("Item updated");
      } else {
        await createItem.mutateAsync(payload);
        toast.success("Item added to wardrobe");
      }
      utils.items.list.invalidate();
      onSuccess();
      handleClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    }
  };

  const isSaving = createItem.isPending || updateItem.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal">
            {isEdit ? "Edit piece" : step === 1 ? "Add a piece" : "Item details"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1 — URL */}
        {step === 1 && (
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                Paste a product link
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="https://..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="pl-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handlePullDetails()}
                  />
                </div>
                <Button
                  onClick={handlePullDetails}
                  disabled={urlLoading || !urlInput.trim()}
                  size="sm"
                  className="gap-1.5 text-xs tracking-wide"
                >
                  {urlLoading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                  Pull
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a product URL to pre-fill details, or add manually below.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              variant="outline"
              className="w-full text-xs tracking-widest uppercase"
              onClick={() => setStep(2)}
            >
              Add manually
            </Button>
          </div>
        )}

        {/* Step 2 — Form */}
        {step === 2 && (
          <div className="space-y-5 pt-2">
            {/* Image */}
            <div className="space-y-2">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                Image
              </Label>
              {imagePreview ? (
                <div className="relative w-full aspect-[4/5] rounded-sm overflow-hidden bg-muted">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setImagePreview("");
                      setImageFile(null);
                      setForm((f) => ({ ...f, imageUrl: "" }));
                    }}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-[4/5] rounded-sm border-2 border-dashed border-border/60 bg-muted/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-all"
                >
                  <Upload size={20} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload image</span>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {!imagePreview && (
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Or paste image URL"
                    value={form.imageUrl}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, imageUrl: e.target.value }));
                      setImagePreview(e.target.value);
                    }}
                    className="text-sm"
                  />
                </div>
              )}
            </div>

            {/* Title & Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Cashmere Coat"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                  Brand
                </Label>
                <Input
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  placeholder="e.g. Loro Piana"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Category & Color */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                  Category
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-sm">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                  Color
                </Label>
                <Select
                  value={form.color}
                  onValueChange={(v) => setForm((f) => ({ ...f, color: v }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c} value={c} className="text-sm capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Size & Price */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                  Size
                </Label>
                <Input
                  value={form.size}
                  onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                  placeholder="e.g. M, 38"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                  Price
                </Label>
                <Input
                  type="number"
                  value={form.purchasePrice}
                  onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                  placeholder="0.00"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                  Currency
                </Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "JPY", "CHF"].map((c) => (
                      <SelectItem key={c} value={c} className="text-sm">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Purchase Date */}
            <div className="space-y-1.5">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                Purchase Date
              </Label>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                className="text-sm"
              />
            </div>

            {/* Buy URL */}
            <div className="space-y-1.5">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                Product URL
              </Label>
              <Input
                value={form.buyUrl}
                onChange={(e) => setForm((f) => ({ ...f, buyUrl: e.target.value }))}
                placeholder="https://..."
                className="text-sm"
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                Personal Note
              </Label>
              <Textarea
                value={form.personalNote}
                onChange={(e) => setForm((f) => ({ ...f, personalNote: e.target.value }))}
                placeholder="Your thoughts on this piece..."
                className="text-sm font-serif italic resize-none"
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground">
                Tags
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`tag-chip ${form.tags.includes(tag) ? "active" : ""}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Add custom tag..."
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
                />
                <Button variant="outline" size="sm" onClick={addCustomTag} className="text-xs">
                  Add
                </Button>
              </div>
              {form.tags.filter((t) => !SUGGESTED_TAGS.includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tags
                    .filter((t) => !SUGGESTED_TAGS.includes(t))
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="tag-chip active"
                      >
                        {tag}
                        <X size={10} className="ml-1" />
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Love */}
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isLoved: !f.isLoved }))}
              className={`flex items-center gap-2 text-sm transition-colors ${
                form.isLoved ? "text-rose-500" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart size={16} fill={form.isLoved ? "currentColor" : "none"} />
              <span className="text-xs tracking-wide">
                {form.isLoved ? "Loved piece" : "Love this piece"}
              </span>
            </button>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 text-xs tracking-widest uppercase"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 text-xs tracking-widest uppercase gap-2"
              >
                {isSaving && <Loader2 size={13} className="animate-spin" />}
                {isEdit ? "Save changes" : "Add to wardrobe"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
