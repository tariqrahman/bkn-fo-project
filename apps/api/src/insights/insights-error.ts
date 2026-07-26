export class InsightsError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "InsightsError";
  }
}

export function requireAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new InsightsError(
      "ANTHROPIC_API_KEY is not configured. Add it to .env to enable AI insights.",
      503,
    );
  }
  return apiKey;
}
