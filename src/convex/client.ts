import { ConvexProvider } from "convex/react";
import { convex } from "./convex";

export function ConvexProviderWithAuth({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}
