"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { KanbanSquare, Loader2, Pencil, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteRecord, type DeleteKind } from "@/lib/actions/delete-record";
import { useActionFeedback } from "@/lib/action-feedback";
import { EMPTY_STATE } from "@/lib/actions/shared";

export function RecordDeleteButton({
  kind,
  id,
  label,
}: {
  kind: DeleteKind;
  id: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteRecord, EMPTY_STATE);
  useActionFeedback(state);

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        Sil
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kaydı silmek istiyor musunuz?</DialogTitle>
            <DialogDescription>
              <strong>{label}</strong> kalıcı olarak silinecek. Bu işlem yalnızca süper yönetici
              tarafından yapılır ve geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          {state.message && !state.ok && !state.message.includes("NEXT_") ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <form action={action}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Sil
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DetailActions({
  editHref,
  canDelete,
  kind,
  id,
  label,
  agileType,
}: {
  editHref?: string;
  canDelete: boolean;
  kind: DeleteKind;
  id: string;
  label: string;
  /** ITIL kaynak türü (INCIDENT, PROBLEM…) verilirse "Çevik iş aç" düğmesi çıkar */
  agileType?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {editHref ? (
        <Button asChild>
          <Link href={editHref}>
            <Pencil className="size-4" />
            Düzenle
          </Link>
        </Button>
      ) : null}
      {agileType ? (
        <Button asChild variant="outline">
          <Link href={`/cevik/is/yeni?kaynak=${agileType}&kid=${id}`}>
            <KanbanSquare className="size-4" />
            Çevik iş aç
          </Link>
        </Button>
      ) : null}
      {canDelete ? <RecordDeleteButton kind={kind} id={id} label={label} /> : null}
    </div>
  );
}
