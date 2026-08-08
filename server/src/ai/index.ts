import type { AIProvider } from "./provider.js";
import { geminiProvider } from "./gemini.js";

// Single seam for swapping providers later — nothing outside this file
// should import a concrete provider directly.
export const aiProvider: AIProvider = geminiProvider;
export type { AIProvider } from "./provider.js";
