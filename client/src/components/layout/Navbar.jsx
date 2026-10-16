
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, Search, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = (user?.full_name || "Team Member")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-19 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={21} />
        </button>

        <div className="relative hidden w-64 md:block xl:w-80">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Search anything..."
            aria-label="Search"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <button
          type="button"
          aria-label="View notifications"
          onClick={() => navigate("/notifications")}
          className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-violet-600"
        >
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <div className="relative">
          <button
            onClick={() => setProfileOpen((value) => !value)}
            aria-expanded={profileOpen}
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="max-w-36 truncate text-sm font-semibold text-slate-800">
                {user?.full_name || "Team Member"}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {user?.role || "member"}
              </p>
            </div>
            <ChevronDown size={16} className="hidden text-slate-400 sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-14 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/settings");
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                Account settings
              </button>
              <button
                onClick={logout}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
