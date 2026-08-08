import { GoogleGenAI } from "@google/genai";
import { env } from "../env.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import type {
  AIProvider,
  FailureAnalysisInput,
  NormalizedEndpointInput,
  ReportInsightInput,
  TestGenInput,
} from "./provider.js";
import { buildEndpointAnalysisPrompt } from "./prompts/endpointAnalysis.js";
import { buildFailureAnalysisPrompt } from "./prompts/failureAnalysis.js";
import { buildReportInsightsPrompt } from "./prompts/reportInsights.js";
import { buildTestGenerationPrompt } from "./prompts/testGeneration.js";

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

class GeminiProvider implements AIProvider {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!env.GEMINI_API_KEY) {
      throw new AppError(
        "AI features are not configured yet. Add GEMINI_API_KEY to server/.env to enable AI analysis and test generation.",
        503,
        "AI_NOT_CONFIGURED"
      );
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
    return this.client;
  }

  private async generateJson(prompt: string, attempt = 1): Promise<unknown> {
    const client = this.getClient();
    let text: string;
    try {
      const response = await client.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: attempt === 1 ? 0.4 : 0.1 },
      });
      text = response.text ?? "";
    } catch (err) {
      logger.error("Gemini request failed", { message: err instanceof Error ? err.message : String(err) });
      throw new AppError("The AI service is temporarily unavailable. Please try again shortly.", 502, "AI_UNAVAILABLE");
    }

    try {
      return JSON.parse(stripCodeFence(text));
    } catch {
      if (attempt < 2) {
        logger.warn("Gemini returned non-JSON output, retrying with a stricter prompt");
        return this.generateJson(`${prompt}\n\nSTRICT REMINDER: reply with ONLY the raw JSON object, nothing else.`, attempt + 1);
      }
      throw new AppError("The AI returned an unexpected response. Please try again.", 502, "AI_INVALID_OUTPUT");
    }
  }

  generateTestCases(input: TestGenInput): Promise<unknown> {
    return this.generateJson(buildTestGenerationPrompt(input));
  }

  analyzeEndpoint(endpoint: NormalizedEndpointInput): Promise<unknown> {
    return this.generateJson(buildEndpointAnalysisPrompt(endpoint));
  }

  analyzeFailure(input: FailureAnalysisInput): Promise<unknown> {
    return this.generateJson(buildFailureAnalysisPrompt(input));
  }

  generateReportInsights(input: ReportInsightInput): Promise<unknown> {
    return this.generateJson(buildReportInsightsPrompt(input));
  }
}

export const geminiProvider: AIProvider = new GeminiProvider();
