import type { Metadata } from "next";
import { StoryStreamClient } from "../story-stream-client";

export const metadata: Metadata = {
  title: {
    absolute: "StoryStream",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ModerationPage() {
  return <StoryStreamClient view="moderation" />;
}
