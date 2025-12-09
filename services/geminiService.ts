import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeViolationImage = async (base64Image: string): Promise<AnalysisResult> => {
  const modelId = "gemini-2.5-flash"; // Fast and capable for multimodal tasks

  // Clean the base64 string if it contains the data URL prefix
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: "image/jpeg", // Assuming JPEG for simplicity, or we could detect
            },
          },
          {
            text: "Analyze this image for a traffic violation report. Extract the license plate number clearly. Describe the vehicle (color, make, model guess). Identify potential violations (e.g., parking in red zone, speeding, expired tags, etc). If no license plate is visible, state 'UNKNOWN'.",
          },
        ],
      },
      config: {
        systemInstruction: "You are an automated traffic enforcement assistant. Your goal is to accurately transcribe license plate data and vehicle descriptions from user-submitted photos.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            licensePlate: {
              type: Type.STRING,
              description: "The extracted license plate characters, uppercase, no spaces. Return 'UNKNOWN' if not legible.",
            },
            vehicleDescription: {
              type: Type.STRING,
              description: "A short description of the vehicle's color, make, and model.",
            },
            violationType: {
              type: Type.STRING,
              description: "The apparent violation type based on visual context, or 'None observed' if unclear.",
            },
          },
          required: ["licensePlate", "vehicleDescription"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini");
    }

    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
