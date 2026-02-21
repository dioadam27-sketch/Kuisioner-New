import { AppData, Submission, Category, Lecturer, Subject } from '../types';
import { MOCK_LECTURERS, SUBJECTS, QUESTION_CATEGORIES } from '../constants';

// Production API URL - External PHP
const API_URL = 'https://pkkii.pendidikan.unair.ac.id/monev/api.php'; 

// Fallback data if API fails or for initial state
const INITIAL_DATA: AppData = {
  lecturers: MOCK_LECTURERS,
  subjects: SUBJECTS,
  categories: QUESTION_CATEGORIES,
  submissions: []
};

// --- Helper for Fetching ---
const apiFetch = async (action: string, method: 'GET' | 'POST' = 'GET', body?: any) => {
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}?action=${action}`, options);
    
    if (!res.ok) {
        let errorMessage = `API Error: ${res.status} ${res.statusText}`;
        try {
            const errorBody = await res.json();
            if (errorBody.error) {
                errorMessage = errorBody.error;
            }
        } catch (e) { }
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
    return {
      lecturers: data.lecturers || [],
      subjects: data.subjects || [],
      categories: data.categories || [],
      submissions: data.submissions || []
    };
  } catch (e) {
    console.warn("Failed to fetch from API, using fallback/local data.");
    const stored = localStorage.getItem('monev_pdb_data_fallback');
    return stored ? JSON.parse(stored) : INITIAL_DATA;
  }
};

export const addSubmission = async (submission: Omit<Submission, 'id' | 'timestamp'>) => {
  try {
    await apiFetch('add_submission', 'POST', submission);
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