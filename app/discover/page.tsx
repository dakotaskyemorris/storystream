import type { Metadata } from "next";
import { StoryStreamClient } from "../story-stream-client";

export const metadata: Metadata = {
  title: {
    absolute: "StoryStream",
  },
  description:
    "Explore fresh stories, poems, journals, fantasy, sci-fi, and adventure writing from the StoryStream community.",
  alternates: {
    canonical: "/discover",
  },
};

export default function DiscoverPage() {
  return <StoryStreamClient view="discover" />;
}
