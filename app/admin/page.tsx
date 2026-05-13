"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Users, ShoppingBag, Layers, Heart, Shield, ShieldOff, RefreshCw, UserPlus, Trash2, Copy, Check } from "lucide-react";

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="border border-[#DEDEDE] p-6 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[#5A5A5A]">
        {icon}
        <span className="text-[10px] tracking-[0.14em] uppercase">{label}</span>
      </div>
      <div className="text-3xl font-light text-black">{value}</div>
      {sub && <div className="text-[10px] text-[#ACABAB] tracking-wide">{sub}</div>}
    </div>
  );
}

function CollaboratorsSection() {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: collaborators = [], isLoading } = trpc.collaborators.list.useQuery();

  const invite = trpc.collaborators.invite.useMutation({
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
      setEmail("");
      utils.collaborators.list.invalidate();
    },
  });

  const revoke = trpc.collaborators.revoke.useMutation({
    onSuccess: () => utils.collaborators.list.invalidate(),
  });

  const handleInvite = () => {
    if (!email.trim()) return;
    invite.mutate({ email: email.trim(), permission, origin: window.location.origin });
  };

  const copyLink = (url: string, id: number) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const activeCollabs = (collaborators as any[]).filter((c) => c.status !== "revoked");

  return (
    <div className="mt-12">
      <div className="mb-4">
        <h3 className="text-[10px] tracking-[0.18em] uppercase text-[#5A5A5A] mb-1">Wishlist Collaborators</h3>
        <p className="text-[11px] text-[#ACABAB]">
          Invite someone to view or edit your wishlist. They'll receive a link to accept the invitation after logging in.
        </p>
      </div>

      {/* Invite form */}
      <div className="border border-[#DEDEDE] p-6 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Collaborator's email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="flex-1 border border-[#DEDEDE] px-3 py-2 text-[11px] tracking-wide placeholder:text-[#ACABAB] focus:outline-none focus:border-black transition-colors"
          />
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as "view" | "edit")}
            className="border border-[#DEDEDE] px-3 py-2 text-[11px] tracking-wide text-[#5A5A5A] focus:outline-none focus:border-black transition-colors bg-white"
          >
            <option value="view">View only</option>
            <option value="edit">Can edit</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={invite.isPending || !email.trim()}
            className="flex items-center gap-1.5 bg-black text-white text-[10px] tracking-[0.14em] uppercase px-4 py-2 hover:bg-[#222] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <UserPlus size={12} />
            {invite.isPending ? "Sending..." : "Send Invite"}
          </button>
        </div>

        {/* Show generated invite link */}
        {inviteUrl && (
          <div className="mt-4 p-3 bg-[#F5F5F5] border border-[#DEDEDE] flex items-center gap-3">
            <span className="flex-1 text-[10px] text-[#5A5A5A] break-all">{inviteUrl}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(inviteUrl); setCopiedId(-1); setTimeout(() => setCopiedId(null), 2000); }}
              className="flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-[#5A5A5A] hover:text-black transition-colors shrink-0"
            >
              {copiedId === -1 ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
              {copiedId === -1 ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* Collaborators list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border border-[#DEDEDE] h-14 animate-pulse bg-[#F5F5F5]" />
          ))}
        </div>
      ) : activeCollabs.length === 0 ? (
        <div className="border border-[#DEDEDE] border-dashed py-10 text-center text-[11px] text-[#ACABAB]">
          No collaborators yet. Invite someone above.
        </div>
      ) : (
        <div className="border border-[#DEDEDE] overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#DEDEDE] bg-[#F5F5F5]">
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium">Email</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium">Permission</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium">Status</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium">Invited</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeCollabs.map((c: any) => {
                const link = `${window.location.origin}/collab/accept?token=${c.inviteToken}`;
                return (
                  <tr key={c.id} className="border-b border-[#DEDEDE] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3 text-[11px] text-black">{c.inviteEmail}</td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] tracking-[0.1em] uppercase border border-[#DEDEDE] px-2 py-0.5 text-[#5A5A5A]">
                        {c.permission}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 border ${
                        c.status === "accepted"
                          ? "border-green-300 text-green-600 bg-green-50"
                          : "border-amber-300 text-amber-600 bg-amber-50"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-[#ACABAB]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {c.status === "pending" && (
                          <button
                            onClick={() => copyLink(link, c.id)}
                            title="Copy invite link"
                            className="flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-[#5A5A5A] hover:text-black transition-colors border border-[#DEDEDE] px-2 py-1"
                          >
                            {copiedId === c.id ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
                            {copiedId === c.id ? "Copied" : "Copy link"}
                          </button>
                        )}
                        <button
                          onClick={() => revoke.mutate({ id: c.id })}
                          disabled={revoke.isPending}
                          title="Revoke access"
                          className="flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-[#5A5A5A] hover:text-red-600 transition-colors border border-[#DEDEDE] hover:border-red-300 px-2 py-1"
                        >
                          <Trash2 size={10} />
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [confirmRole, setConfirmRole] = useState<"user" | "admin" | null>(null);
  const utils = trpc.useUtils();

  const { data: platformStats, isLoading: statsLoading } = trpc.admin.platformStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.users.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const setRole = trpc.admin.setRole.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      utils.admin.platformStats.invalidate();
      setConfirmId(null);
      setConfirmRole(null);
    },
  });

  // Redirect non-admins
  if (!isAuthenticated) {
    router.push("/");
    return null;
  }
  if (user && user.role !== "admin") {
    router.push("/");
    return null;
  }

  const handleRoleChange = (userId: number, newRole: "user" | "admin") => {
    if (userId === user?.id) return; // can't demote yourself
    setConfirmId(userId);
    setConfirmRole(newRole);
  };

  const confirmRoleChange = () => {
    if (confirmId !== null && confirmRole !== null) {
      setRole.mutate({ userId: confirmId, role: confirmRole });
    }
  };

  return (
    <div className="container py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[11px] tracking-[0.22em] uppercase text-[#5A5A5A] mb-1">Admin</h1>
          <h2 className="text-2xl font-light tracking-wide text-black">Platform Dashboard</h2>
        </div>
        <button
          onClick={() => { refetchUsers(); utils.admin.platformStats.invalidate(); }}
          className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-[#5A5A5A] hover:text-black transition-colors border border-[#DEDEDE] px-3 py-2"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Platform Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-[#DEDEDE] p-6 h-28 animate-pulse bg-[#F5F5F5]" />
          ))}
        </div>
      ) : platformStats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard icon={<Users size={14} />} label="Total Users" value={platformStats.totalUsers} />
          <StatCard icon={<ShoppingBag size={14} />} label="Total Pieces" value={platformStats.totalItems} sub="across all wardrobes" />
          <StatCard icon={<Layers size={14} />} label="Total Outfits" value={platformStats.totalOutfits} sub="saved looks" />
          <StatCard icon={<Heart size={14} />} label="Cart Items" value={platformStats.totalWishlist} sub="across all users" />
        </div>
      ) : null}

      {/* Users Table */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[10px] tracking-[0.18em] uppercase text-[#5A5A5A]">
          Registered Users ({(users as any[]).length})
        </h3>
      </div>

      {usersLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-[#DEDEDE] h-14 animate-pulse bg-[#F5F5F5]" />
          ))}
        </div>
      ) : (
        <div className="border border-[#DEDEDE] overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#DEDEDE] bg-[#F5F5F5]">
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium">User</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium">Role</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium text-right">Pieces</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium text-right">Outfits</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium text-right">Cart</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium text-right">Wardrobe Value</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium text-right">Joined</th>
                <th className="px-4 py-3 text-[9px] tracking-[0.14em] uppercase text-[#5A5A5A] font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users as any[]).map((u) => (
                <tr key={u.id} className="border-b border-[#DEDEDE] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-black">{u.name ?? "—"}</span>
                      <span className="text-[10px] text-[#ACABAB]">{u.email ?? u.openId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] tracking-[0.12em] uppercase px-2 py-1 border ${
                      u.role === "admin"
                        ? "border-amber-400 text-amber-600 bg-amber-50"
                        : "border-[#DEDEDE] text-[#5A5A5A]"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] text-black">{u.itemCount}</td>
                  <td className="px-4 py-3 text-right text-[11px] text-black">{u.outfitCount}</td>
                  <td className="px-4 py-3 text-right text-[11px] text-black">{u.wishlistCount}</td>
                  <td className="px-4 py-3 text-right text-[11px] text-black">
                    {u.totalValue > 0 ? `$${u.totalValue.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[10px] text-[#ACABAB]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.id !== user?.id ? (
                      <button
                        onClick={() => handleRoleChange(u.id, u.role === "admin" ? "user" : "admin")}
                        className={`flex items-center gap-1 mx-auto text-[9px] tracking-[0.1em] uppercase px-2 py-1 border transition-colors ${
                          u.role === "admin"
                            ? "border-[#DEDEDE] text-[#5A5A5A] hover:border-black hover:text-black"
                            : "border-[#DEDEDE] text-[#5A5A5A] hover:border-amber-400 hover:text-amber-600"
                        }`}
                        title={u.role === "admin" ? "Demote to user" : "Promote to admin"}
                      >
                        {u.role === "admin" ? <ShieldOff size={11} /> : <Shield size={11} />}
                        {u.role === "admin" ? "Demote" : "Promote"}
                      </button>
                    ) : (
                      <span className="text-[9px] text-[#ACABAB] tracking-wide">You</span>
                    )}
                  </td>
                </tr>
              ))}
              {(users as any[]).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[11px] text-[#ACABAB]">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Collaborators section */}
      <CollaboratorsSection />

      {/* Confirm role change dialog */}
      {confirmId !== null && confirmRole !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border border-[#DEDEDE] p-8 max-w-sm w-full mx-4">
            <h3 className="text-[11px] tracking-[0.18em] uppercase mb-3 text-black">
              {confirmRole === "admin" ? "Promote to Admin" : "Demote to User"}
            </h3>
            <p className="text-[12px] text-[#5A5A5A] mb-6 leading-relaxed">
              {confirmRole === "admin"
                ? "This user will gain full admin access to the platform dashboard."
                : "This user will lose admin access and return to a standard user account."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmRoleChange}
                disabled={setRole.isPending}
                className="flex-1 bg-black text-white text-[10px] tracking-[0.14em] uppercase py-2.5 hover:bg-[#222] transition-colors disabled:opacity-50"
              >
                {setRole.isPending ? "Saving..." : "Confirm"}
              </button>
              <button
                onClick={() => { setConfirmId(null); setConfirmRole(null); }}
                className="flex-1 border border-[#DEDEDE] text-[10px] tracking-[0.14em] uppercase py-2.5 text-[#5A5A5A] hover:border-black hover:text-black transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
