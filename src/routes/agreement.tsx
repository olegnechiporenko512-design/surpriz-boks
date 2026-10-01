import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/agreement")({
  beforeLoad: () => {
    throw redirect({ to: "/offer" });
  },
});
