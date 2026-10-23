export type RowAwareField = {
  id: string;
  row?: string;
  fullWidth?: boolean;
};

/** Aynı `row` anahtarına sahip ardışık alanları tek satırda tutar. */
export function packFieldRows<T extends RowAwareField>(fields: T[]): T[][] {
  const packs: T[][] = [];
  let index = 0;

  while (index < fields.length) {
    const current = fields[index];
    if (current.row) {
      const pack: T[] = [current];
      index += 1;
      while (index < fields.length && fields[index].row === current.row) {
        pack.push(fields[index]);
        index += 1;
      }
      packs.push(pack);
      continue;
    }
    packs.push([current]);
    index += 1;
  }

  return packs;
}
