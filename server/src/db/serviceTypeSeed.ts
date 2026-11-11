/** Canonical catalog seed — single source for migrate + runtime seed. */
export const SERVICE_TYPE_SEED: ReadonlyArray<{
  code: string;
  label: string;
  title: string;
  sortOrder: number;
}> = [
  { code: "manicure", label: "Маникюр", title: "мастер маникюра", sortOrder: 1 },
  { code: "brows", label: "Брови", title: "мастер бровей", sortOrder: 2 },
  { code: "lashes", label: "Ресницы", title: "мастер ресниц", sortOrder: 3 },
  { code: "hair", label: "Волосы", title: "мастер по волосам", sortOrder: 4 },
  { code: "makeup", label: "Макияж", title: "визажист", sortOrder: 5 },
];

export const SERVICE_TYPE_CODES = new Set(
  SERVICE_TYPE_SEED.map((s) => s.code),
);
