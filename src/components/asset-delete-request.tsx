"use client";

import { useActionState, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/lib/action-feedback";
import { requestAssetDelete } from "@/lib/actions/assets";
import { EMPTY_STATE } from "@/lib/actions/shared";

export function AssetDeleteRequestButton({
  id,
  name,
  immediate = false,
}: {
  id: string;
  name: string;
  immediate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestAssetDelete, EMPTY_STATE);
  useActionFeedback(state);

  return (
    <>
      <Button type="button" variant={immediate ? "destructive" : "outline"} onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        {immediate ? "Sil" : "Silme iste"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{immediate ? "Kaydı silmek istiyor musunuz?" : "Silme onayı isteyin"}</DialogTitle>
            <DialogDescription>
              {immediate ? (
                <>
                  <strong>{name}</strong> kalıcı olarak silinecek.
                </>
              ) : (
                <>
                  <strong>{name}</strong> için silme isteği envanter yöneticisine veya süper yöneticiye gider.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {state.message && !state.ok ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            {!immediate ? (
              <Textarea name="reason" rows={3} placeholder="İsteğe bağlı gerekçe" />
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {immediate ? "Sil" : "Onaya gönder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
