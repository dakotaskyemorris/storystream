import type { Metadata } from "next";
import { StoryStreamClient } from "../../story-stream-client";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateStaticParams(): Promise<{ username: string }[]> {
  if (process.env.GITHUB_PAGES !== "true") {
    return [];
  }

  return [
    { username: "moon_writer" },
    { username: "forestdreams" },
    { username: "dragonpen" },
  ];
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: {
      absolute: "StoryStream",
    },
    description: `Read writing and profile updates from @${username} on StoryStream.`,
    alternates: {
      canonical: `/profile/${encodeURIComponent(username)}`,
    },
  };
}

export default async function ProfilePage({
  params,
}: ProfilePageProps) {
  const { username } = await params;
  return <StoryStreamClient view="profile" username={username} />;
}
