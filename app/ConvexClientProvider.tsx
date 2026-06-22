"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex =
  !isStaticDemo && convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return <>{children}</>;
  }

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
