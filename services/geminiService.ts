import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const refineFeedbackWithAI = async (text: string, type: 'positive' | 'constructive'): Promise<string> => {
  if (!text || text.trim().length < 5) return text;
  if (!apiKey) {
    console.warn("API Key missing for Gemini");
    return text;
  }

  // Adjusted prompts for Lecturer Reporting Context
  const promptType = type === 'positive' 
    ? "Ubah kalimat ini menjadi laporan 'Praktik Baik' (Good Practices) yang formal, profesional, dan ringkas untuk dilaporkan ke manajemen universitas." 
    : "Ubah kalimat keluhan/kendala ini menjadi laporan hambatan perkuliahan yang objektif, formal, dan solutif untuk disampaikan ke Direktorat Pendidikan.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Kamu adalah asisten administrasi akademik di Universitas.
        Tugas: ${promptType}
        
        Teks Asli: "${text}"
        
        Hasil (hanya teks hasil revisi):
      `,
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini refinement failed:", error);
    return text; // Fallback to original
  }
};

export const analyzeSentiment = async (feedback: string): Promise<{ sentiment: string; summary: string }> => {
  if (!apiKey) return { sentiment: "Netral", summary: "Tidak dapat menganalisis (API Key missing)." };
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analisis laporan monev dosen berikut.
        1. Tentukan status laporan (Lancar / Ada Kendala Minor / Butuh Perhatian).
        2. Berikan ringkasan eksekutif satu kalimat.
        
        Laporan: "${feedback}"
        
        Format output JSON:
        {
          "sentiment": "...",
          "summary": "..."
        }
      `,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Analysis failed", error);
    return { sentiment: "Unknown", summary: "Gagal menganalisis." };
  }
};