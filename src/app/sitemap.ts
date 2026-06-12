import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heykai.vercel.app";
const routes = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/app", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/pricing", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/testers", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/support", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.4 },
  { path: "/changelog", changeFrequency: "monthly" as const, priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
