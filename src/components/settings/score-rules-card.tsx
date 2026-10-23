"use client";

import { useActionState, useEffect } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveScoreRules } from "@/lib/actions/settings";
import { EMPTY_STATE } from "@/lib/actions/shared";
import {
  SCORE_ACTION_LABELS,
  SCORE_ACTIONS,
  SCORE_MODULES,
  SCORE_SEVERITIES,
  SCORE_SEVERITY_LABELS,
} from "@/lib/scoring-defs";

export function ScoreRulesCard({ points, canEdit }: { points: Record<string, number>; canEdit: boolean }) {
  const [state, action, pending] = useActionState(saveScoreRules, EMPTY_STATE);
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.message, state.ok, state.stamp]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Puanlama</CardTitle>
        <CardDescription>
          Personelin yaptığı her iş için verilecek puan. Giriş, güncelleme ve tamamlama (kapatma) için önem derecesine göre ayrı ayrı belirlenir.
          Negatif puan da girilebilir (örn. -5: puan düşürür). Puanlar işlem anında deftere yazılır; değişiklik yalnızca sonraki işlemlere uygulanır. Sonuçlar Personel sayfasındaki kişi kartlarında görünür.
          {canEdit ? "" : " Bu sekmeyi yalnızca süper yönetici düzenleyebilir."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          {SCORE_MODULES.map((mod) => (
            <div key={mod.key} className="space-y-2">
              <p className="text-sm font-medium">
                {mod.label}
                {mod.ticket ? <span className="text-muted-foreground ml-2 text-xs font-normal">çağrı sayacına dahil</span> : null}
              </p>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">İşlem</th>
                      {SCORE_SEVERITIES.map((sev) => (
                        <th key={sev} className="w-24 px-2 py-1.5 font-medium">
                          {SCORE_SEVERITY_LABELS[sev]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {SCORE_ACTIONS.map((act) => (
                      <tr key={act}>
                        <td className="px-3 py-1.5">{SCORE_ACTION_LABELS[act]}</td>
                        {SCORE_SEVERITIES.map((sev) => {
                          const key = `p|${mod.key}|${act}|${sev}`;
                          return (
                            <td key={sev} className="px-2 py-1">
                              <Input
                                name={key}
                                type="number"
                                min={-10000}
                                max={10000}
                                step={1}
                                defaultValue={points[`${mod.key}|${act}|${sev}`]}
                                disabled={!canEdit}
                                aria-label={`${mod.label} ${SCORE_ACTION_LABELS[act]} ${SCORE_SEVERITY_LABELS[sev]}`}
                                className="h-8 w-20 tabular-nums"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Kaydet
              </Button>
              <Button
                type="submit"
                variant="outline"
                name="reset"
                value="1"
                disabled={pending}
                formNoValidate
                onClick={(event) => {
                  if (!window.confirm("Tüm puanlar varsayılana döndürülsün mü?")) event.preventDefault();
                }}
              >
                <RotateCcw className="size-4" />
                Varsayılana döndür
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
