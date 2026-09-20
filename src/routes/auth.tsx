import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Chrome, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Panel, TextInput } from "@/components/studio";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Quick.AI" },
      { name: "description", content: "Sign in or create your Quick.AI account to open the studio." },
      { property: "og:title", content: "Sign in — Quick.AI" },
      { property: "og:description", content: "Sign in or create your Quick.AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/app" });
  }, [loading, session, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        void navigate({ to: "/app" });
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.session) {
          void navigate({ to: "/app" });
        } else {
          setNotice("Account created — check your email to confirm it, then sign in.");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setBusy(false);
    }
  }

  return (
    <div className="studio-bg flex min-h-screen flex-col bg-background px-4 text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between py-5">
        <Link to="/" className="font-mono text-sm font-medium tracking-widest">
          QUICK<span className="text-primary">.</span>AI
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">Back home</Link>
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <Panel className="w-full max-w-sm p-8">
          <p className="label-mono text-primary">{mode === "signin" ? "Welcome back" : "New account"}</p>
          <h1 className="mt-2 font-display text-2xl font-semibold">
            {mode === "signin" ? "Sign in to the studio" : "Create your account"}
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-background/60 p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email">
              <TextInput
                type="email"
                required
                autoComplete="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {notice ? <p className="text-sm text-primary">{notice}</p> : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="label-mono text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={continueWithGoogle} disabled={busy}>
            <Chrome /> Continue with Google
          </Button>
        </Panel>
      </main>
    </div>
  );
}
