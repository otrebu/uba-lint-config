type Status = "active" | "closed" | "paused";

export function describeStatus(status: Status): string {
  switch (status) {
    case "active": {
      return "Active";
    }
    default: {
      return "Other";
    }
  }
}
