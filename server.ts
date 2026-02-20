import express from 'express';
import { createServer as createViteServer } from 'vite';
import { SUBJECTS, MOCK_LECTURERS, QUESTION_CATEGORIES } from './constants';
import { AppData, Submission, Category, Lecturer, Subject } from './types';

// In-memory storage
let lecturers: Lecturer[] = [...MOCK_LECTURERS];
let subjects: Subject[] = [...SUBJECTS];
let categories: Category[] = [...QUESTION_CATEGORIES];
let submissions: Submission[] = [];

// Seed data if empty (Optional, for better UX)
if (categories.length === 0) {
    categories = [
        {
            id: 'cat_1',
            title: 'Pedagogik',
            description: 'Kemampuan mengelola pembelajaran',
            questions: [
                { id: 'q1', text: 'Dosen menyampaikan materi dengan jelas', type: 'likert' },
                { id: 'q2', text: 'Dosen menggunakan metode pembelajaran yang variatif', type: 'likert' }
            ]
        },
        {
            id: 'cat_2',
            title: 'Profesional',
            description: 'Penguasaan materi pembelajaran',
            questions: [
                { id: 'q3', text: 'Dosen menguasai materi perkuliahan', type: 'likert' },
                { id: 'q4', text: 'Dosen menjawab pertanyaan mahasiswa dengan baik', type: 'likert' }
            ]
        }
    ];
}

if (lecturers.length === 0) {
    lecturers = [
        { id: 'l1', nip: '198001012005011001', name: 'Dr. Budi Santoso', department: 'Fakultas Kedokteran' },
        { id: 'l2', nip: '198502022010012002', name: 'Prof. Siti Aminah', department: 'Fakultas Ekonomi dan Bisnis' }
    ];
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api', (req, res) => {
    const action = req.query.action;

    if (action === 'get_app_data') {
        const data: AppData = {
            lecturers,
            subjects,
            categories,
            submissions
        };
        return res.json(data);
    }

    res.status(404).json({ error: 'Action not found' });
  });

  app.post('/api', (req, res) => {
    const action = req.query.action;
    const body = req.body;

    if (action === 'add_submission') {
        const submission: Submission = {
            ...body,
            id: body.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: body.timestamp || new Date().toISOString()
        };
        submissions.unshift(submission); // Add to beginning
        return res.json({ success: true, id: submission.id });
    }

    if (action === 'delete_submission') {
        const { id } = body;
        submissions = submissions.filter(s => s.id !== id);
        return res.json({ success: true });
    }

    if (action === 'update_lecturers') {
        if (Array.isArray(body)) {
            lecturers = body;
            return res.json({ success: true });
        }
        return res.status(400).json({ error: 'Invalid data' });
    }

    if (action === 'update_categories') {
        if (Array.isArray(body)) {
            categories = body;
            return res.json({ success: true });
        }
        return res.status(400).json({ error: 'Invalid data' });
    }

    res.status(404).json({ error: 'Action not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving (if built)
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
