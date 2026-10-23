"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/lib/action-feedback";
import { approveInboxItem } from "@/lib/actions/inbox";
import { EMPTY_STATE } from "@/lib/actions/shared";

/** Onayla doğrudan gönderilir; Reddet seçilince zorunlu gerekçe kutusu açılır. */
export function ApproveRejectForm({
  id,
  kind,
  approveLabel,
  rejectLabel,
  size = "sm",
  onDone,
}: {
  id: string;
  kind: string;
  approveLabel: string;
  rejectLabel: string;
  size?: "sm" | "default";
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(approveInboxItem, EMPTY_STATE);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  useActionFeedback(state);

  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="flex w-full flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      {rejecting ? (
        <>
          <Textarea
            name="reason"
            rows={3}
            required
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reddetme gerekçesi (zorunlu)"
            aria-label="Reddetme gerekçesi"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="decision" value="REJECTED" size={size} variant="destructive" disabled={pending || !reason.trim()}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Reddi onayla
            </Button>
            <Button type="button" size={size} variant="ghost" disabled={pending} onClick={() => setRejecting(false)}>
              Vazgeç
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="decision" value="APPROVED" size={size} disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {approveLabel}
          </Button>
          <Button type="button" size={size} variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
            {rejectLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
