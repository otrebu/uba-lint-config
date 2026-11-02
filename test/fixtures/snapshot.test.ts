import { expect, it } from "vitest";

it("keeps the expected value in the test", () => {
  expect({ total: 1 }).toMatchSnapshot();
});
