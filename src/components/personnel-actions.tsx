"use client";

import Link from "next/link";
import { ChevronDown, Plus, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PersonnelActions({ canAdd = true }: { canAdd?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          Personel işlemleri
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {canAdd ? (
          <DropdownMenuItem asChild>
            <Link href="/personel/yeni">
              <Plus className="size-4" />
              Personel ekle
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/personel/hareketler">
            <ScrollText className="size-4" />
            Hareketlerim
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
