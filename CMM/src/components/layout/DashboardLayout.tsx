import { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "@/components/Logo";
import { UserMenu } from "../shared/UserMenu";
import { clsx } from "clsx";

const navItems = [
  { label: "Dashboard", to: "/" },
  { label: "Virtual Machines", to: "/virtual-machines" },
  { label: "Scheduler", to: "/scheduler" },
  { label: "Activity Logs", to: "/activity-logs" },
];

const SidebarLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <NavLink
    to={to}
    end={to === "/"}
    className={({ isActive }) =>
      clsx(
        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors duration-200",
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )
    }
  >
    <span>{children}</span>
  </NavLink>
);

const DashboardLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-gray-800">
      <div className="flex">
        <aside className="hidden min-h-screen w-64 flex-col border-r border-slate-100 bg-white px-6 py-8 md:flex">
          <div className="mb-8 border-b border-slate-100 py-6">
            <Logo
              className="transition-opacity hover:opacity-80"
              titleClassName="text-slate-500"
            />
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <SidebarLink key={item.to} to={item.to}>
                {item.label}
              </SidebarLink>
            ))}
          </nav>
        </aside>
        <div className="flex min-h-screen flex-1 flex-col bg-slate-100">
          <header className="border-b border-gray-200 bg-white shadow-sm">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 text-gray-700">
              <div className="flex items-center gap-4 md:hidden">
                <span className="text-sm font-semibold text-gray-700">Menu</span>
              </div>
              <div className="ml-auto">
                <UserMenu onLogout={handleLogout} />
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
