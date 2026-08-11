import { useQuery } from "@tanstack/react-query";
import { getMyPermissions } from "@/lib/pulse.functions";
import type { PermAction, Section } from "@/lib/types";

export function usePermissions() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-permissions"],
    queryFn: () => getMyPermissions(),
    staleTime: 60_000,
  });

  const isAdmin = data?.isAdmin ?? false;
  const can = (section: Section, action: PermAction): boolean =>
    isAdmin || (data?.permissions?.[section]?.[action] ?? false);

  return { isAdmin, can, isLoading, loaded: Boolean(data) };
}
