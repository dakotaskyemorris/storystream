import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  PUBLIC_PUBLISH_COST,
  WRITING_REWARD,
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
import {
  commentsModeValidator,
  visibilityValidator,
  writingKindValidator,
} from "./validators";

export const createDraft = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    kind: writingKindValidator,
    genre: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    const timestamp = now();
    const postId = await ctx.db.insert("posts", {
      authorId: profile._id,
      title: args.title.trim() || "Untitled piece",
      slug: slugify(args.title, `piece-${timestamp}`),
      kind: args.kind,
      body: args.body,
      excerpt: excerptFrom(args.body),
      genre: args.genre.trim() || "General",
      tags: args.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
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
    await ctx.db.patch(profile._id, {
      postsCount: profile.postsCount + 1,
      updatedAt: timestamp,
    });
    await markWritingActivity(ctx, profile);
    await awardTokens(ctx, profile._id, WRITING_REWARD, "Writing a post", "post", postId);
    return postId;
  },
});

export const publish = mutation({
  args: {
    postId: v.id("posts"),
    visibility: visibilityValidator,
    commentsMode: commentsModeValidator,
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post || post.authorId !== profile._id) {
      throw new ConvexError("You can only publish your own writing.");
    }
    if (args.visibility === "public" && post.visibility !== "public") {
      await spendTokens(
        ctx,
        profile,
        PUBLIC_PUBLISH_COST,
        "Public publishing",
        "post",
        post._id,
      );
    }
    const timestamp = now();
    await ctx.db.patch(post._id, {
      visibility: args.visibility,
      commentsMode:
        args.visibility === "public" ? "everyone" : args.commentsMode,
      status: "published",
      publishedAt: post.publishedAt ?? timestamp,
      updatedAt: timestamp,
    });
    return post._id;
  },
});

export const discover = query({
  args: { genre: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const viewer = await currentProfile(ctx);
    const posts = args.genre
      ? await ctx.db
          .query("posts")
          .withIndex("by_genre_and_status_and_visibility", (q) =>
            q
              .eq("genre", args.genre!)
              .eq("status", "published")
              .eq("visibility", "public"),
          )
          .order("desc")
          .take(40)
      : await ctx.db
          .query("posts")
          .withIndex("by_status_and_visibility", (q) =>
            q.eq("status", "published").eq("visibility", "public"),
          )
          .order("desc")
          .take(40);

    const results = [];
    for (const post of posts) {
      const author = await ctx.db.get(post.authorId);
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
      if (await canViewByVisibility(ctx, viewer, post.authorId, post.visibility)) {
        const like = viewer
          ? await ctx.db
              .query("likes")
              .withIndex("by_profileId_and_postId", (q) =>
                q.eq("profileId", viewer._id).eq("postId", post._id),
              )
              .unique()
          : null;
        results.push({ post: { ...post, viewerHasLiked: like !== null }, author });
      }
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
      .query("posts")
      .withIndex("by_authorId", (q) => q.eq("authorId", profile._id))
      .order("desc")
      .take(80);
  },
});

export const byProfile = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const author = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    if (!author) {
      return null;
    }
    const viewer = await currentProfile(ctx);
    if (viewer && viewer._id !== author._id) {
      if (await hasBlockBetween(ctx, viewer._id, author._id)) {
        return { author, posts: [] };
      }
      const muted = await ctx.db
        .query("mutes")
        .withIndex("by_muterId_and_mutedId", (q) =>
          q.eq("muterId", viewer._id).eq("mutedId", author._id),
        )
        .unique();
      if (muted) {
        return { author, posts: [] };
      }
    }
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_authorId_and_status", (q) =>
        q.eq("authorId", author._id).eq("status", "published"),
      )
      .order("desc")
      .take(60);
    const visible = [];
    for (const post of posts) {
      if (await canViewByVisibility(ctx, viewer, author._id, post.visibility)) {
        const like = viewer
          ? await ctx.db
              .query("likes")
              .withIndex("by_profileId_and_postId", (q) =>
                q.eq("profileId", viewer._id).eq("postId", post._id),
              )
              .unique()
          : null;
        visible.push({ ...post, viewerHasLiked: like !== null });
      }
    }
    return { author, posts: visible };
  },
});
