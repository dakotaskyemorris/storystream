import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  commentsModeValidator,
  publishStatusValidator,
  reportStatusValidator,
  reportTargetValidator,
  visibilityValidator,
  writingKindValidator,
} from "./validators";

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.union(v.id("users"), v.null()),
    username: v.string(),
    displayName: v.string(),
    avatarUrl: v.union(v.string(), v.null()),
    bio: v.string(),
    favoriteGenres: v.array(v.string()),
    tokenBalance: v.number(),
    followersCount: v.number(),
    followingCount: v.number(),
    postsCount: v.number(),
    booksCount: v.number(),
    writingStreak: v.number(),
    lastWritingDay: v.union(v.string(), v.null()),
    isAdmin: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_username", ["username"])
    .index("by_isAdmin", ["isAdmin"]),

  posts: defineTable({
    authorId: v.id("profiles"),
    title: v.string(),
    slug: v.string(),
    kind: writingKindValidator,
    body: v.string(),
    excerpt: v.string(),
    genre: v.string(),
    tags: v.array(v.string()),
    visibility: visibilityValidator,
    commentsMode: commentsModeValidator,
    status: publishStatusValidator,
    tokenCost: v.number(),
    likesCount: v.number(),
    commentsCount: v.number(),
    publishedAt: v.union(v.number(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authorId", ["authorId"])
    .index("by_authorId_and_status", ["authorId", "status"])
    .index("by_status_and_visibility", ["status", "visibility"])
    .index("by_genre_and_status_and_visibility", [
      "genre",
      "status",
      "visibility",
    ]),

  books: defineTable({
    authorId: v.id("profiles"),
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    coverUrl: v.union(v.string(), v.null()),
    genres: v.array(v.string()),
    visibility: visibilityValidator,
    status: publishStatusValidator,
    subscribersCount: v.number(),
    chaptersCount: v.number(),
    publishedAt: v.union(v.number(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authorId", ["authorId"])
    .index("by_authorId_and_status", ["authorId", "status"])
    .index("by_status_and_visibility", ["status", "visibility"]),

  chapters: defineTable({
    bookId: v.id("books"),
    authorId: v.id("profiles"),
    chapterNumber: v.number(),
    title: v.string(),
    slug: v.string(),
    body: v.string(),
    excerpt: v.string(),
    visibility: visibilityValidator,
    commentsMode: commentsModeValidator,
    status: publishStatusValidator,
    tokenCost: v.number(),
    likesCount: v.number(),
    commentsCount: v.number(),
    publishedAt: v.union(v.number(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bookId", ["bookId"])
    .index("by_bookId_and_status", ["bookId", "status"])
    .index("by_bookId_and_chapterNumber", ["bookId", "chapterNumber"])
    .index("by_authorId_and_status", ["authorId", "status"]),

  follows: defineTable({
    followerId: v.id("profiles"),
    followingId: v.id("profiles"),
    createdAt: v.number(),
  })
    .index("by_followerId", ["followerId"])
    .index("by_followingId", ["followingId"])
    .index("by_followerId_and_followingId", ["followerId", "followingId"]),

  subscriptions: defineTable({
    bookId: v.id("books"),
    subscriberId: v.id("profiles"),
    createdAt: v.number(),
  })
    .index("by_bookId", ["bookId"])
    .index("by_subscriberId", ["subscriberId"])
    .index("by_bookId_and_subscriberId", ["bookId", "subscriberId"]),

  likes: defineTable({
    profileId: v.id("profiles"),
    postId: v.union(v.id("posts"), v.null()),
    chapterId: v.union(v.id("chapters"), v.null()),
    createdAt: v.number(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_postId", ["postId"])
    .index("by_chapterId", ["chapterId"])
    .index("by_profileId_and_postId", ["profileId", "postId"])
    .index("by_profileId_and_chapterId", ["profileId", "chapterId"]),

  comments: defineTable({
    authorId: v.id("profiles"),
    postId: v.union(v.id("posts"), v.null()),
    chapterId: v.union(v.id("chapters"), v.null()),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authorId", ["authorId"])
    .index("by_postId", ["postId"])
    .index("by_chapterId", ["chapterId"]),

  tokenLedger: defineTable({
    profileId: v.id("profiles"),
    amount: v.number(),
    reason: v.string(),
    sourceType: v.string(),
    sourceId: v.union(v.string(), v.null()),
    createdAt: v.number(),
  }).index("by_profileId", ["profileId"]),

  blocks: defineTable({
    blockerId: v.id("profiles"),
    blockedId: v.id("profiles"),
    createdAt: v.number(),
  })
    .index("by_blockerId", ["blockerId"])
    .index("by_blockedId", ["blockedId"])
    .index("by_blockerId_and_blockedId", ["blockerId", "blockedId"]),

  mutes: defineTable({
    muterId: v.id("profiles"),
    mutedId: v.id("profiles"),
    createdAt: v.number(),
  })
    .index("by_muterId", ["muterId"])
    .index("by_muterId_and_mutedId", ["muterId", "mutedId"]),

  reports: defineTable({
    reporterId: v.id("profiles"),
    targetType: reportTargetValidator,
    targetId: v.string(),
    reason: v.string(),
    details: v.string(),
    status: reportStatusValidator,
    moderatorId: v.union(v.id("profiles"), v.null()),
    resolutionNote: v.union(v.string(), v.null()),
    createdAt: v.number(),
    reviewedAt: v.union(v.number(), v.null()),
  })
    .index("by_status", ["status"])
    .index("by_reporterId", ["reporterId"])
    .index("by_targetType_and_targetId", ["targetType", "targetId"]),
});
