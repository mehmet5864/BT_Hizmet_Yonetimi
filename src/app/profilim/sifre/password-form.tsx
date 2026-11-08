"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionFeedback } from "@/lib/action-feedback";
import { changeOwnPassword } from "@/lib/actions/password";
import { EMPTY_STATE } from "@/lib/actions/shared";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, EMPTY_STATE);
  useActionFeedback(state);

  return (
    <form action={action} className="space-y-4">
      {state.message && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <FieldShell id="pw-current" label="Mevcut parola" required>
        <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
      </FieldShell>
      <FieldShell id="pw-next" label="Yeni parola" required>
        <Input id="pw-next" name="next" type="password" autoComplete="new-password" required />
      </FieldShell>
      <FieldShell id="pw-confirm" label="Yeni parola (tekrar)" required>
        <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" required />
      </FieldShell>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        Parolayı değiştir
      </Button>
    </form>
  );
}
