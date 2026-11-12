import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAppRoutes, renderWithProviders } from "./render";

describe("Application Smoke Test", () => {
  it("renders the root application route at '/' using renderAppRoutes", async () => {
    const { router } = await renderAppRoutes({ initialEntries: ["/"] });

    expect(router.state.location.pathname).toBe("/");
    expect(await screen.findByRole("heading", { name: /tanstack-open-api/i })).toBeInTheDocument();
  });

  it("renders arbitrary UI with renderWithProviders", async () => {
    await renderWithProviders(
      <div>
        <p>Isolated Test Component</p>
      </div>,
    );

    expect(screen.getByText("Isolated Test Component")).toBeInTheDocument();
  });
});
