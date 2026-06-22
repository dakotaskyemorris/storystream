import type { MetadataRoute } from "next";
import { getSiteUrl } from "./site";

export const dynamic = "force-static";

const routes = [
  { path: "/", priority: 1 },
  { path: "/discover", priority: 0.9 },
  { path: "/books", priority: 0.8 },
  { path: "/safety", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}
