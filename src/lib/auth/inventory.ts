import {
  canDirectMutateInventory,
  canEditInventory,
  canProposeInventory,
  canSeeAllInventory,
  canViewAsset,
  inventoryLevel,
  viewerGrantNames,
  visibleAssetWhere,
  type ModuleGrant,
  type ModuleLevel,
} from "@/lib/auth/acl";
import { getViewerAcl } from "@/lib/auth/viewer";
import type { RequestViewer } from "@/lib/itil/request-scope";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings-store";

export type InventoryAccess = {
  viewer: RequestViewer;
  grants: ModuleGrant[];
  level: ModuleLevel | "NONE";
  canView: boolean;
  canSeeAll: boolean;
  canDirectMutate: boolean;
  canPropose: boolean;
  canEdit: boolean;
  canApprove: boolean;
  assetWhere: Record<string, unknown>;
};

export async function getInventoryAccess(): Promise<InventoryAccess | null> {
  const { viewer, grants } = await getViewerAcl();
  if (!viewer) return null;
  const level = inventoryLevel(grants, viewer);
  return {
    viewer,
    grants,
    level,
    canView: level !== "NONE",
    canSeeAll: canSeeAllInventory(level),
    canDirectMutate: canDirectMutateInventory(level),
    canPropose: canProposeInventory(level),
    canEdit: canEditInventory(level),
    canApprove: canDirectMutateInventory(level),
    assetWhere: visibleAssetWhere(viewer, grants),
  };
}

export function viewerCanSeeAsset(
  access: InventoryAccess,
  asset: { ownerId: string; departmentId?: string | null },
) {
  return canViewAsset(access.viewer, access.grants, asset);
}

export function personCanApproveInventory(
  grants: ModuleGrant[],
  person: { role?: string | null; requestOffice?: string | null; adGroups?: string | null; groups?: string[] | null },
) {
  const groups = person.groups ?? viewerGrantNames(person);
  return canDirectMutateInventory(inventoryLevel(grants, { role: person.role, groups }));
}

export async function inventoryApproverIds() {
  const settings = await getSystemSettings();
  const people = await prisma.person.findMany({
    select: { id: true, role: true, requestOffice: true, adGroups: true },
  });
  return people.filter((person) => personCanApproveInventory(settings.acl.grants, person)).map((person) => person.id);
}
