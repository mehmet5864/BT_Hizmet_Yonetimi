"use client";

import { Loader2, Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPTY_STATE, type ActionState } from "@/lib/actions/shared";

type FieldSpec = { name: string; placeholder: string; required?: boolean };

export function CatalogForm({
  action,
  fields,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: FieldSpec[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      {fields.map((field) => (
        <Input
          key={field.name}
          name={field.name}
          placeholder={field.placeholder}
          required={field.required}
          className="w-full sm:w-auto sm:min-w-40 sm:flex-1"
          aria-label={field.placeholder}
        />
      ))}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {submitLabel}
      </Button>
    </form>
  );
}
