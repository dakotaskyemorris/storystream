import type { Metadata } from "next";
import { StoryStreamClient } from "./story-stream-client";

export const metadata: Metadata = {
  title: {
    absolute: "StoryStream",
  },
  description:
    "StoryStream is a creative community for writers, readers, dreamers, and storytellers.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <StoryStreamClient view="home" />;
}
