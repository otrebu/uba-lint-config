export function Clock() {
  const now = new Date();
  return <time>{now.toISOString()}</time>;
}
