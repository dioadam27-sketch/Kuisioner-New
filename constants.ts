import { Category, Lecturer, Subject } from './types';

export const SEMESTERS = ["Ganjil 2024/2025", "Genap 2024/2025"];

export const FACULTIES = [
    "Fakultas Kedokteran",
    "Fakultas Kedokteran Gigi",
    "Fakultas Hukum",
    "Fakultas Ekonomi dan Bisnis",
    "Fakultas Farmasi",
    "Fakultas Kedokteran Hewan",
    "Fakultas Ilmu Sosial dan Ilmu Politik",
    "Fakultas Sains dan Teknologi",
    "Fakultas Psikologi",
    "Sekolah Pascasarjana",
    "Fakultas Kesehatan Masyarakat",
    "Fakultas Ilmu Budaya",
    "Fakultas Keperawatan",
    "Fakultas Perikanan dan Kelautan",
    "Fakultas Vokasi",
    "Fakultas Teknologi Maju dan Multidisiplin",
    "Fakultas Ilmu Kesehatan, Kedokteran, dan Ilmu Alam"
];

// Mata Kuliah PDB Default (Fixed)
export const SUBJECTS: Subject[] = [
    { id: "mk_pdb_01", name: "Pembelajaran Dasar Bersama (PDB)" }
];

export const MOCK_LECTURERS: Lecturer[] = [];

export const QUESTION_CATEGORIES: Category[] = [];