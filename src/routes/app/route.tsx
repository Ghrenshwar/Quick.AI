import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Images, ImagePlus, Loader2, LogOut, PenLine, Share2, Wand2 } from "lucide-react";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const NAV = [
  { to: "/app/generate", label: "Generate", icon: ImagePlus },
  { to: "/app/edit", label: "Edit", icon: Wand2 },
  { to: "/app/write", label: "Write", icon: PenLine },
  { to: "/app/snippets", label: "Snippets", icon: Share2 },
  { to: "/app/library", label: "Library", icon: Images },
] as const;

const linkBase =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const linkActive = "bg-accent text-primary";

function AppLayout() {
  const navigate = useNavigate();
  const { session, loading, user } = useSession();

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="px-5 py-5">
          <Link to="/" className="font-mono text-sm font-medium tracking-widest">
            QUICK<span className="text-primary">.</span>AI
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={linkBase}
              activeProps={{ className: linkActive }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          <Link to="/" className="mr-2 shrink-0 font-mono text-xs font-medium tracking-widest">
            QUICK<span className="text-primary">.</span>AI
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
              activeProps={{ className: "bg-accent text-primary" }}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="ml-auto shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
          >
            Sign out
          </button>
        </div>
        <main className="min-w-0 flex-1 px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
