"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, FileText, TriangleAlert } from "lucide-react";

import { ReferenceSelect, type RefOption } from "@/components/form-fields/reference-select";
import { FieldShell } from "@/components/form-fields/field-shell";
import { useT } from "@/components/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export type ZimmetAssetOption = {
  id: string;
  label: string;
  ownerId: string;
  ownerLabel: string;
  custody?: string;
  meta?: string;
};

export function ZimmetFormPanel({
  people,
  assets,
  initialPersonId = "",
  initialAssetIds = [],
}: {
  people: RefOption[];
  assets: ZimmetAssetOption[];
  initialPersonId?: string;
  initialAssetIds?: string[];
}) {
  const [personId, setPersonId] = useState(initialPersonId);
  const [selected, setSelected] = useState<string[]>(() => {
    if (!initialPersonId) return [];
    const owned = assets
      .filter((asset) => asset.ownerId === initialPersonId && asset.custody !== "FREE")
      .map((asset) => asset.id);
    const wanted = initialAssetIds.filter((id) => owned.includes(id));
    return wanted.length ? wanted : owned;
  });

  const personAssets = useMemo(
    () => (personId ? assets.filter((asset) => asset.ownerId === personId && asset.custody !== "FREE") : []),
    [assets, personId],
  );
  const selectedPerson = people.find((person) => person.id === personId);
  const foreignRequested = useMemo(() => {
    if (!personId) return [];
    return initialAssetIds
      .map((id) => assets.find((asset) => asset.id === id))
      .filter((asset): asset is ZimmetAssetOption => Boolean(asset && asset.ownerId !== personId));
  }, [assets, initialAssetIds, personId]);

  const ready = Boolean(personId && selected.length);
  const t = useT();

  const toggle = (id: string, on: boolean) => {
    setSelected((prev) => (on ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
  };

  const selectPerson = (id: string) => {
    setPersonId(id);
    setSelected(id ? assets.filter((asset) => asset.ownerId === id && asset.custody !== "FREE").map((asset) => asset.id) : []);
  };

  const href = (format: "pdf" | "docx") => {
    const params = new URLSearchParams({ format, personId });
    selected.forEach((id) => params.append("assetIds", id));
    return `/api/envanter/zimmet?${params.toString()}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("form.zimmetTitle")}</CardTitle>
        <CardDescription>
          {t("form.zimmetHint")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Alert>
          <TriangleAlert />
          <AlertTitle>{t("form.zimmetWarnTitle")}</AlertTitle>
          <AlertDescription>
            {t("form.zimmetWarnBody")}
          </AlertDescription>
        </Alert>

        <FieldShell label={t("form.zimmetPerson")} required hint={t("form.zimmetPersonHint")}>
          <ReferenceSelect
            name="personId"
            entity="person"
            options={people}
            value={personId}
            allowCreate={false}
            onValueChange={selectPerson}
            placeholder={t("form.zimmetSelectPerson")}
            emptyLabel={t("form.zimmetPersonEmpty")}
          />
        </FieldShell>

        {foreignRequested.length ? (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>{t("form.zimmetForeignTitle")}</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {foreignRequested.map((asset) => (
                  <li key={asset.id}>
                    <Link href={`/envanter/${asset.id}/duzenle`} className="font-medium">
                      {asset.label}
                    </Link>{" "}
                    {t("form.zimmetOwnedBy", { name: asset.ownerLabel })}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {!personId ? (
          <p className="text-muted-foreground text-sm">{t("form.zimmetPickFirst")}</p>
        ) : !personAssets.length ? (
          <p className="text-muted-foreground text-sm">
            {t("form.zimmetNone", { name: selectedPerson?.label ?? t("form.zimmetPerson") })}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {t("form.zimmetList")}
                <span className="text-muted-foreground font-normal"> · {t("form.zimmetSelected", { selected: selected.length, total: personAssets.length })}</span>
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(personAssets.map((row) => row.id))}>
                  {t("form.zimmetSelectAll")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>
                  {t("form.zimmetClear")}
                </Button>
              </div>
            </div>
            <ul className="divide-y rounded-lg border">
              {personAssets.map((asset) => {
                const checked = selected.includes(asset.id);
                return (
                  <li key={asset.id}>
                    <label className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggle(asset.id, value === true)}
                      />
                      <span className="min-w-0 flex-1 truncate">{asset.label}</span>
                      {asset.meta ? <span className="text-muted-foreground shrink-0 text-xs">{asset.meta}</span> : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {ready ? (
            <>
              <Button asChild>
                <a href={href("pdf")}>
                  <FileDown className="size-4" />
                  {t("form.zimmetPdf")}
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={href("docx")}>
                  <FileText className="size-4" />
                  {t("form.zimmetWord")}
                </a>
              </Button>
            </>
          ) : (
            <>
              <Button disabled>
                <FileDown className="size-4" />
                {t("form.zimmetPdf")}
              </Button>
              <Button variant="outline" disabled>
                <FileText className="size-4" />
                {t("form.zimmetWord")}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
