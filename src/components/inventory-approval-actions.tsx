"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionFeedback } from "@/lib/action-feedback";
import { decideInventoryApproval } from "@/lib/actions/inventory-approval";
import { EMPTY_STATE } from "@/lib/actions/shared";

export function InventoryApprovalActions({ id }: { id: string }) {
  const [state, action, pending] = useActionState(decideInventoryApproval, EMPTY_STATE);
  useActionFeedback(state);

  return (
    <form action={action} className="flex min-w-56 flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <Input name="note" placeholder="Not (reddetmede gerekçe zorunlu)" className="h-8" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="APPROVED" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Onayla
        </Button>
        <Button type="submit" name="decision" value="REJECTED" size="sm" variant="outline" disabled={pending}>
          Reddet
        </Button>
      </div>
    </form>
  );
}
