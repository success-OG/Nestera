"use client";

import React from "react";

export const queryClient = {
  removeQueries: (_options?: unknown) => undefined,
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
