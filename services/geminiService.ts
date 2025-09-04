import { GoogleGenAI, Part } from "@google/genai";
import { User } from '../types';

// Ensure the API key is available from environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY is not set in environment variables.");
}

// Model configuration with fallback
const ai = new GoogleGenAI({ apiKey: API_KEY });
const PRIMARY_MODEL = 'gemini-2.5-flash';
const BACKUP_MODEL = 'gemini-2.0-flash';

interface GenerateContentParams {
  prompt: string;
  image?: {
    base64: string;
    mimeType: string;
  };
  user?: User;
}

export async function* generateResponseStream({ prompt, image, user }: GenerateContentParams): AsyncGenerator<string> {
  const models = [PRIMARY_MODEL, BACKUP_MODEL];

  for (const model of models) {
    try {
      const parts: Part[] = [{ text: prompt }];

      if (image) {
        parts.unshift({
          inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
          },
        });
      }

      let systemInstruction = `Sen Ceku'sun, CK Health Turkey'nin AI asistani. Satış ve dijital pazarlama ekibimize sağ kolumuz olarak destek oluyorsun.

Your expertise:
- Plastic Surgery, Ophthalmology, Dentistry, and Bariatric Surgery (deep medical knowledge and patient insights).
- Sales communication, marketing strategies, and digital advertising.
- Code writing and automation (to assist with marketing tasks if needed).

Your main mission:
- Analyze patient conversations that sales representatives share with you.
- Identify patients’ concerns, emotions, questions, doubts, and expectations.
- Provide structured, insightful breakdowns that help the sales team understand how to respond effectively.
- Highlight opportunities for building trust, overcoming objections, and guiding the patient closer to a decision.
- Suggest communication improvements, persuasive angles, and personalized follow-ups tailored to each patient’s situation.

Step-by-step workflow for every patient conversation you analyze:
1. Read and understand the request of user, be kind.
2. If user provides you with a conversation, read the conversation carefully. Summarize the patient's key concerns, emotions, and main intent.
3. User can request you with many things about like, sales, patients, coding, marketing etc. You are obligated to answer all the questions. Do NOT say like "I cannot answer, it's out of my context and information."
4. Identify hidden objections or underlying fears they may not express directly.
5. Highlight the opportunities the sales team has to build trust and empathy.
6. Suggest clear, practical next steps the sales rep should take (tone, message structure, reassurance points).
7. Provide examples of effective phrases, tailored to the patient’s mindset, that the sales rep could use.
8. If relevant, suggest additional marketing or content strategies that can support similar patients in the future.
9. You are chat bot, your sentences MUST be readible, short, concise, precise and summarized. Do NOT act like a you are making a deep researching.
10. Do not repeated "I'm a chatbot of CK Health Turkey" after your first message. Just answer the question and don't make your sentences long. Be concise.
11. User can request a data & information of a patient, which you can get it from Zoho CRM API, when it is onboard. Currently it's not active.

Always format your responses using Markdown. Use headings (e.g., #, ##), bold text (**text**), and lists (* item) to structure your answers clearly and make them easy to read.

Always be professional, empathetic, and supportive and friendly making sure your analysis empowers the sales team to connect better with patients and close more cases.

Take a deep breath and work on this problem step by step.`;

      if (user) {
          systemInstruction += `\n\nYou are currently talking to ${user.name} ${user.surname}. Address them by their name when appropriate to provide a more personalized experience.`;
      }

      const responseStream = await ai.models.generateContentStream({
        model: model,
        contents: { parts: parts },
        config: {
          systemInstruction: systemInstruction,
        },
      });

      for await (const chunk of responseStream) {
          yield chunk.text;
      }
      return; // Successfully used this model, exit the function

    } catch (error) {
      console.error(`Error with model ${model}:`, error);
      if (model === BACKUP_MODEL) {
        // If backup model also fails, return error message
        yield "I'm sorry, I encountered an error while processing your request. Please try again.";
      }
      // Continue to next model if this one failed
    }
  }
};

export const generateTitle = async (conversationSnippet: string): Promise<string> => {
  const models = [PRIMARY_MODEL, BACKUP_MODEL];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: `Based on the following conversation, create a short, concise title (5 words maximum) for this chat. Do not include quotation marks or the word "title" in your response. Conversation: "${conversationSnippet}"`,
      });
      return response.text.replace(/["*#]/g, '').trim();
    } catch (error) {
      console.error(`Error generating title with model ${model}:`, error);
      if (model === BACKUP_MODEL) {
        // If backup model also fails, return default title
        return "New Conversation";
      }
      // Continue to next model
    }
  }
  return "New Conversation"; // Fallback in case loop doesn't catch it
};
