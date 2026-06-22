import type { Metadata } from "next";
import { StoryStreamClient } from "../story-stream-client";

export const metadata: Metadata = {
  title: {
    absolute: "Friends Digest | StoryStream",
  },
  description: "A private StoryStream feed of writing from people you follow.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DigestPage() {
  return <StoryStreamClient view="digest" />;
}
