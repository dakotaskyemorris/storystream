import type { Metadata } from "next";
import { StoryStreamClient } from "../story-stream-client";

export const metadata: Metadata = {
  title: {
    absolute: "StoryStream",
  },
  description:
    "Read serial books, chapters, and long-form writing shared by StoryStream authors.",
  alternates: {
    canonical: "/books",
  },
};

export default function BooksPage() {
  return <StoryStreamClient view="books" />;
}
