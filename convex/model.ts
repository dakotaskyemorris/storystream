import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const STARTING_TOKENS = 12;
export const PUBLIC_PUBLISH_COST = 2;
export const WRITING_REWARD = 2;
export const CHAPTER_REWARD = 3;
export const COMMENT_REWARD = 1;

type ReadCtx = QueryCtx | MutationCtx;

export function normalizeUsername(value: string) {
  const username = value.trim().toLowerCase().replace(/^@+/, "");
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new ConvexError(
      "Usernames must be 3-24 characters and use letters, numbers, or underscores.",
    );
  }
  return username;
}

export function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || fallback;
}

export function excerptFrom(body: string) {
  const compact = body.replace(/\s+/g, " ").trim();
  return compact.length > 220 ? `${compact.slice(0, 217)}...` : compact;
}

export function now() {
  return Date.now();
}

function dayStamp(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function previousDayStamp(time: number) {
  const date = new Date(time);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function currentProfile(ctx: ReadCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }
  return await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export async function requireProfile(ctx: ReadCtx) {
  const profile = await currentProfile(ctx);
  if (!profile) {
    throw new ConvexError("Please sign in and create a profile first.");
  }
  return profile;
}

export async function isFollowing(
  ctx: ReadCtx,
  followerId: Id<"profiles">,
  followingId: Id<"profiles">,
) {
  const follow = await ctx.db
    .query("follows")
    .withIndex("by_followerId_and_followingId", (q) =>
      q.eq("followerId", followerId).eq("followingId", followingId),
    )
    .unique();
  return follow !== null;
}

export async function hasBlockBetween(
  ctx: ReadCtx,
  firstProfileId: Id<"profiles">,
  secondProfileId: Id<"profiles">,
) {
  const firstBlocksSecond = await ctx.db
    .query("blocks")
    .withIndex("by_blockerId_and_blockedId", (q) =>
      q.eq("blockerId", firstProfileId).eq("blockedId", secondProfileId),
    )
    .unique();
  if (firstBlocksSecond) {
    return true;
  }
  const secondBlocksFirst = await ctx.db
    .query("blocks")
    .withIndex("by_blockerId_and_blockedId", (q) =>
      q.eq("blockerId", secondProfileId).eq("blockedId", firstProfileId),
    )
    .unique();
  return secondBlocksFirst !== null;
}

export async function canViewByVisibility(
  ctx: ReadCtx,
  viewer: Doc<"profiles"> | null,
  authorId: Id<"profiles">,
  visibility: "private" | "followers" | "public",
) {
  if (viewer && viewer._id !== authorId && (await hasBlockBetween(ctx, viewer._id, authorId))) {
    return false;
  }
  if (visibility === "public") {
    return true;
  }
  if (!viewer) {
    return false;
  }
  if (viewer._id === authorId) {
    return true;
  }
  if (visibility === "followers") {
    return await isFollowing(ctx, viewer._id, authorId);
  }
  return false;
}

export async function canCommentByMode(
  ctx: ReadCtx,
  viewer: Doc<"profiles"> | null,
  authorId: Id<"profiles">,
  visibility: "private" | "followers" | "public",
  commentsMode: "followers" | "everyone",
) {
  if (!viewer) {
    return false;
  }
  if (!(await canViewByVisibility(ctx, viewer, authorId, visibility))) {
    return false;
  }
  if (viewer._id === authorId || commentsMode === "everyone") {
    return true;
  }
  return await isFollowing(ctx, viewer._id, authorId);
}

export async function awardTokens(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
  amount: number,
  reason: string,
  sourceType: string,
  sourceId: string | null,
) {
  const profile = await ctx.db.get(profileId);
  if (!profile) {
    throw new ConvexError("Profile not found.");
  }
  const createdAt = now();
  await ctx.db.patch(profileId, {
    tokenBalance: profile.tokenBalance + amount,
    updatedAt: createdAt,
  });
  await ctx.db.insert("tokenLedger", {
    profileId,
    amount,
    reason,
    sourceType,
    sourceId,
    createdAt,
  });
}

export async function spendTokens(
  ctx: MutationCtx,
  profile: Doc<"profiles">,
  amount: number,
  reason: string,
  sourceType: string,
  sourceId: string | null,
) {
  if (profile.tokenBalance < amount) {
    throw new ConvexError("Not enough StoryTokens for public publishing.");
  }
  const createdAt = now();
  await ctx.db.patch(profile._id, {
    tokenBalance: profile.tokenBalance - amount,
    updatedAt: createdAt,
  });
  await ctx.db.insert("tokenLedger", {
    profileId: profile._id,
    amount: -amount,
    reason,
    sourceType,
    sourceId,
    createdAt,
  });
}

export async function markWritingActivity(
  ctx: MutationCtx,
  profile: Doc<"profiles">,
) {
  const timestamp = now();
  const today = dayStamp(timestamp);
  if (profile.lastWritingDay === today) {
    await ctx.db.patch(profile._id, { updatedAt: timestamp });
    return;
  }
  const streak =
    profile.lastWritingDay === previousDayStamp(timestamp)
      ? profile.writingStreak + 1
      : 1;
  await ctx.db.patch(profile._id, {
    writingStreak: streak,
    lastWritingDay: today,
    updatedAt: timestamp,
  });
}
