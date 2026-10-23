import { z } from "zod";

import { ASSET_TYPES, type AssetTypeKey } from "./constants";
import { getFieldsFor } from "./asset-types";
import type { FieldDef } from "./fields";

const IPV4 =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const MAC = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

function fieldSchema(field: FieldDef): z.ZodTypeAny {
  switch (field.kind) {
    case "date":
      return z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Geçerli bir tarih giriniz.")
        .transform((value) => (value ? value : undefined));

    case "select": {
      const values = (field.options ?? []).map((option) => option.value);
      const base = z.string().trim().optional();
      return base
        .refine((value) => !value || values.includes(value), "Geçersiz seçim.")
        .refine((value) => !field.required || !!value, `${field.label} zorunludur.`)
        .transform((value) => (value ? value : undefined));
    }

    case "person":
    case "department":
    case "vendor":
      return z
        .string()
        .trim()
        .optional()
        .refine((value) => !field.required || !!value, `${field.label} zorunludur.`)
        .transform((value) => (value ? value : undefined));

    case "assetRefs":
    case "serviceRefs":
      return z.array(z.string().trim().min(1)).optional().default([]);

    case "location":
      return z
        .object({
          locRoom: z.coerce.number().int().positive().optional(),
          locCorridor: z.coerce.number().int().positive().optional(),
          locCabinet: z.coerce.number().int().positive().optional(),
          locShelf: z.coerce.number().int().positive().optional(),
        })
        .optional();

    case "image":
      return optionalText;

    default: {
      let schema = z.string().trim();
      if (field.id === "ipAddress") {
        return schema
          .optional()
          .refine((value) => !value || IPV4.test(value), "Geçerli bir IPv4 adresi giriniz.")
          .transform((value) => (value ? value : undefined));
      }
      if (field.id === "macAddress") {
        return schema
          .optional()
          .refine((value) => !value || MAC.test(value), "MAC adresi AA:BB:CC:DD:EE:FF biçiminde olmalıdır.")
          .transform((value) => (value ? value : undefined));
      }
      if (field.required) {
        schema = schema.min(1, `${field.label} zorunludur.`);
        return schema;
      }
      return schema.optional().transform((value) => (value ? value : undefined));
    }
  }
}

/** Türe göre dinamik doğrulama şeması üretir. */
export function buildAssetSchema(assetType: AssetTypeKey) {
  const shape: Record<string, z.ZodTypeAny> = {
    assetType: z.literal(assetType),
  };

  for (const field of getFieldsFor(assetType)) {
    if (field.kind === "location") {
      shape.locRoom = z.coerce.number().int().min(0).optional();
      shape.locCorridor = z.coerce.number().int().min(0).optional();
      shape.locCabinet = z.coerce.number().int().min(0).optional();
      shape.locShelf = z.coerce.number().int().min(0).optional();
      continue;
    }
    if (field.kind === "image") {
      shape.imageUrl = optionalText;
      continue;
    }
    if (field.kind === "person") {
      shape.ownerId = fieldSchema(field);
      continue;
    }
    if (field.kind === "department") {
      shape.departmentId = fieldSchema(field);
      continue;
    }
    if (field.kind === "vendor") {
      shape[`${field.id}Id`] = fieldSchema(field);
      continue;
    }
    shape[field.id] = fieldSchema(field);
  }

  return z.object(shape);
}

export const assetTypeSchema = z.enum(ASSET_TYPES);
