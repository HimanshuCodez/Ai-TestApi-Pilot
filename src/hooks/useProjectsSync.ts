import { useEffect } from "react";
import { useProjectsStore } from "@/store/useProjectsStore";

/** Loads the signed-in user's real projects once, as soon as auth is ready. */
export function useProjectsSync(enabled: boolean) {
  const fetchProjects = useProjectsStore((s) => s.fetchProjects);
  const hasLoaded = useProjectsStore((s) => s.hasLoaded);

  useEffect(() => {
    if (!enabled || hasLoaded) return;
    void fetchProjects();
  }, [enabled, hasLoaded, fetchProjects]);
}
