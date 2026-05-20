import { getSite } from "@/lib/site/getSite";

export default async function AdminPage() {
  const site = await getSite();
  return (
    <p>Admin pull-through OK. Title: <strong>{site.meta.title}</strong></p>
  );
}
