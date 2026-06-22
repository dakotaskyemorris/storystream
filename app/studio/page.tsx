import type { Metadata } from "next";
import { StoryStreamClient } from "../story-stream-client";

export const metadata: Metadata = {
  title: {
    absolute: "Writing Studio | StoryStream",
  },
  description: "Create drafts, books, and chapters in StoryStream.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudioPage() {
  return <StoryStreamClient view="studio" />;
}
