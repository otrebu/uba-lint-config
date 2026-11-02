export function UnreadCount({ count }: { count: number }) {
  return <div>{count && <span>{count}</span>}</div>;
}
