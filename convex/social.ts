import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  COMMENT_REWARD,
  awardTokens,
  canCommentByMode,
  canViewByVisibility,
  currentProfile,
  hasBlockBetween,
  isFollowing,
  now,
  requireProfile,
} from "./model";
import { reportTargetValidator } from "./validators";

type ReadCtx = QueryCtx | MutationCtx;

async function isMutedByViewer(
  ctx: ReadCtx,
  viewerId: Id<"profiles">,
  mutedId: Id<"profiles">,
) {
  const mute = await ctx.db
    .query("mutes")
    .withIndex("by_muterId_and_mutedId", (q) =>
      q.eq("muterId", viewerId).eq("mutedId", mutedId),
    )
    .unique();
  return mute !== null;
}

async function removeFollow(
  ctx: MutationCtx,
  followerId: Id<"profiles">,
  followingId: Id<"profiles">,
) {
  const existing = await ctx.db
    .query("follows")
    .withIndex("by_followerId_and_followingId", (q) =>
      q.eq("followerId", followerId).eq("followingId", followingId),
    )
    .unique();
  if (!existing) {
    return false;
  }
  const follower = await ctx.db.get(followerId);
  const following = await ctx.db.get(followingId);
  const timestamp = now();
  await ctx.db.delete(existing._id);
  if (follower) {
    await ctx.db.patch(follower._id, {
      followingCount: Math.max(0, follower.followingCount - 1),
      updatedAt: timestamp,
    });
  }
  if (following) {
    await ctx.db.patch(following._id, {
      followersCount: Math.max(0, following.followersCount - 1),
      updatedAt: timestamp,
    });
  }
  return true;
}

export const relationshipTo = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const viewer = await currentProfile(ctx);
    const target = await ctx.db.get(args.profileId);
    if (!viewer || !target) {
      return {
        isSelf: false,
        isFollowing: false,
        followsYou: false,
        isBlocked: false,
        isBlockedBy: false,
        isMuted: false,
      };
    }
    const isSelf = viewer._id === target._id;
    const viewerBlocksTarget = isSelf
      ? false
      : await ctx.db
          .query("blocks")
          .withIndex("by_blockerId_and_blockedId", (q) =>
            q.eq("blockerId", viewer._id).eq("blockedId", target._id),
          )
          .unique();
    const targetBlocksViewer = isSelf
      ? false
      : await ctx.db
          .query("blocks")
          .withIndex("by_blockerId_and_blockedId", (q) =>
            q.eq("blockerId", target._id).eq("blockedId", viewer._id),
          )
          .unique();
    return {
      isSelf,
      isFollowing: isSelf ? false : await isFollowing(ctx, viewer._id, target._id),
      followsYou: isSelf ? false : await isFollowing(ctx, target._id, viewer._id),
      isBlocked: viewerBlocksTarget !== false && viewerBlocksTarget !== null,
      isBlockedBy: targetBlocksViewer !== false && targetBlocksViewer !== null,
      isMuted: isSelf ? false : await isMutedByViewer(ctx, viewer._id, target._id),
    };
  },
});

export const follow = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    if (viewer._id === args.profileId) {
      throw new ConvexError("You cannot follow yourself.");
    }
    const target = await ctx.db.get(args.profileId);
    if (!target) {
      throw new ConvexError("Profile not found.");
    }
    if (await hasBlockBetween(ctx, viewer._id, target._id)) {
      throw new ConvexError("This profile is not available.");
    }
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_followerId_and_followingId", (q) =>
        q.eq("followerId", viewer._id).eq("followingId", target._id),
      )
      .unique();
    if (existing) {
      return existing._id;
    }
    const createdAt = now();
    const followId = await ctx.db.insert("follows", {
      followerId: viewer._id,
      followingId: target._id,
      createdAt,
    });
    await ctx.db.patch(viewer._id, {
      followingCount: viewer.followingCount + 1,
      updatedAt: createdAt,
    });
    await ctx.db.patch(target._id, {
      followersCount: target.followersCount + 1,
      updatedAt: createdAt,
    });
    return followId;
  },
});

export const unfollow = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    if (viewer._id === args.profileId) {
      throw new ConvexError("You cannot unfollow yourself.");
    }
    return await removeFollow(ctx, viewer._id, args.profileId);
  },
});

export const followers = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const viewer = await currentProfile(ctx);
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_followingId", (q) => q.eq("followingId", args.profileId))
      .order("desc")
      .take(40);
    const results = [];
    for (const follow of follows) {
      const profile = await ctx.db.get(follow.followerId);
      if (
        profile &&
        (!viewer ||
          (viewer._id === profile._id ||
            (!(await hasBlockBetween(ctx, viewer._id, profile._id)) &&
              !(await isMutedByViewer(ctx, viewer._id, profile._id)))))
      ) {
        results.push(profile);
      }
    }
    return results;
  },
});

export const following = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const viewer = await currentProfile(ctx);
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", args.profileId))
      .order("desc")
      .take(40);
    const results = [];
    for (const follow of follows) {
      const profile = await ctx.db.get(follow.followingId);
      if (
        profile &&
        (!viewer ||
          (viewer._id === profile._id ||
            (!(await hasBlockBetween(ctx, viewer._id, profile._id)) &&
              !(await isMutedByViewer(ctx, viewer._id, profile._id)))))
      ) {
        results.push(profile);
      }
    }
    return results;
  },
});

export const friendsDigest = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await currentProfile(ctx);
    if (!viewer) {
      return [];
    }
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", viewer._id))
      .take(100);
    const digest = [];
    for (const follow of follows) {
      const author = await ctx.db.get(follow.followingId);
      if (
        !author ||
        (await hasBlockBetween(ctx, viewer._id, author._id)) ||
        (await isMutedByViewer(ctx, viewer._id, author._id))
      ) {
        continue;
      }
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_authorId_and_status", (q) =>
          q.eq("authorId", follow.followingId).eq("status", "published"),
        )
        .order("desc")
        .take(5);
      for (const post of posts) {
        if (await canViewByVisibility(ctx, viewer, post.authorId, post.visibility)) {
          const like = await ctx.db
            .query("likes")
            .withIndex("by_profileId_and_postId", (q) =>
              q.eq("profileId", viewer._id).eq("postId", post._id),
            )
            .unique();
          digest.push({
            type: "post",
            createdAt: post.publishedAt ?? post.updatedAt,
            post: { ...post, viewerHasLiked: like !== null },
            author,
          });
        }
      }
      const chapters = await ctx.db
        .query("chapters")
        .withIndex("by_authorId_and_status", (q) =>
          q.eq("authorId", follow.followingId).eq("status", "published"),
        )
        .order("desc")
        .take(5);
      for (const chapter of chapters) {
        if (await canViewByVisibility(ctx, viewer, chapter.authorId, chapter.visibility)) {
          const book = await ctx.db.get(chapter.bookId);
          const like = await ctx.db
            .query("likes")
            .withIndex("by_profileId_and_chapterId", (q) =>
              q.eq("profileId", viewer._id).eq("chapterId", chapter._id),
            )
            .unique();
          digest.push({
            type: "chapter",
            createdAt: chapter.publishedAt ?? chapter.updatedAt,
            chapter: { ...chapter, viewerHasLiked: like !== null },
            book,
            author,
          });
        }
      }
    }
    return digest
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 30);
  },
});

export const togglePostLike = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found.");
    }
    if (!(await canViewByVisibility(ctx, viewer, post.authorId, post.visibility))) {
      throw new ConvexError("This post is not available to you.");
    }
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_profileId_and_postId", (q) =>
        q.eq("profileId", viewer._id).eq("postId", post._id),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(post._id, {
        likesCount: Math.max(0, post.likesCount - 1),
        updatedAt: now(),
      });
      return false;
    }
    await ctx.db.insert("likes", {
      profileId: viewer._id,
      postId: post._id,
      chapterId: null,
      createdAt: now(),
    });
    await ctx.db.patch(post._id, {
      likesCount: post.likesCount + 1,
      updatedAt: now(),
    });
    return true;
  },
});

export const toggleChapterLike = mutation({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) {
      throw new ConvexError("Chapter not found.");
    }
    if (!(await canViewByVisibility(ctx, viewer, chapter.authorId, chapter.visibility))) {
      throw new ConvexError("This chapter is not available to you.");
    }
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_profileId_and_chapterId", (q) =>
        q.eq("profileId", viewer._id).eq("chapterId", chapter._id),
      )
      .unique();
    const timestamp = now();
    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(chapter._id, {
        likesCount: Math.max(0, chapter.likesCount - 1),
        updatedAt: timestamp,
      });
      return false;
    }
    await ctx.db.insert("likes", {
      profileId: viewer._id,
      postId: null,
      chapterId: chapter._id,
      createdAt: timestamp,
    });
    await ctx.db.patch(chapter._id, {
      likesCount: chapter.likesCount + 1,
      updatedAt: timestamp,
    });
    return true;
  },
});

export const commentsForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      return [];
    }
    const viewer = await currentProfile(ctx);
    if (!(await canViewByVisibility(ctx, viewer, post.authorId, post.visibility))) {
      return [];
    }
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_postId", (q) => q.eq("postId", post._id))
      .take(100);
    const results = [];
    for (const comment of comments) {
      const author = await ctx.db.get(comment.authorId);
      if (author) {
        results.push({ comment, author });
      }
    }
    return results;
  },
});

export const commentsForChapter = query({
  args: { chapterId: v.id("chapters") },
  handler: async (ctx, args) => {
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) {
      return [];
    }
    const viewer = await currentProfile(ctx);
    if (!(await canViewByVisibility(ctx, viewer, chapter.authorId, chapter.visibility))) {
      return [];
    }
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_chapterId", (q) => q.eq("chapterId", chapter._id))
      .take(100);
    const results = [];
    for (const comment of comments) {
      const author = await ctx.db.get(comment.authorId);
      if (author) {
        results.push({ comment, author });
      }
    }
    return results;
  },
});

export const addCommentToPost = mutation({
  args: { postId: v.id("posts"), body: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found.");
    }
    if (
      !(await canCommentByMode(
        ctx,
        viewer,
        post.authorId,
        post.visibility,
        post.commentsMode,
      ))
    ) {
      throw new ConvexError("Comments are not open to you on this piece.");
    }
    const body = args.body.trim();
    if (body.length < 1 || body.length > 1200) {
      throw new ConvexError("Comments must be 1-1200 characters.");
    }
    const timestamp = now();
    const commentId = await ctx.db.insert("comments", {
      authorId: viewer._id,
      postId: post._id,
      chapterId: null,
      body,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await ctx.db.patch(post._id, {
      commentsCount: post.commentsCount + 1,
      updatedAt: timestamp,
    });
    await awardTokens(ctx, viewer._id, COMMENT_REWARD, "Thoughtful comment", "comment", commentId);
    return commentId;
  },
});

export const addCommentToChapter = mutation({
  args: { chapterId: v.id("chapters"), body: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) {
      throw new ConvexError("Chapter not found.");
    }
    if (
      !(await canCommentByMode(
        ctx,
        viewer,
        chapter.authorId,
        chapter.visibility,
        chapter.commentsMode,
      ))
    ) {
      throw new ConvexError("Comments are not open to you on this chapter.");
    }
    const body = args.body.trim();
    if (body.length < 1 || body.length > 1200) {
      throw new ConvexError("Comments must be 1-1200 characters.");
    }
    const timestamp = now();
    const commentId = await ctx.db.insert("comments", {
      authorId: viewer._id,
      postId: null,
      chapterId: chapter._id,
      body,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await ctx.db.patch(chapter._id, {
      commentsCount: chapter.commentsCount + 1,
      updatedAt: timestamp,
    });
    await awardTokens(ctx, viewer._id, COMMENT_REWARD, "Thoughtful chapter comment", "comment", commentId);
    return commentId;
  },
});

export const block = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    if (viewer._id === args.profileId) {
      throw new ConvexError("You cannot block yourself.");
    }
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) =>
        q.eq("blockerId", viewer._id).eq("blockedId", args.profileId),
      )
      .unique();
    if (existing) {
      return existing._id;
    }
    await removeFollow(ctx, viewer._id, args.profileId);
    await removeFollow(ctx, args.profileId, viewer._id);
    return await ctx.db.insert("blocks", {
      blockerId: viewer._id,
      blockedId: args.profileId,
      createdAt: now(),
    });
  },
});

export const unblock = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blockerId_and_blockedId", (q) =>
        q.eq("blockerId", viewer._id).eq("blockedId", args.profileId),
      )
      .unique();
    if (!existing) {
      return false;
    }
    await ctx.db.delete(existing._id);
    return true;
  },
});

export const mute = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    if (viewer._id === args.profileId) {
      throw new ConvexError("You cannot mute yourself.");
    }
    const existing = await ctx.db
      .query("mutes")
      .withIndex("by_muterId_and_mutedId", (q) =>
        q.eq("muterId", viewer._id).eq("mutedId", args.profileId),
      )
      .unique();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("mutes", {
      muterId: viewer._id,
      mutedId: args.profileId,
      createdAt: now(),
    });
  },
});

export const unmute = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    const existing = await ctx.db
      .query("mutes")
      .withIndex("by_muterId_and_mutedId", (q) =>
        q.eq("muterId", viewer._id).eq("mutedId", args.profileId),
      )
      .unique();
    if (!existing) {
      return false;
    }
    await ctx.db.delete(existing._id);
    return true;
  },
});

export const report = mutation({
  args: {
    targetType: reportTargetValidator,
    targetId: v.string(),
    reason: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireProfile(ctx);
    const reason = args.reason.trim();
    const details = args.details.trim();
    if (reason.length < 2 || reason.length > 120) {
      throw new ConvexError("Please include a short report reason.");
    }
    if (details.length > 1000) {
      throw new ConvexError("Report details must be under 1000 characters.");
    }
    return await ctx.db.insert("reports", {
      reporterId: viewer._id,
      targetType: args.targetType,
      targetId: args.targetId,
      reason,
      details,
      status: "open",
      moderatorId: null,
      resolutionNote: null,
      createdAt: now(),
      reviewedAt: null,
    });
  },
});
