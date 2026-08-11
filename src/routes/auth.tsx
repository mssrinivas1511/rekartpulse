import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES } from "@/lib/geo";

type Mode = "signin" | "signup" | "forgot" | "reset";

const inputCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect: string } => {
    const redirect = search["redirect"];
    return {
      redirect:
        typeof redirect === "string" && redirect.startsWith("/") ? redirect : "/dashboard",
    };
  },
  head: () => ({
    meta: [
      { title: "Sign in — Rekart Pulse" },
      { name: "description", content: "Sign in to Rekart Pulse, the internal client success and feature adoption dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("India");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setMode("reset");
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !window.location.hash.includes("type=recovery")) {
        void navigate({ to: redirect, replace: true });
      }
    });
  }, [navigate, redirect]);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void navigate({ to: redirect, replace: true });
  }

  async function signUp() {
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    setBusy(true);
    const info = COUNTRIES.find((c) => c.country === country);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          country,
          country_code: info?.dialCode ?? "+91",
          currency: info?.currency ?? "INR",
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. Check your email to confirm, then sign in.");
    setMode("signin");
  }

  async function forgot() {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent — check your email.");
    setMode("signin");
  }

  async function resetPassword() {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    void navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-2/5 flex-col justify-between bg-sidebar p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent">
            <span className="size-4 rounded-full border-[3px] border-sidebar-primary-foreground" />
          </span>
          <span className="text-xl font-extrabold lowercase tracking-tight text-sidebar-primary-foreground">
            rekart
          </span>
          <span className="rounded bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sidebar-primary-foreground">
            Pulse
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-snug text-sidebar-primary-foreground">
            Client Success &amp; Feature Adoption, tracked daily.
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-sidebar-foreground/70">
            Feature adoption, client health, feedback, tickets and product usage — one internal
            dashboard for the Rekart team.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/40">Internal tool — Rekart team only.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-full bg-sidebar">
              <span className="size-3 rounded-full border-[3px] border-sidebar-primary-foreground" />
            </span>
            <span className="text-lg font-extrabold lowercase text-foreground">rekart pulse</span>
          </div>

          {mode === "reset" ? (
            <>
              <h2 className="text-xl font-bold text-foreground">Set a new password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter a new password for your account.
              </p>
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void resetPassword();
                }}
              >
                <input
                  type="password"
                  required
                  minLength={6}
                  className={inputCls}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Update password
                </button>
              </form>
            </>
          ) : mode === "forgot" ? (
            <>
              <h2 className="text-xl font-bold text-foreground">Reset your password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll email you a link to reset your password.
              </p>
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void forgot();
                }}
              >
                <input
                  type="email"
                  required
                  className={inputCls}
                  placeholder="you@rekart.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Send reset link
                </button>
              </form>
              <button
                onClick={() => setMode("signin")}
                className="mt-4 text-sm font-medium text-primary hover:underline"
              >
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-foreground">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to continue to Rekart Pulse."
                  : "Join the Rekart team workspace."}
              </p>
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void (mode === "signin" ? signIn() : signUp());
                }}
              >
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Full name</label>
                      <input
                        required
                        className={inputCls}
                        placeholder="Pappu Singh"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Country</label>
                      <select
                        className={inputCls}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.country} value={c.country}>
                            {c.country} ({c.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <input
                    type="email"
                    required
                    className={inputCls}
                    placeholder="you@rekart.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className={inputCls}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-medium text-primary hover:underline"
                >
                  {mode === "signin" ? "Create an account" : "Already have an account? Sign in"}
                </button>
                {mode === "signin" && (
                  <button
                    onClick={() => setMode("forgot")}
                    className="text-muted-foreground hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
