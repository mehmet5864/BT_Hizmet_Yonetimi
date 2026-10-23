"use client";

import { useState, useTransition } from "react";
import { Loader2, Radar } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { pullVulnerabilitiesFromScanner } from "@/lib/actions/scanner";
import { EMPTY_STATE, type ActionState } from "@/lib/actions/shared";

export function ScannerPullButton() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>(EMPTY_STATE);

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {state.message ? (
        <Alert variant={state.ok ? "default" : "destructive"} className="max-w-xl">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setState(await pullVulnerabilitiesFromScanner());
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
        Tarayıcıdan çek
      </Button>
    </div>
  );
}
