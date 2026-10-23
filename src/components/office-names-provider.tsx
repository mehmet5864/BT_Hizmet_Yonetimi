"use client";

import { createContext, useContext } from "react";

import { defaultOfficeNames, officeLabel, officeNavLabel, type OfficeNames } from "@/lib/itil/office-names";

const OfficeNamesContext = createContext<OfficeNames>(defaultOfficeNames());

export function OfficeNamesProvider({
  names,
  children,
}: {
  names?: OfficeNames | null;
  children: React.ReactNode;
}) {
  return <OfficeNamesContext.Provider value={names ?? defaultOfficeNames()}>{children}</OfficeNamesContext.Provider>;
}

export function useOfficeNames() {
  return useContext(OfficeNamesContext);
}

export function useOfficeLabel(office: string | null | undefined) {
  return officeLabel(office, useOfficeNames());
}

export function useOfficeNavLabel(office: string | null | undefined) {
  return officeNavLabel(office, useOfficeNames());
}
