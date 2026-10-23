export type PersonRef = {
  id: string;
  label: string;
  meta?: string;
  departmentId?: string | null;
  unitManagerId?: string | null;
  parentDepartmentId?: string | null;
  parentManagerId?: string | null;
  requestOffice?: string | null;
};

export type DepartmentRef = {
  id: string;
  label: string;
  meta?: string;
  managerId?: string | null;
  parentId?: string | null;
  parentManagerId?: string | null;
};

type PersonFill = {
  department?: string[];
  manager?: string[];
  parentDepartment?: string[];
  parentManager?: string[];
  office?: string[];
};

type DeptFill = {
  manager?: string[];
  parentDepartment?: string[];
  parentManager?: string[];
};

/** Kişi alanı → formda varsa doldurulacak kardeş alanlar. */
const PERSON_FILL: Record<string, PersonFill> = {
  requesterId: {
    department: ["requestingDeptId", "departmentId"],
    manager: ["requestingManagerId"],
  },
  ownerId: {
    department: ["departmentId"],
    manager: ["managerId"],
  },
  assetOwnerId: {
    department: ["departmentId"],
    manager: ["managerId"],
  },
  l2AnalystId: {
    office: ["targetOffice"],
  },
};

/** Birim alanı → amir / üst birim. */
const DEPT_FILL: Record<string, DeptFill> = {
  requestingDeptId: { manager: ["requestingManagerId"] },
  handlingDeptId: { manager: ["handlingManagerId"] },
  departmentId: {
    manager: ["unitManagerId", "managerId"],
    parentDepartment: ["parentDepartmentId"],
    parentManager: ["parentManagerId"],
  },
  parentDepartmentId: { manager: ["parentManagerId"] },
};

function asId(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function assignIfPresent(out: Record<string, string>, present: Set<string>, keys: string[] | undefined, value: string) {
  if (!value || !keys?.length) return;
  for (const key of keys) {
    if (present.has(key)) out[key] = value;
  }
}

export function refString(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return "";
  return String(value);
}

export function seedRefValues(values: Record<string, unknown>, presentFields: Set<string>): Record<string, string> {
  const refs: Record<string, string> = {};
  for (const key of presentFields) {
    const raw = values[key];
    if (raw == null || raw === "") continue;
    if (raw instanceof Date) continue;
    refs[key] = String(raw);
  }
  return refs;
}

export function applyRelatedFills({
  changedField,
  changedId,
  kind,
  presentFields,
  people,
  departments,
}: {
  changedField: string;
  changedId: string;
  kind: "person" | "department";
  presentFields: Set<string>;
  people: PersonRef[];
  departments: DepartmentRef[];
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (!changedId) return out;

  if (kind === "person") {
    const person = people.find((item) => item.id === changedId);
    if (!person) return out;
    const map = PERSON_FILL[changedField];
    if (!map) return out;
    const dept = departments.find((item) => item.id === person.departmentId);
    const manager = asId(person.unitManagerId) || asId(dept?.managerId);
    assignIfPresent(out, presentFields, map.department, asId(person.departmentId));
    assignIfPresent(out, presentFields, map.manager, manager);
    assignIfPresent(
      out,
      presentFields,
      map.parentDepartment,
      asId(person.parentDepartmentId) || asId(dept?.parentId),
    );
    assignIfPresent(
      out,
      presentFields,
      map.parentManager,
      asId(person.parentManagerId) || asId(dept?.parentManagerId),
    );
    assignIfPresent(out, presentFields, map.office, asId(person.requestOffice));
    return out;
  }

  const dept = departments.find((item) => item.id === changedId);
  if (!dept) return out;
  const map = DEPT_FILL[changedField];
  if (!map) return out;
  const parent = departments.find((item) => item.id === dept.parentId);
  assignIfPresent(out, presentFields, map.manager, asId(dept.managerId));
  assignIfPresent(out, presentFields, map.parentDepartment, asId(dept.parentId));
  assignIfPresent(
    out,
    presentFields,
    map.parentManager,
    asId(dept.parentManagerId) || asId(parent?.managerId),
  );
  return out;
}

export function initialRelatedValues({
  values,
  presentFields,
  people,
  departments,
}: {
  values: Record<string, unknown>;
  presentFields: Set<string>;
  people: PersonRef[];
  departments: DepartmentRef[];
}): Record<string, string> {
  const refs = seedRefValues(values, presentFields);
  const applyKind = (kind: "person" | "department") => {
    for (const [field, id] of Object.entries(refs)) {
      if (!id) continue;
      const fills = applyRelatedFills({
        changedField: field,
        changedId: id,
        kind,
        presentFields,
        people,
        departments,
      });
      for (const [key, value] of Object.entries(fills)) {
        if (!refs[key]) refs[key] = value;
      }
    }
  };
  applyKind("person");
  applyKind("department");
  return refs;
}
