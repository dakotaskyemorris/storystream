import type { MetadataRoute } from "next";
import { getSiteUrl } from "./site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/digest", "/moderation", "/studio"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
