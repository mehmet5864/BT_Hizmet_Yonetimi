import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyActivityPage({ searchParams }: PageProps<"/hareketler">) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw) query.set(key, raw);
  }
  const qs = query.toString();
  redirect(qs ? `/personel/hareketler?${qs}` : "/personel/hareketler");
}
