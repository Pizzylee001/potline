"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Keep one form value in the query string so a refresh does not lose it. The
 * local state is the source of truth for the input; the URL is written with
 * replace and scroll kept still, so typing never moves the page under the caret.
 */
export function useUrlParam(name: string, initial: string) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value.length === 0) next.delete(name);
      else next.set(name, value);
      const search = next.toString();
      router.replace(search.length > 0 ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    },
    [name, params, pathname, router],
  );

  const current = params.get(name);

  return {
    /** The value held in the URL, or the supplied default when absent. */
    value: current ?? initial,
    set,
  };
}