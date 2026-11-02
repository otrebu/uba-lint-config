import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

it("shows the greeting", () => {
  render(<p>Hello</p>);
  screen.debug();
  expect(screen.getByText("Hello")).toBeDefined();
});
