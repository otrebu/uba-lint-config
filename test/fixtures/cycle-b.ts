import { getA } from "./cycle-a";

export function getB(): number {
  return getA() - 1;
}
