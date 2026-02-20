import { AppData, Submission, Category, Lecturer, Subject } from '../types';
import { MOCK_LECTURERS, SUBJECTS, QUESTION_CATEGORIES } from '../constants';

// --- API Configuration ---
export const getApiUrl = () => {
  return localStorage.getItem('MONEV_API_URL') || '/api';
};

export const setApiUrl = (url: string) => {
  localStorage.setItem('MONEV_API_URL', url);
};

// --- Helper for Fetching ---
const apiFetch = async (action: string, method: 'GET' | 'POST' = 'GET', body?: any) => {
  const baseUrl = getApiUrl();
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${baseUrl}?action=${action}`, options);
    
    // Robustness Check: Ensure response is actually JSON (catch PHP HTML errors)
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
        const text = await res.text();
        // Log the HTML error to console for debugging
        console.error("API returned non-JSON response:", text); 
        throw new Error(`Server Error (PHP): ${text.substring(0, 100)}...`);
    }

    if (!res.ok) {
        // Try to parse detailed error from JSON body
        let errorMessage = `API Error: ${res.status} ${res.statusText}`;
        try {
            const errorBody = await res.json();
            if (errorBody.error) {
                errorMessage = `API Error: ${errorBody.error}`;
            }
        } catch (e) {
            // If parsing failed, keep the generic message
        }
        throw new Error(errorMessage);
    }
    
    return await res.json();
  } catch (error) {
    console.error(`API Fetch Error [${action}]:`, error);
    throw error;
  }
};

// --- Data Methods ---

export const getAppData = async (): Promise<AppData> => {
  try {
    const data = await apiFetch('get_app_data');
    // Ensure structure matches AppData even if DB returns partials
    return {
      lecturers: data.lecturers || [],
      subjects: data.subjects || [],
      categories: data.categories || [],
      submissions: data.submissions || []
    };
  } catch (e) {
    console.warn("Failed to fetch from API, using fallback/local data.");
    // Fallback to local storage for offline capability or dev
    const stored = localStorage.getItem('monev_pdb_data_fallback');
    return stored ? JSON.parse(stored) : INITIAL_DATA;
  }
};

export const addSubmission = async (submission: Omit<Submission, 'id' | 'timestamp'>) => {
  // Optimistic ID generation
  const newSubmission: Submission = {
    ...submission,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };

  try {
    await apiFetch('add_submission', 'POST', newSubmission);
    // Success - Data saved to server
  } catch (e: any) {
    console.error("Submission failed:", e);
    alert(`Gagal menyimpan ke server: ${e.message}`);
    throw e;
  }
};

export const deleteSubmission = async (id: string) => {
  try {
    await apiFetch('delete_submission', 'POST', { id });
  } catch (e: any) {
    console.error("Delete failed:", e);
    throw e;
  }
};

// Helpers for Admin Updates
export const updateCategories = async (categories: Category[]) => {
  try {
    await apiFetch('update_categories', 'POST', categories);
  } catch (e: any) {
    console.error("Update Categories failed:", e);
    alert(`Gagal menyimpan kategori: ${e.message}`);
    throw e;
  }
};

export const updateLecturers = async (lecturers: Lecturer[]) => {
  try {
    await apiFetch('update_lecturers', 'POST', lecturers);
  } catch (e: any) {
    console.error("Update Lecturers failed:", e);
    alert(`Gagal menyimpan data dosen: ${e.message}`);
    throw e;
  }
};

export const updateSubjects = async (subjects: Subject[]) => {
   // Implementation would require an 'update_subjects' endpoint in PHP
   console.log("Subject update not fully implemented in API demo");
};