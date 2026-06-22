import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  STARTING_TOKENS,
  currentProfile,
  hasBlockBetween,
  normalizeUsername,
  now,
  requireProfile,
} from "./model";

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await currentProfile(ctx);
  },
});

export const authStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return { authenticated: userId !== null };
  },
});

export const byUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const username = normalizeUsername(args.username);
    return await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
  },
});

export const suggested = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await currentProfile(ctx);
    const profiles = await ctx.db.query("profiles").order("desc").take(40);
    const results = [];
    for (const profile of profiles) {
      if (viewer && profile._id === viewer._id) {
        continue;
      }
      if (viewer && (await hasBlockBetween(ctx, viewer._id, profile._id))) {
        continue;
      }
      if (viewer) {
        const muted = await ctx.db
          .query("mutes")
          .withIndex("by_muterId_and_mutedId", (q) =>
            q.eq("muterId", viewer._id).eq("mutedId", profile._id),
          )
          .unique();
        if (muted) {
          continue;
        }
      }
      results.push(profile);
      if (results.length >= 8) {
        break;
      }
    }
    return results;
  },
});

export const ensure = mutation({
  args: {
    username: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.union(v.string(), v.null())),
    favoriteGenres: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Please sign in before creating a profile.");
    }
    const username = normalizeUsername(args.username);
    const existingForUser = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const existingForUsername = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (
      existingForUsername &&
      (!existingForUser || existingForUsername._id !== existingForUser._id)
    ) {
      throw new ConvexError("That username is already flowing elsewhere.");
    }

    const timestamp = now();
    const displayName = args.displayName.trim() || `@${username}`;
    const favoriteGenres = args.favoriteGenres ?? [];
    if (existingForUser) {
      await ctx.db.patch(existingForUser._id, {
        username,
        displayName,
        bio: args.bio ?? existingForUser.bio,
        avatarUrl:
          args.avatarUrl === undefined ? existingForUser.avatarUrl : args.avatarUrl,
        favoriteGenres,
        updatedAt: timestamp,
      });
      return existingForUser._id;
    }

    const existingProfiles = await ctx.db.query("profiles").take(1);
    const profileId = await ctx.db.insert("profiles", {
      userId,
      username,
      displayName,
      avatarUrl: args.avatarUrl ?? null,
      bio: args.bio ?? "Finding the words.",
      favoriteGenres,
      tokenBalance: STARTING_TOKENS,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      booksCount: 0,
      writingStreak: 0,
      lastWritingDay: null,
      isAdmin: existingProfiles.length === 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await ctx.db.insert("tokenLedger", {
      profileId,
      amount: STARTING_TOKENS,
      reason: "Welcome grant",
      sourceType: "profile",
      sourceId: profileId,
      createdAt: timestamp,
    });
    return profileId;
  },
});

export const update = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.union(v.string(), v.null())),
    favoriteGenres: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const profile = await requireProfile(ctx);
    await ctx.db.patch(profile._id, {
      displayName: args.displayName?.trim() || profile.displayName,
      bio: args.bio ?? profile.bio,
      avatarUrl:
        args.avatarUrl === undefined ? profile.avatarUrl : args.avatarUrl,
      favoriteGenres: args.favoriteGenres ?? profile.favoriteGenres,
      updatedAt: now(),
    });
    return profile._id;
  },
});
