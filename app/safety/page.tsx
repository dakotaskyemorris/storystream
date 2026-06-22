import type { Metadata } from "next";
import { StoryStreamClient } from "../story-stream-client";

export const metadata: Metadata = {
  title: {
    absolute: "StoryStream",
  },
  description:
    "Learn how StoryStream supports privacy, reporting, blocking, muting, and safer creative sharing.",
  alternates: {
    canonical: "/safety",
  },
};

export default function SafetyPage() {
  return <StoryStreamClient view="safety" />;
}
