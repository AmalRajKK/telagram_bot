import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TransactionSchema = z.object({
  type: z.enum(['Expense', 'Income', 'Transfer']),
  amount: z.number(),
  category: z.string(),
  description: z.string().optional(),
  date: z.string().optional(), // ISO date string if recognizable
});

export type ParsedTransaction = z.infer<typeof TransactionSchema>;

export async function parseTransactionMessage(message: string): Promise<ParsedTransaction | null> {
  const prompt = `
You are a personal finance assistant. Extract transaction details from the following message.
Respond ONLY with a valid JSON object matching this schema, or null if it's not a transaction:
{
  "type": "Expense" | "Income" | "Transfer",
  "amount": number,
  "category": string (e.g., "Food", "Salary", "Rent"),
  "description": string (optional, context),
  "date": string (optional, ISO 8601 date format)
}

Message: "${message}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    const text = response.text?.replace(/```json|```/g, '').trim() || '';
    if (text === 'null') return null;

    const parsed = JSON.parse(text);
    return TransactionSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse message with Gemini:', error);
    return null;
  }
}
