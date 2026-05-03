import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Users, ShoppingBag, Layers, Heart, Shield, ShieldOff, RefreshCw } from "lucide-react";

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

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
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
    navigate("/");
    return null;
  }
  if (user && user.role !== "admin") {
    navigate("/");
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
