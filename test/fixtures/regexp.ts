// Why: overlapping matches for dots make this pattern backtrack on long failures.
export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
