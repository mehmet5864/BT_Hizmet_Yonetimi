"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil } from "lucide-react";

import { RecordDeleteButton } from "@/components/record-delete";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateLifecycleStatus } from "@/lib/actions/assets";
import { LIFECYCLE_STATUSES, LIFECYCLE_STATUS_LABELS } from "@/lib/inventory/constants";
import { AssetDeleteRequestButton } from "@/components/asset-delete-request";

export function AssetActions({
  id,
  name,
  status,
  editHref,
  canDelete,
  canMutate = true,
  canRequestDelete = false,
  canDirectDelete = false,
}: {
  id: string;
  name: string;
  status: string;
  editHref: string;
  canDelete?: boolean;
  canMutate?: boolean;
  canRequestDelete?: boolean;
  canDirectDelete?: boolean;
}) {
  if (!canMutate && !canDelete && !canRequestDelete && !canDirectDelete) return null;
  return (
    <>
      {canMutate ? (
        <Button variant="outline" asChild>
          <Link href={editHref}>
            <Pencil className="size-4" />
            Düzenle
          </Link>
        </Button>
      ) : null}
      {canDelete ? <RecordDeleteButton kind="asset" id={id} label={name} /> : null}
      {!canDelete && canDirectDelete ? <AssetDeleteRequestButton id={id} name={name} immediate /> : null}
      {!canDelete && !canDirectDelete && canRequestDelete ? <AssetDeleteRequestButton id={id} name={name} /> : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Diğer işlemler">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Yaşam döngüsü durumu</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={status}>
            {LIFECYCLE_STATUSES.map((value) => (
              <form key={value} action={updateLifecycleStatus}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="status" value={value} />
                <DropdownMenuRadioItem
                  value={value}
                  onSelect={(event) => {
                    event.preventDefault();
                    (event.currentTarget as HTMLElement).closest("form")?.requestSubmit();
                  }}
                >
                  {LIFECYCLE_STATUS_LABELS[value]}
                </DropdownMenuRadioItem>
              </form>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
