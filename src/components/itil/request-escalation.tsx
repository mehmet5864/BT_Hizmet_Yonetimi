"use client";

import { useActionState } from "react";
import { ArrowUpRight, Layers, Shuffle } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/lib/action-feedback";
import { escalateRequest, resolveEscalation } from "@/lib/actions/escalation";
import { EMPTY_STATE } from "@/lib/actions/shared";
import { LAYER2_OFFICES } from "@/lib/auth/acl";
import { REQUEST_OFFICES } from "@/lib/itil/request-types";
import { useOfficeNames } from "@/components/office-names-provider";

type DeptOption = { id: string; label: string };

export function RequestEscalationForm({
  requestId,
  currentOffice,
  departments,
  canResolve,
  showLayer2 = false,
}: {
  requestId: string;
  currentOffice: string;
  departments: DeptOption[];
  canResolve: boolean;
  showLayer2?: boolean;
}) {
  const [escalateState, escalateAction, escalatePending] = useActionState(escalateRequest, EMPTY_STATE);
  const [resolveState, resolveAction, resolvePending] = useActionState(resolveEscalation, EMPTY_STATE);
  const officeNames = useOfficeNames();

  return (
    <div className={showLayer2 ? "grid gap-4 lg:grid-cols-3" : "grid gap-4 lg:grid-cols-2"}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shuffle className="size-4" />
            Yanlış birime gitti
          </CardTitle>
          <CardDescription>
            Talep yanlış şubeye düştüyse doğru ofise aktarın. Önceki şube kaydı saklanır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={escalateAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={requestId} />
            <input type="hidden" name="kind" value="MISROUTED" />
            <FieldShell
              id="targetOffice"
              label="Doğru şube"
              required
              tooltip="Talebin işlenmesi gereken şube. Önceki ofis kaydı saklanır."
            >
              <select
                id="targetOffice"
                name="targetOffice"
                required
                className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Şube seçiniz
                </option>
                {REQUEST_OFFICES.filter((office) => office !== currentOffice).map((office) => (
                  <option key={office} value={office}>
                    {officeNames[office].label}
                  </option>
                ))}
              </select>
            </FieldShell>
            <FieldShell
              id="misroute-reason"
              label="Gerekçe"
              required
              tooltip="Neden yanlış birime düştüğünü kısaca yazın. Denetim kaydına işlenir."
            >
              <Textarea id="misroute-reason" name="reason" rows={3} required placeholder="Neden yanlış birime düştüğünü yazın." />
            </FieldShell>
            {escalateState.message && !escalateState.ok ? (
              <Alert variant="destructive">
                <AlertDescription>{escalateState.message}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={escalatePending}>
              Doğru birime aktar
            </Button>
          </form>
        </CardContent>
      </Card>

      {showLayer2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4" />
              Katman 2 / uzman birim
            </CardTitle>
            <CardDescription>
              Servis masasının aşamadığı arıza ve hizmet talebini ilgili şubeye aktarın. Kayıt servis masası
              kuyruğundan çıkar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={escalateAction} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={requestId} />
              <input type="hidden" name="kind" value="LAYER2" />
              <FieldShell
                id="layer2Office"
                label="Uzman birim"
                required
                tooltip="Sistem, network, siber, yazılım veya veritabanı şubesi. Aktarılan talep yalnızca o birimde görünür."
              >
                <select
                  id="layer2Office"
                  name="targetOffice"
                  required
                  className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Şube seçiniz
                  </option>
                  {LAYER2_OFFICES.filter((office) => office !== currentOffice).map((office) => (
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
                tooltip="Neden birinci katmanın yetmediğini yazın. Denetim kaydına işlenir."
              >
                <Textarea
                  id="layer2-reason"
                  name="reason"
                  rows={3}
                  required
                  placeholder="Uzman birimin devreye girmesi gereken nedeni yazın."
                />
              </FieldShell>
              {escalateState.message && !escalateState.ok ? (
                <Alert variant="destructive">
                  <AlertDescription>{escalateState.message}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" disabled={escalatePending}>
                Katman 2’ye aktar
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpRight className="size-4" />
            Üst birime yükselt
          </CardTitle>
          <CardDescription>
            İşlemin üst birim / üst amir tarafından yapılacağını belirtin. Kritik talepler otomatik işaretlenir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={escalateAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={requestId} />
            <input type="hidden" name="kind" value="UPPER_UNIT" />
            <FieldShell
              id="escalatedDeptId"
              label="Üst birim"
              tooltip="İşlemi üst birim / üst amir yürütecekse seçin. Boş bırakılırsa genel yükseltme işaretlenir."
            >
              <select
                id="escalatedDeptId"
                name="escalatedDeptId"
                className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                defaultValue=""
              >
                <option value="">Üst birim seçiniz</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.label}
                  </option>
                ))}
              </select>
            </FieldShell>
            <FieldShell
              id="upper-reason"
              label="Gerekçe"
              required
              tooltip="Neden üst birimin devreye girmesi gerektiğini yazın. Kritik talepler otomatik işaretlenir."
            >
              <Textarea id="upper-reason" name="reason" rows={3} required placeholder="Neden üst birimin devreye girmesi gerektiğini yazın." />
            </FieldShell>
            {escalateState.message && !escalateState.ok ? (
              <Alert variant="destructive">
                <AlertDescription>{escalateState.message}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={escalatePending}>
              Üst birime yükselt
            </Button>
          </form>
        </CardContent>
      </Card>

      {canResolve ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Yükseltme kararı</CardTitle>
            <CardDescription>Üst amir veya yönetici talebi devralabilir ya da birime iade edebilir.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={resolveAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <input type="hidden" name="id" value={requestId} />
              <FieldShell
                id="decision"
                label="Karar"
                required
                tooltip="Üst birim aldı: kuyruk üst ofise geçer. Birime iade: önceki şubeye döner."
              >
                <select
                  id="decision"
                  name="decision"
                  required
                  className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Seçiniz
                  </option>
                  <option value="ACCEPTED">Üst birim aldı</option>
                  <option value="REJECTED">Birime iade et</option>
                </select>
              </FieldShell>
              <FieldShell id="note" label="Not" tooltip="Kararın gerekçesi. Denetim kaydına yazılır.">
                <Input id="note" name="note" placeholder="İsteğe bağlı açıklama" />
              </FieldShell>
              <Button type="submit" disabled={resolvePending}>
                Kararı kaydet
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
