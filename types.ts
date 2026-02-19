
export type QuestionType = 'likert' | 'choice' | 'text';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // Array of strings for 'choice' type
}

export interface Category {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface FormData {
  nip: string; 
  lecturerName: string;
  subject: string;
  classCode: string;
  semester: string;
  answers: Record<string, string | number>; // Changed from ratings (number only) to answers
  positiveFeedback: string;
  constructiveFeedback: string;
}

export interface Submission extends FormData {
  id: string;
  timestamp: string;
}

export interface Lecturer {
  id: string;
  nip: string;
  name: string;
  department: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface AppData {
  lecturers: Lecturer[];
  subjects: Subject[];
  categories: Category[];
  submissions: Submission[];
}
