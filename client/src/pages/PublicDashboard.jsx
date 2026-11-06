import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  FolderKanban,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "#overview", icon: Sparkles },
  { label: "What you can do", href: "#features", icon: FolderKanban },
  { label: "How it works", href: "#how-it-works", icon: CheckSquare },
];

const features = [
  {
    icon: FolderKanban,
    title: "Projects that stay clear",
    description:
      "Keep project goals, ownership, deadlines, and progress easy to understand in one shared workspace.",
    color: "bg-violet-100 text-violet-700",
  },
  {
    icon: CheckSquare,
    title: "Work that keeps moving",
    description:
      "Break plans into assigned tasks, follow due dates, and make progress visible from start to finish.",
    color: "bg-sky-100 text-sky-700",
  },
  {
    icon: MessageCircle,
    title: "Teamwork in context",
    description:
      "Keep conversations and updates close to the work so people can find decisions and next steps.",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: ShieldCheck,
    title: "The right access for everyone",
    description:
      "Members can create accounts, while managers and administrators get access appropriate to their role.",
    color: "bg-amber-100 text-amber-700",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your account",
    description:
      "Join as a team member and get started. Administrator access uses an invitation code and requires approval.",
  },
  {
    number: "02",
    title: "Find your workspace",
    description:
      "Open your projects, see the work assigned to you, and check important dates from your dashboard.",
  },
  {
    number: "03",
    title: "Keep work up to date",
    description:
      "Update task progress, share context with teammates, and use notifications to follow what needs attention.",
  },
];

export default function PublicDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900 lg:flex">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-[#17172e] text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-6">
          <Link
            to="/"
            onClick={closeSidebar}
            className="flex items-center gap-3"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500">
              <Zap size={21} fill="currentColor" />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">
                TeamFlow
              </span>
              <span className="block text-xs text-slate-400">
                Work, together.
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="px-4 pt-8" aria-label="Public dashboard">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Explore TeamFlow
          </p>
          <div className="space-y-1">
            {navigation.map(({ label, href, icon: Icon }, index) => (
              <a
                key={href}
                href={href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  index === 0
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-950/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2 text-violet-300">
              <ShieldCheck size={17} />
              <span className="text-sm font-semibold">Built for teams</span>
            </div>
            <p className="text-xs leading-5 text-slate-400">
              One organized place for projects, tasks, and team communication.
            </p>
            <Link
              to="/register"
              onClick={closeSidebar}
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-white"
            >
              Get started <ArrowRight size={14} />
            </Link>
          </div>
          <p className="px-2 pt-4 text-[11px] text-slate-500">
            TeamFlow workspace
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={21} />
            </button>
            <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
              <span className="size-2 rounded-full bg-emerald-500" />
              A calmer way to work together
            </div>
            <span className="text-sm font-semibold text-slate-700 sm:hidden">
              Team workspace
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:px-4"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 sm:px-4"
            >
              <span className="hidden sm:inline">Create account</span>
              <span className="sm:hidden">Join</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-14 pt-7 sm:px-7 sm:pt-10 lg:px-10 lg:pt-12">
          <section
            id="overview"
            className="relative isolate overflow-hidden rounded-[30px] bg-[#17172e] px-6 py-10 text-white shadow-2xl shadow-indigo-950/10 sm:px-10 sm:py-14 lg:px-14 lg:py-[72px]"
          >
            <div className="absolute -right-20 -top-32 -z-10 size-[360px] rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute -bottom-36 right-[25%] -z-10 size-[280px] rounded-full bg-sky-500/10 blur-3xl" />
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-violet-200">
                  <Sparkles size={14} />
                  Your team’s work, in sync
                </span>
                <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[60px]">
                  Less chasing.
                  <span className="block text-violet-300">
                    More meaningful work.
                  </span>
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                  TeamFlow brings projects, tasks, conversations, and deadlines
                  together—so your team knows what matters and what to do next.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-violet-800 shadow-lg transition hover:bg-violet-50"
                  >
                    Create your account <ArrowRight size={17} />
                  </Link>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    See how it works <ArrowDown size={16} />
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-400" />
                    Easy to get started
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-400" />
                    Organized team spaces
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-400" />
                    Role-based access
                  </span>
                </div>
              </div>

              <div className="mx-auto w-full max-w-[480px]">
                <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-sm font-semibold">Your work at a glance</p>
                      <p className="mt-1 text-xs text-slate-400">
                        A shared view of what comes next
                      </p>
                    </div>
                    <span className="flex size-9 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200">
                      <Zap size={17} />
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 py-4">
                    <div className="rounded-2xl bg-white/[0.06] p-4">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200">
                        <FolderKanban size={18} />
                      </span>
                      <p className="mt-4 text-sm font-semibold">Projects</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Goals and progress, together
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.06] p-4">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200">
                        <CheckSquare size={18} />
                      </span>
                      <p className="mt-4 text-sm font-semibold">Tasks</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Clear owners and next steps
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/[0.06] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200">
                          <Users size={18} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">One team space</p>
                          <p className="mt-1 text-xs text-slate-400">
                            People, updates, and schedules
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={17} className="text-slate-500" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                    <span className="flex items-center gap-2 text-xs text-slate-300">
                      <Bell size={15} className="text-amber-300" />
                      Stay on top of important updates
                    </span>
                    <CalendarDays size={16} className="text-slate-400" />
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-slate-400">
                  A simple home for better team coordination
                </p>
              </div>
            </div>
          </section>

          <section id="features" className="scroll-mt-24 pt-16 sm:pt-20">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Everything in one place
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Make the daily work feel easier.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                  The essentials your team needs to plan, deliver, and stay
                  connected—without losing sight of the big picture.
                </p>
              </div>
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900"
              >
                Get started <ArrowUpRight size={17} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {features.map(({ icon: Icon, title, description, color }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6"
                >
                  <span
                    className={`flex size-11 items-center justify-center rounded-xl ${color}`}
                  >
                    <Icon size={21} />
                  </span>
                  <h3 className="mt-5 text-base font-bold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            id="how-it-works"
            className="scroll-mt-24 pt-16 sm:pt-20"
          >
            <div className="grid gap-8 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-9 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:p-11">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  How to use TeamFlow
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  Get from sign-in to progress.
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Start with your dashboard, then use the workspace tools to
                  organize your next steps. Your available pages depend on your
                  account role.
                </p>
                <Link
                  to="/register"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  Join your team <ArrowRight size={16} />
                </Link>
              </div>
              <div className="space-y-1">
                {steps.map(({ number, title, description }, index) => (
                  <article
                    key={number}
                    className={`flex gap-4 py-5 ${
                      index < steps.length - 1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-bold text-violet-700">
                      {number}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-500">
                        {description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-14 overflow-hidden rounded-[28px] bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600 px-6 py-8 text-white sm:px-9 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-200">
                  Ready when you are
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Bring your team’s next project into focus.
                </h2>
                <p className="mt-2 text-sm leading-6 text-violet-100">
                  Create a team member account to get started, or sign in to
                  continue where your team left off.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-violet-800 transition hover:bg-violet-50"
                >
                  Create account <ArrowRight size={16} />
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-7 sm:px-7 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white">
                <Zap size={17} fill="currentColor" />
              </span>
              <span className="text-sm font-bold text-slate-800">TeamFlow</span>
            </Link>
            <p className="text-xs text-slate-500">
              A shared space for focused work and stronger teamwork.
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
              <Link to="/login" className="hover:text-violet-700">
                Sign in
              </Link>
              <Link to="/register" className="hover:text-violet-700">
                Create account
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
