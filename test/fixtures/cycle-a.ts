import { getB } from "./cycle-b";

export function getA(): number {
  return getB() + 1;
}
