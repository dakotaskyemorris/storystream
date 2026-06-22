import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { now, requireProfile } from "./model";
import { reportStatusValidator } from "./validators";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const profile = await requireProfile(ctx);
  if (!profile.isAdmin) {
    throw new ConvexError("Only moderators can view this queue.");
  }
  return profile;
}

export const queue = query({
  args: { status: v.optional(reportStatusValidator) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = args.status ?? "open";
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .take(80);
    const results = [];
    for (const report of reports) {
      const reporter = await ctx.db.get(report.reporterId);
      results.push({ report, reporter });
    }
    return results;
  },
});

export const review = mutation({
  args: {
    reportId: v.id("reports"),
    status: reportStatusValidator,
    resolutionNote: v.string(),
  },
  handler: async (ctx, args) => {
    const moderator = await requireAdmin(ctx);
    await ctx.db.patch(args.reportId, {
      status: args.status,
      moderatorId: moderator._id,
      resolutionNote: args.resolutionNote,
      reviewedAt: now(),
    });
    return args.reportId;
  },
});
