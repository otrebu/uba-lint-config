import { useQuery } from "@tanstack/react-query";

declare function fetchTodo(todoId: string): Promise<unknown>;

export function useTodo(todoId: string) {
  return useQuery({ queryFn: () => fetchTodo(todoId), queryKey: ["todo"] });
}
