import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/quizzes")({
  beforeLoad: () => {
    throw redirect({ to: "/tasks" });
  },
  component: () => null,
});
