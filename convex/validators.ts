import { v } from "convex/values";

export const writingKindValidator = v.union(
  v.literal("story"),
  v.literal("poem"),
  v.literal("journal"),
  v.literal("prompt"),
  v.literal("fanfiction"),
  v.literal("reflection"),
  v.literal("worldbuilding"),
  v.literal("project"),
);

export const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("followers"),
  v.literal("public"),
);

export const commentsModeValidator = v.union(
  v.literal("followers"),
  v.literal("everyone"),
);

export const publishStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const reportTargetValidator = v.union(
  v.literal("post"),
  v.literal("chapter"),
  v.literal("comment"),
  v.literal("profile"),
);

export const reportStatusValidator = v.union(
  v.literal("open"),
  v.literal("reviewed"),
  v.literal("dismissed"),
);
