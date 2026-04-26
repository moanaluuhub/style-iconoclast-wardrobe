import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Heart, ExternalLink, Trash2, Pencil, Search, Star } from "lucide-react";
import { getLoginUrl } from "@/const";

// ─── Types ─────────────────────────────────────────────────────────────────────

type EntryType = "designer" | "shop" | "brand";

const TYPE_LABELS: Record<EntryType, string> = {
  designer: "Designer",
  shop: "Shop",
  brand: "Brand",
};

const TYPE_COLORS: Record<EntryType, string> = {
  designer: "bg-rose-50 text-rose-700 border-rose-200",
  shop: "bg-sky-50 text-sky-700 border-sky-200",
  brand: "bg-violet-50 text-violet-700 border-violet-200",
};

// ─── Add / Edit Modal ──────────────────────────────────────────────────────────

function AddEditModal({
  open,
  onClose,
  initial,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  initial?: any;
  onSuccess: () => void;
}) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<EntryType>(initial?.type ?? "designer");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const create = trpc.designers.create.useMutation({
    onSuccess: () => {
      toast.success("Added to your index");
      utils.designers.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.designers.update.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      utils.designers.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (initial) {
      update.mutate({ id: initial.id, name: name.trim(), type, url: url || undefined, location: location || undefined, notes: notes || undefined });
    } else {
      create.mutate({ name: name.trim(), type, url: url || undefined, location: location || undefined, notes: notes || undefined });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif font-normal text-xl">
            {initial ? "Edit entry" : "Add to index"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Row, Dover Street Market"
              className="text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">Type</label>
            <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="shop">Shop</SelectItem>
                <SelectItem value="brand">Brand</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">Website</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Paris, New York"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs tracking-widest uppercase text-muted-foreground">Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes..."
              className="text-sm"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1 text-xs tracking-wide">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending} className="flex-1 text-xs tracking-widest uppercase">
              {initial ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Entry Card ────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  entry: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const initials = entry.name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="group border border-border/40 rounded-sm bg-card hover:border-border transition-all duration-200 p-4 flex items-start gap-4">
      {/* Avatar / Logo */}
      <div className="w-12 h-12 rounded-sm bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
        {entry.logoUrl ? (
          <img src={entry.logoUrl} alt={entry.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-serif text-lg text-muted-foreground/50">{initials}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-base leading-tight truncate">{entry.name}</h3>
              <span
                className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm border ${
                  TYPE_COLORS[entry.type as EntryType] ?? "bg-muted text-muted-foreground border-border"
                }`}
              >
                {TYPE_LABELS[entry.type as EntryType] ?? entry.type}
              </span>
            </div>
            {entry.location && (
              <p className="text-xs text-muted-foreground mt-0.5">{entry.location}</p>
            )}
            {entry.notes && (
              <p className="text-xs text-muted-foreground/70 mt-1 italic font-serif line-clamp-2">
                {entry.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onToggleFavorite}
              className={`p-1.5 rounded-sm transition-colors ${
                entry.isFavorite
                  ? "text-rose-500"
                  : "text-muted-foreground hover:text-rose-400"
              }`}
              title={entry.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart size={14} fill={entry.isFavorite ? "currentColor" : "none"} />
            </button>
            {entry.url && (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="Visit website"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive transition-colors"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Designers Page ────────────────────────────────────────────────────────────

export default function DesignersPage() {
  const { isAuthenticated, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: entries = [], isLoading } = trpc.designers.list.useQuery(
    {
      search: search || undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      favoritesOnly: favoritesOnly || undefined,
    },
    { enabled: isAuthenticated }
  );

  const deleteEntry = trpc.designers.delete.useMutation({
    onSuccess: () => {
      toast.success("Removed from index");
      utils.designers.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleFavorite = trpc.designers.update.useMutation({
    onMutate: async ({ id, isFavorite }) => {
      await utils.designers.list.cancel();
      const prev = utils.designers.list.getData({
        search: search || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        favoritesOnly: favoritesOnly || undefined,
      });
      utils.designers.list.setData(
        {
          search: search || undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
          favoritesOnly: favoritesOnly || undefined,
        },
        (old) => (old ?? []).map((e: any) => (e.id === id ? { ...e, isFavorite } : e))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.designers.list.setData(
          {
            search: search || undefined,
            type: typeFilter !== "all" ? typeFilter : undefined,
            favoritesOnly: favoritesOnly || undefined,
          },
          ctx.prev
        );
      }
    },
    onSettled: () => utils.designers.list.invalidate(),
  });

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="container py-24 text-center">
        <p className="font-serif text-2xl text-muted-foreground/60">Sign in to manage your index</p>
        <Button
          onClick={() => (window.location.href = getLoginUrl())}
          className="mt-6 text-xs tracking-widest uppercase"
        >
          Sign in
        </Button>
      </div>
    );
  }

  const favoriteCount = (entries as any[]).filter((e) => e.isFavorite).length;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl">Designers & Shops</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">
            Your personal index of favourite houses and boutiques
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          size="sm"
          className="gap-1.5 text-xs tracking-widest uppercase"
        >
          <Plus size={13} />
          Add
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-[120px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All types</SelectItem>
            <SelectItem value="designer" className="text-xs">Designers</SelectItem>
            <SelectItem value="shop" className="text-xs">Shops</SelectItem>
            <SelectItem value="brand" className="text-xs">Brands</SelectItem>
          </SelectContent>
        </Select>

        {/* Favorites toggle */}
        <button
          onClick={() => setFavoritesOnly((f) => !f)}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-sm border text-xs transition-all ${
            favoritesOnly
              ? "border-rose-300 bg-rose-50 text-rose-700"
              : "border-border text-muted-foreground hover:border-rose-300 hover:text-rose-500"
          }`}
        >
          <Heart size={12} fill={favoritesOnly ? "currentColor" : "none"} />
          Favourites
          {favoriteCount > 0 && (
            <span className="ml-0.5 text-[10px] font-medium">{favoriteCount}</span>
          )}
        </button>
      </div>

      {/* Entries grid */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-sm bg-muted animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-serif text-3xl text-muted-foreground/60 mb-3">
            {favoritesOnly ? "No favourites yet" : "Your index is empty"}
          </p>
          <p className="text-sm text-muted-foreground mb-6 italic font-serif">
            {favoritesOnly
              ? "Heart a designer or shop to add them here"
              : "Start building your personal index of houses and boutiques"}
          </p>
          {!favoritesOnly && (
            <Button
              onClick={() => setAddOpen(true)}
              variant="outline"
              className="text-xs tracking-widest uppercase gap-1.5"
            >
              <Plus size={13} />
              Add first entry
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {/* Favourites section */}
          {!favoritesOnly && (entries as any[]).some((e) => e.isFavorite) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Star size={12} className="text-amber-500" fill="currentColor" />
                <span className="text-[10px] tracking-widest uppercase text-muted-foreground">
                  Favourites
                </span>
              </div>
              <div className="space-y-2">
                {(entries as any[])
                  .filter((e) => e.isFavorite)
                  .map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={() => setEditEntry(entry)}
                      onDelete={() => setDeleteId(entry.id)}
                      onToggleFavorite={() =>
                        toggleFavorite.mutate({ id: entry.id, isFavorite: !entry.isFavorite })
                      }
                    />
                  ))}
              </div>
              {(entries as any[]).some((e) => !e.isFavorite) && (
                <div className="mt-6 mb-3 flex items-center gap-2">
                  <span className="text-[10px] tracking-widest uppercase text-muted-foreground">
                    All
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Non-favourites (or all when favoritesOnly) */}
          {(entries as any[])
            .filter((e) => favoritesOnly || !e.isFavorite)
            .map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => setEditEntry(entry)}
                onDelete={() => setDeleteId(entry.id)}
                onToggleFavorite={() =>
                  toggleFavorite.mutate({ id: entry.id, isFavorite: !entry.isFavorite })
                }
              />
            ))}
        </div>
      )}

      {/* Add modal */}
      <AddEditModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {}}
      />

      {/* Edit modal */}
      {editEntry && (
        <AddEditModal
          open={editEntry != null}
          onClose={() => setEditEntry(null)}
          initial={editEntry}
          onSuccess={() => setEditEntry(null)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif font-normal text-xl">
              Remove from index?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              This will permanently remove the entry from your index.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs tracking-wide">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteEntry.mutate({ id: deleteId })}
              className="text-xs tracking-wide bg-destructive hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
