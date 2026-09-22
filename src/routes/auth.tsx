import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Systemize" },
      { name: "description", content: "Sign in to your Systemize shop workspace." },
      { property: "og:title", content: "Sign in — Systemize" },
      { property: "og:description", content: "Sign in to your Systemize shop workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/command-center", replace: true });
    });
  }, [navigate]);

  // Demo mode: any password (or none) gets you in. We keep a stable internal
  // password per email so the account can be created and reused.
  function demoPassword(addr: string) {
    return `systemize-demo-${addr.trim().toLowerCase()}`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const fallback = demoPassword(email);
      const tryIn = async (pw: string) =>
        (await supabase.auth.signInWithPassword({ email, password: pw })).error;

      const signUpIfNeeded = async () => {
        const { error } = await supabase.auth.signUp({
          email,
          password: fallback,
          options: { data: { shop_name: shopName || "My shop" } },
        });
        if (error && !/already/i.test(error.message)) throw error;
      };

      let error = password ? await tryIn(password) : await tryIn(fallback);
      if (error && password) error = await tryIn(fallback);
      if (error) {
        await signUpIfNeeded();
        error = await tryIn(fallback);
        if (error) throw error;
      }
      // Make sure the shop workspace exists before entering the app.
      await supabase.rpc("bootstrap_user_workspace", {
        _shop_name: shopName || "My shop",
      });
      navigate({ to: "/command-center", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }


  async function googleSignIn() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/command-center", replace: true });
  }

  return (
    <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8">
        <Link to="/" className="display-title text-2xl font-bold">
          System<span className="text-primary">ize</span>
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">
          {mode === "signin" ? "Sign in to your shop" : "Create your shop"}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="shop">Shop name</Label>
              <Input
                id="shop"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Apex Wraps"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={googleSignIn}>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New shop?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
