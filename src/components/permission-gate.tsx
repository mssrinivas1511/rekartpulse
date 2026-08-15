import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import type { Section } from "@/lib/types";

export function PermissionGate({ section, children }: { section: Section; children: ReactNode }) {
  const { can, isAdmin, loaded } = usePermissions();

  if (!loaded) {
    return (
      <div className="space-y-3 p-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!isAdmin && !can(section, "view")) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-6 text-destructive" />
        </span>
        <h1 className="text-lg font-semibold text-foreground">You don't have permission</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your role doesn't include access to this page. Ask an administrator to grant you access
          under Settings → Roles &amp; Access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
