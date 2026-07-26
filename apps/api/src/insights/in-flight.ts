import type { TeamInsightsResponse } from "./types.js";

const inFlightGenerations = new Map<string, Promise<TeamInsightsResponse>>();

export function inFlightInsightsKey(teamId: string, cacheKey: string, refresh: boolean): string {
  return `${teamId}:${cacheKey}:${refresh ? "refresh" : "normal"}`;
}

export function getInFlightInsights(key: string): Promise<TeamInsightsResponse> | undefined {
  return inFlightGenerations.get(key);
}

export function setInFlightInsights(
  key: string,
  promise: Promise<TeamInsightsResponse>,
): Promise<TeamInsightsResponse> {
  inFlightGenerations.set(key, promise);
  void promise.finally(() => {
    if (inFlightGenerations.get(key) === promise) {
      inFlightGenerations.delete(key);
    }
  });
  return promise;
}
