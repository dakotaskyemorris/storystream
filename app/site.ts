export const siteName = "StoryStream";

export const siteDescription =
  "A creative community for writers, readers, dreamers, and storytellers to write privately, share with followers, or publish publicly.";

export function getSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!url) {
    return "http://localhost:3000";
  }

  return url.endsWith("/") ? url.slice(0, -1) : url;
}
