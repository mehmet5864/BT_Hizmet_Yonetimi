"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ActionState } from "@/lib/actions/shared";

export function useActionFeedback(state: ActionState) {
  const router = useRouter();

  useEffect(() => {
    if (!state.message && !state.redirectTo) return;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      router.refresh();
      if (state.redirectTo) router.push(state.redirectTo);
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state.ok, state.message, state.redirectTo, state.stamp, router]);
}
