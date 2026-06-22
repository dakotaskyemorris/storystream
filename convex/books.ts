import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  CHAPTER_REWARD,
  PUBLIC_PUBLISH_COST,
  awardTokens,
  canViewByVisibility,
  currentProfile,
  excerptFrom,
  hasBlockBetween,
  markWritingActivity,
  now,
  requireProfile,
  slugify,
  spendTokens,
} from "./model";
import { commentsModeValidator, visibilityValidator } from "./validators";

export const createBook = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    coverUrl: v.optional(v.union(v.string(), v.null())),
    genres: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    const timestamp = now();
    const bookId = await ctx.db.insert("books", {
      authorId: profile._id,
      title: args.title.trim() || "Untitled book",
      slug: slugify(args.title, `book-${timestamp}`),
      description: args.description,
      coverUrl: args.coverUrl ?? null,
      genres: args.genres.map((genre) => genre.trim()).filter(Boolean).slice(0, 6),
      visibility: "private",
      status: "draft",
      subscribersCount: 0,
      chaptersCount: 0,
      publishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await ctx.db.patch(profile._id, {
      booksCount: profile.booksCount + 1,
      updatedAt: timestamp,
    });
    await markWritingActivity(ctx, profile);
    return bookId;
  },
});

export const addChapter = mutation({
  args: { bookId: v.id("books"), title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.authorId !== profile._id) {
      throw new ConvexError("You can only add chapters to your own books.");
    }
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_bookId", (q) => q.eq("bookId", book._id))
      .take(200);
    const chapterNumber = chapters.length + 1;
    const timestamp = now();
    const chapterId = await ctx.db.insert("chapters", {
      bookId: book._id,
      authorId: profile._id,
      chapterNumber,
      title: args.title.trim() || `Chapter ${chapterNumber}`,
      slug: slugify(args.title, `chapter-${chapterNumber}`),
      body: args.body,
      excerpt: excerptFrom(args.body),
      visibility: "private",
      commentsMode: "followers",
      status: "draft",
      tokenCost: PUBLIC_PUBLISH_COST,
      likesCount: 0,
      commentsCount: 0,
      publishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await ctx.db.patch(book._id, {
      chaptersCount: book.chaptersCount + 1,
      updatedAt: timestamp,
    });
    await markWritingActivity(ctx, profile);
    await awardTokens(ctx, profile._id, CHAPTER_REWARD, "Writing a chapter", "chapter", chapterId);
    return chapterId;
  },
});

export const publishChapter = mutation({
  args: {
    chapterId: v.id("chapters"),
    visibility: visibilityValidator,
    commentsMode: commentsModeValidator,
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter || chapter.authorId !== profile._id) {
      throw new ConvexError("You can only publish your own chapters.");
    }
    if (args.visibility === "public" && chapter.visibility !== "public") {
      await spendTokens(ctx, profile, PUBLIC_PUBLISH_COST, "Public chapter publishing", "chapter", chapter._id);
    }
    const timestamp = now();
    await ctx.db.patch(chapter._id, {
      visibility: args.visibility,
      commentsMode:
        args.visibility === "public" ? "everyone" : args.commentsMode,
      status: "published",
      publishedAt: chapter.publishedAt ?? timestamp,
      updatedAt: timestamp,
    });
    const book = await ctx.db.get(chapter.bookId);
    if (book && book.status !== "published") {
      await ctx.db.patch(book._id, {
        status: "published",
        visibility: args.visibility,
        publishedAt: book.publishedAt ?? timestamp,
        updatedAt: timestamp,
      });
    }
    return chapter._id;
  },
});

export const discover = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await currentProfile(ctx);
    const books = await ctx.db
      .query("books")
      .withIndex("by_status_and_visibility", (q) =>
        q.eq("status", "published").eq("visibility", "public"),
      )
      .order("desc")
      .take(30);
    const results = [];
    for (const book of books) {
      const author = await ctx.db.get(book.authorId);
      if (!author) {
        continue;
      }
      if (viewer && (await hasBlockBetween(ctx, viewer._id, author._id))) {
        continue;
      }
      if (viewer) {
        const muted = await ctx.db
          .query("mutes")
          .withIndex("by_muterId_and_mutedId", (q) =>
            q.eq("muterId", viewer._id).eq("mutedId", author._id),
          )
          .unique();
        if (muted) {
          continue;
        }
      }
      const chapters = await ctx.db
        .query("chapters")
        .withIndex("by_bookId_and_status", (q) =>
          q.eq("bookId", book._id).eq("status", "published"),
        )
        .order("desc")
        .take(3);
      const visibleChapters = [];
      for (const chapter of chapters) {
        if (await canViewByVisibility(ctx, viewer, chapter.authorId, chapter.visibility)) {
          const like = viewer
            ? await ctx.db
                .query("likes")
                .withIndex("by_profileId_and_chapterId", (q) =>
                  q.eq("profileId", viewer._id).eq("chapterId", chapter._id),
                )
                .unique()
            : null;
          visibleChapters.push({ ...chapter, viewerHasLiked: like !== null });
        }
      }
      results.push({ book, author, chapters: visibleChapters });
    }
    return results;
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const profile = await currentProfile(ctx);
    if (!profile) {
      return [];
    }
    return await ctx.db
      .query("books")
      .withIndex("by_authorId", (q) => q.eq("authorId", profile._id))
      .order("desc")
      .take(60);
  },
});
