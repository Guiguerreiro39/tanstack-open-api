import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAppRoutes } from "@/test/render";

describe("Design System Showcase Route (/showcase)", () => {
  it("renders the showcase route at '/showcase' using renderAppRoutes", async () => {
    const { router } = await renderAppRoutes({
      initialEntries: ["/showcase"],
    });

    expect(router.state.location.pathname).toBe("/showcase");
    expect(
      await screen.findByRole("heading", { name: /Design System Showcase/i }),
    ).toBeInTheDocument();
  });
});
