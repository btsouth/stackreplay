import { redirect } from "next/navigation";
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value])
      query.append(key, v);
  redirect(`/app/recap${query.size ? `?${query}` : ""}`);
}
