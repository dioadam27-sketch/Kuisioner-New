// GenAI integration has been removed as requested.
// These functions now act as pass-throughs to maintain type compatibility if imported.

export const refineFeedbackWithAI = async (text: string, type: 'positive' | 'constructive'): Promise<string> => {
  // Return original text without modification
  return text;
};

export const analyzeSentiment = async (feedback: string): Promise<{ sentiment: string; summary: string }> => {
  // Return default neutral response
  return { sentiment: "Netral", summary: "Analisis AI dinonaktifkan." };
};