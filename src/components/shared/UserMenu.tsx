import { useAuth } from "../../context/AuthContext";

export const UserMenu = ({ onLogout }: { onLogout: () => void }) => {
  const { user } = useAuth();

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-semibold">{user?.name ?? ""}</p>
        <p className="text-xs text-slate-400">{user?.email ?? ""}</p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
      >
        Logout
      </button>
    </div>
  );
};
