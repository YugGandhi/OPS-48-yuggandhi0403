"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateActionableSummary = void 0;
/**
 * AI Summarizer Service
 * This is a stub that simulates calling an LLM (like OpenAI or Anthropic)
 * to process a verbose citizen complaint into a concise, actionable summary.
 */
const generateActionableSummary = async (description) => {
    // In a real implementation:
    // 1. Initialize OpenAI client
    // 2. Call chat completions API with a strict system prompt
    // 3. Return the response text
    console.log(`[AI SERVICE] Analyzing description: "${description.substring(0, 50)}..."`);
    // Simulated network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Simulated AI Logic
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('pothole') || lowerDesc.includes('road')) {
        return 'Road infrastructure damage reported. Requires immediate patching assessment to prevent accidents.';
    }
    if (lowerDesc.includes('garbage') || lowerDesc.includes('trash')) {
        return 'Uncollected solid waste accumulation. Dispatch sanitation truck for clearance within 24h.';
    }
    if (lowerDesc.includes('light') || lowerDesc.includes('dark')) {
        return 'Street lighting failure. Requires electrical maintenance crew for bulb replacement.';
    }
    if (lowerDesc.includes('water') || lowerDesc.includes('leak')) {
        return 'Water pipe leakage. Urgent dispatch of plumbing unit needed to prevent water wastage.';
    }
    return 'General civic issue reported. Requires manual review by ward officer.';
};
exports.generateActionableSummary = generateActionableSummary;
