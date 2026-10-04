import { updateFeedResponse } from "@/lib/market/update-feed-response";

export function GET(request: Request) {
  return updateFeedResponse(request, "xml");
}

export function HEAD(request: Request) {
  return updateFeedResponse(request, "xml");
}
