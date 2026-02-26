import { useAuth } from "../../context/AuthContext";

export const UserMenu = ({ onLogout }: { onLogout: () => void }) => {
  const { user } = useAuth();

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-800">{user?.name ?? ""}</p>
        <p className="text-xs text-gray-500">{user?.email ?? ""}</p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 transition-colors duration-200 hover:border-gray-300 hover:text-gray-800"
      >
        Logout
      </button>
    </div>
  );
};
