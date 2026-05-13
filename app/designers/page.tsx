"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/hooks/useAuth";
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
import { getLoginUrl } from "@/lib/const";

// ─── Types ─────────────────────────────────────────────────────────────────────

type EntryType = "designer" | "shop" | "brand";

const TYPE_LABELS: Record<EntryType, string> = {
  designer: "Designer",
  shop: "Shop",
  brand: "Brand",
};

const TYPE_COLORS: Record<EntryType, string> = {
  designer: "bg-[#F5F5F5] text-black border-[#DEDEDE]",
  shop: "bg-[#F5F5F5] text-black border-[#DEDEDE]",
  brand: "bg-[#F5F5F5] text-black border-[#DEDEDE]",
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
      <DialogContent className="max-w-sm rounded-none border-[#DEDEDE] p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-[#DEDEDE]">
          <DialogTitle className="text-[11px] tracking-[0.18em] uppercase font-medium text-black">
            {initial ? "Edit entry" : "Add to index"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Row, Dover Street Market"
              className="text-[12px] rounded-none border-[#DEDEDE] focus-visible:ring-0 focus-visible:border-black h-9"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Type</label>
            <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
              <SelectTrigger className="text-[12px] rounded-none border-[#DEDEDE] focus:ring-0 h-9">
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
            <label className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Website</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="text-[12px] rounded-none border-[#DEDEDE] focus-visible:ring-0 focus-visible:border-black h-9"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Paris, New York"
              className="text-[12px] rounded-none border-[#DEDEDE] focus-visible:ring-0 focus-visible:border-black h-9"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes..."
              className="text-[12px] rounded-none border-[#DEDEDE] focus-visible:ring-0 focus-visible:border-black h-9"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 text-[10px] tracking-[0.14em] uppercase py-2.5 border border-[#DEDEDE] text-[#5A5A5A] hover:border-black hover:text-black transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="flex-1 text-[10px] tracking-[0.14em] uppercase py-2.5 bg-black text-white hover:bg-[#323232] transition-colors disabled:opacity-40">
              {initial ? "Save" : "Add"}
            </button>
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
    <div className="group border border-[#EDEDED] hover:border-black transition-all duration-200 p-4 flex items-start gap-4">
      {/* Avatar / Logo */}
      <div className="w-12 h-12 bg-[#F5F5F5] flex-shrink-0 overflow-hidden flex items-center justify-center">
        {entry.logoUrl ? (
          <img src={entry.logoUrl} alt={entry.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[13px] font-medium text-[#ACABAB] tracking-wider">{initials}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[13px] font-medium text-black leading-tight truncate">{entry.name}</h3>
              <span
                className={`text-[8px] tracking-[0.14em] uppercase px-1.5 py-0.5 border ${
                  TYPE_COLORS[entry.type as EntryType] ?? "bg-[#F5F5F5] text-black border-[#DEDEDE]"
                }`}
              >
                {TYPE_LABELS[entry.type as EntryType] ?? entry.type}
              </span>
            </div>
            {entry.location && (
              <p className="text-[11px] text-[#5A5A5A] mt-0.5">{entry.location}</p>
            )}
            {entry.notes && (
              <p className="text-[11px] text-[#ACABAB] mt-1 italic line-clamp-2">
                {entry.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onToggleFavorite}
              className="p-1.5 transition-colors text-black"
              title={entry.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart size={13} fill={entry.isFavorite ? "currentColor" : "none"} />
            </button>
            {entry.url && (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-[#5A5A5A] hover:text-black transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="Visit website"
              >
                <ExternalLink size={13} />
              </a>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 text-[#5A5A5A] hover:text-black transition-colors"
              title="Edit"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-[#ACABAB] hover:text-black transition-colors"
              title="Delete"
            >
              <Trash2 size={12} />
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
        <p className="text-[13px] text-[#ACABAB] tracking-wide">Sign in to manage your index</p>
        <button
          onClick={() => (window.location.href = getLoginUrl())}
          className="mt-6 bg-black text-white text-[10px] tracking-[0.14em] uppercase px-8 py-3 hover:bg-[#323232] transition-colors"
        >
          Sign in
        </button>
      </div>
    );
  }

  const favoriteCount = (entries as any[]).filter((e) => e.isFavorite).length;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 border-b border-[#EDEDED] pb-6">
        <div>
          <h1 className="text-[11px] tracking-[0.22em] uppercase font-medium text-black">Designers & Shops</h1>
          <p className="text-[12px] text-[#ACABAB] mt-1 tracking-wide">
            Your personal index of favourite houses and boutiques
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 bg-black text-white text-[10px] tracking-[0.14em] uppercase px-4 py-2 hover:bg-[#323232] transition-colors"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ACABAB]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 h-9 text-[12px] rounded-none border-[#DEDEDE] focus-visible:ring-0 focus-visible:border-black"
          />
        </div>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 text-[12px] w-[120px] rounded-none border-[#DEDEDE] focus:ring-0">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-[#DEDEDE]">
            <SelectItem value="all" className="text-[12px]">All types</SelectItem>
            <SelectItem value="designer" className="text-[12px]">Designers</SelectItem>
            <SelectItem value="shop" className="text-[12px]">Shops</SelectItem>
            <SelectItem value="brand" className="text-[12px]">Brands</SelectItem>
          </SelectContent>
        </Select>

        {/* Favorites toggle */}
        <button
          onClick={() => setFavoritesOnly((f) => !f)}
          className={`flex items-center gap-1.5 h-9 px-3 border text-[10px] tracking-[0.12em] uppercase transition-all ${
            favoritesOnly
              ? "border-black bg-black text-white"
              : "border-[#DEDEDE] text-[#5A5A5A] hover:border-black hover:text-black"
          }`}
        >
          <Heart size={11} fill={favoritesOnly ? "currentColor" : "none"} />
          Favourites
          {favoriteCount > 0 && (
            <span className="ml-0.5 text-[10px]">{favoriteCount}</span>
          )}
        </button>
      </div>

      {/* Entries grid */}
      {isLoading ? (
          <div className="space-y-px">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#F5F5F5] animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-[13px] text-[#ACABAB] tracking-wide mb-2">
            {favoritesOnly ? "No favourites yet" : "Your index is empty"}
          </p>
          <p className="text-[11px] text-[#DEDEDE] mb-6">
            {favoritesOnly
              ? "Heart a designer or shop to add them here"
              : "Start building your personal index of houses and boutiques"}
          </p>
          {!favoritesOnly && (
            <button
              onClick={() => setAddOpen(true)}
              className="text-[10px] tracking-[0.14em] uppercase px-6 py-2.5 border border-black text-black hover:bg-black hover:text-white transition-colors gap-1.5 inline-flex items-center"
            >
              <Plus size={12} />
              Add first entry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {/* Favourites section */}
          {!favoritesOnly && (entries as any[]).some((e) => e.isFavorite) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={11} className="text-black" fill="currentColor" />
                <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">
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
                  <span className="text-[9px] tracking-[0.14em] uppercase text-[#ACABAB]">
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
