"use client";

import { useActionState, useMemo, useState } from "react";
import { Layers } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { ReferenceSelect } from "@/components/form-fields/reference-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/lib/action-feedback";
import { escalateIncident } from "@/lib/actions/itil";
import { EMPTY_STATE } from "@/lib/actions/shared";
import { LAYER2_OFFICES } from "@/lib/auth/acl";
import { applyRelatedFills, type PersonRef } from "@/lib/forms/related-fill";
import { useOfficeNames } from "@/components/office-names-provider";

export function IncidentEscalationForm({
  incidentId,
  people,
}: {
  incidentId: string;
  people: PersonRef[];
}) {
  const [state, action, pending] = useActionState(escalateIncident, EMPTY_STATE);
  useActionFeedback(state);
  const presentFields = useMemo(() => new Set(["l2AnalystId", "targetOffice"]), []);
  const [analystId, setAnalystId] = useState("");
  const [office, setOffice] = useState("SIBER");
  const officeNames = useOfficeNames();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="size-4" />
          Seviye 2’ye gönder
        </CardTitle>
        <CardDescription>
          Seviye 1 analistin aşamadığı olayı uzman analiste aktarın. Kayıt Seviye 2 kuyruğuna geçer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={incidentId} />
          <FieldShell
            id="l2AnalystId"
            label="Seviye 2 analist"
            required
            hint="Olayı devralacak uzman analist."
          >
            <ReferenceSelect
              name="l2AnalystId"
              entity="person"
              options={people}
              value={analystId}
              onValueChange={(id) => {
                const fills = applyRelatedFills({
                  changedField: "l2AnalystId",
                  changedId: id,
                  kind: "person",
                  presentFields,
                  people,
                  departments: [],
                });
                setAnalystId(id);
                const nextOffice = fills.targetOffice;
                if (nextOffice && (LAYER2_OFFICES as readonly string[]).includes(nextOffice)) {
                  setOffice(nextOffice);
                }
              }}
              placeholder="Analist seçin"
              emptyLabel="Personel bulunamadı"
            />
          </FieldShell>
          <FieldShell
            id="targetOffice"
            label="Uzman birim"
            hint="Sistem, network, siber, yazılım veya veritabanı şubesi."
          >
            <select
              id="targetOffice"
              name="targetOffice"
              className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
              value={office}
              onChange={(event) => setOffice(event.target.value)}
            >
              <option value="">Birim seçiniz</option>
              {LAYER2_OFFICES.map((office) => (
                <option key={office} value={office}>
                  {officeNames[office].label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell
            id="layer2-reason"
            label="Gerekçe"
            required
            className="sm:col-span-2"
            hint="Neden Seviye 1’in yetmediğini yazın. Denetim kaydına işlenir."
          >
            <Textarea
              id="layer2-reason"
              name="reason"
              rows={3}
              required
              placeholder="Uzman analistin devreye girmesi gereken nedeni yazın."
            />
          </FieldShell>
          {state.message && !state.ok ? (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              Seviye 2’ye aktar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
