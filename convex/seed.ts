import { mutation } from "./_generated/server";
import {
  PUBLIC_PUBLISH_COST,
  STARTING_TOKENS,
  excerptFrom,
  now,
  slugify,
} from "./model";

export const demo = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", "moon_writer"))
      .unique();
    if (existing) {
      return { seeded: false };
    }

    const timestamp = now();
    const moon = await ctx.db.insert("profiles", {
      userId: null,
      username: "moon_writer",
      displayName: "Moon Writer",
      avatarUrl: "/avatars/moon.png",
      bio: "Writing soft sci-fi, midnight poems, and maps for imaginary cities.",
      favoriteGenres: ["Poetry", "Sci-Fi", "Worldbuilding"],
      tokenBalance: STARTING_TOKENS + 8,
      followersCount: 2,
      followingCount: 1,
      postsCount: 1,
      booksCount: 0,
      writingStreak: 6,
      lastWritingDay: new Date(timestamp).toISOString().slice(0, 10),
      isAdmin: true,
      createdAt: timestamp - 700000,
      updatedAt: timestamp,
    });
    const forest = await ctx.db.insert("profiles", {
      userId: null,
      username: "forestdreams",
      displayName: "Forest Dreams",
      avatarUrl: "/avatars/forest.png",
      bio: "Journals, folklore, and quiet character studies.",
      favoriteGenres: ["Fantasy", "Journals", "Folklore"],
      tokenBalance: STARTING_TOKENS + 4,
      followersCount: 1,
      followingCount: 1,
      postsCount: 1,
      booksCount: 0,
      writingStreak: 3,
      lastWritingDay: new Date(timestamp).toISOString().slice(0, 10),
      isAdmin: false,
      createdAt: timestamp - 600000,
      updatedAt: timestamp,
    });
    const dragon = await ctx.db.insert("profiles", {
      userId: null,
      username: "dragonpen",
      displayName: "Dragon Pen",
      avatarUrl: "/avatars/dragon.png",
      bio: "Serial chapters and heroic adventures, carefully brewed.",
      favoriteGenres: ["Adventure", "Fantasy", "Fan Fiction"],
      tokenBalance: STARTING_TOKENS + 2,
      followersCount: 1,
      followingCount: 2,
      postsCount: 0,
      booksCount: 1,
      writingStreak: 2,
      lastWritingDay: new Date(timestamp).toISOString().slice(0, 10),
      isAdmin: false,
      createdAt: timestamp - 500000,
      updatedAt: timestamp,
    });

    await ctx.db.insert("follows", {
      followerId: forest,
      followingId: moon,
      createdAt: timestamp - 450000,
    });
    await ctx.db.insert("follows", {
      followerId: dragon,
      followingId: moon,
      createdAt: timestamp - 400000,
    });
    await ctx.db.insert("follows", {
      followerId: moon,
      followingId: forest,
      createdAt: timestamp - 350000,
    });

    const storyBody =
      "The city kept its constellations in jars above the train station. Every evening, children lined up to borrow one bright star and carry it home in a paper lantern.";
    const post = await ctx.db.insert("posts", {
      authorId: moon,
      title: "Lanterns for Borrowed Stars",
      slug: slugify("Lanterns for Borrowed Stars", "lanterns"),
      kind: "story",
      body: storyBody,
      excerpt: excerptFrom(storyBody),
      genre: "Sci-Fi",
      tags: ["short story", "city", "stars"],
      visibility: "public",
      commentsMode: "everyone",
      status: "published",
      tokenCost: PUBLIC_PUBLISH_COST,
      likesCount: 18,
      commentsCount: 1,
      publishedAt: timestamp - 280000,
      createdAt: timestamp - 290000,
      updatedAt: timestamp - 280000,
    });

    const poemBody =
      "I put a river in my pocket / and walked until the stones remembered / every name I never said aloud.";
    await ctx.db.insert("posts", {
      authorId: forest,
      title: "Pocket River",
      slug: slugify("Pocket River", "poem"),
      kind: "poem",
      body: poemBody,
      excerpt: excerptFrom(poemBody),
      genre: "Poetry",
      tags: ["river", "memory"],
      visibility: "public",
      commentsMode: "everyone",
      status: "published",
      tokenCost: PUBLIC_PUBLISH_COST,
      likesCount: 9,
      commentsCount: 0,
      publishedAt: timestamp - 220000,
      createdAt: timestamp - 230000,
      updatedAt: timestamp - 220000,
    });

    await ctx.db.insert("comments", {
      authorId: forest,
      postId: post,
      chapterId: null,
      body: "This feels like the first page of a world I want to visit.",
      createdAt: timestamp - 200000,
      updatedAt: timestamp - 200000,
    });

    const book = await ctx.db.insert("books", {
      authorId: dragon,
      title: "Ash Orchard",
      slug: slugify("Ash Orchard", "ash-orchard"),
      description:
        "A young cartographer maps a kingdom where every burned tree becomes a door.",
      coverUrl: null,
      genres: ["Fantasy", "Adventure"],
      visibility: "public",
      status: "published",
      subscribersCount: 37,
      chaptersCount: 2,
      publishedAt: timestamp - 180000,
      createdAt: timestamp - 240000,
      updatedAt: timestamp - 180000,
    });
    await ctx.db.insert("chapters", {
      bookId: book,
      authorId: dragon,
      chapterNumber: 1,
      title: "The Door in the Smoke",
      slug: slugify("The Door in the Smoke", "chapter-1"),
      body: "The first tree burned blue, which meant it was waiting for a question.",
      excerpt: "The first tree burned blue, which meant it was waiting for a question.",
      visibility: "public",
      commentsMode: "everyone",
      status: "published",
      tokenCost: PUBLIC_PUBLISH_COST,
      likesCount: 22,
      commentsCount: 0,
      publishedAt: timestamp - 180000,
      createdAt: timestamp - 190000,
      updatedAt: timestamp - 180000,
    });
    await ctx.db.insert("chapters", {
      bookId: book,
      authorId: dragon,
      chapterNumber: 2,
      title: "Map of Warm Ash",
      slug: slugify("Map of Warm Ash", "chapter-2"),
      body: "By morning, the map had rewritten itself with paths no living person had walked.",
      excerpt:
        "By morning, the map had rewritten itself with paths no living person had walked.",
      visibility: "followers",
      commentsMode: "followers",
      status: "published",
      tokenCost: PUBLIC_PUBLISH_COST,
      likesCount: 11,
      commentsCount: 0,
      publishedAt: timestamp - 120000,
      createdAt: timestamp - 130000,
      updatedAt: timestamp - 120000,
    });

    return { seeded: true };
  },
});
