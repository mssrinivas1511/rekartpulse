import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rekart Pulse — Client Success & Feature Adoption" },
      {
        name: "description",
        content:
          "Internal dashboard for the Rekart team to track feature adoption, client health, feedback, tickets, and product usage.",
      },
      { property: "og:title", content: "Rekart Pulse — Client Success & Feature Adoption" },
      {
        property: "og:description",
        content:
          "Internal dashboard for the Rekart team to track feature adoption, client health, feedback, tickets, and product usage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar px-6 text-center">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-sidebar-accent">
          <span className="size-5 rounded-full border-4 border-sidebar-primary-foreground" />
        </span>
        <span className="text-3xl font-extrabold lowercase tracking-tight text-sidebar-primary-foreground">
          rekart
        </span>
        <span className="rounded bg-sidebar-primary px-2 py-1 text-xs font-bold uppercase tracking-widest text-sidebar-primary-foreground">
          Pulse
        </span>
      </div>
      <h1 className="mt-8 max-w-xl text-2xl font-bold text-sidebar-primary-foreground">
        Client Success &amp; Feature Adoption Dashboard
      </h1>
      <p className="mt-3 max-w-md text-sm text-sidebar-foreground/70">
        Track feature adoption, client health, feedback, tickets, and product usage — built for the
        Rekart team's daily operations.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          to="/auth"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-sidebar-primary px-5 text-sm font-semibold text-sidebar-primary-foreground transition-colors hover:bg-sidebar-primary/90"
        >
          Sign in <ArrowRight className="size-4" />
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-sidebar-border px-5 text-sm font-medium text-sidebar-primary-foreground/80 transition-colors hover:bg-sidebar-accent"
        >
          <LayoutDashboard className="size-4" /> Dashboard
        </Link>
      </div>
    </div>
  );
}
