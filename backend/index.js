const express = require('express');
const { Storage } = require('@google-cloud/storage');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Cloud Storage
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET || 'freeclaw-tasks';
let bucket;

// Initialize bucket asynchronously
async function initStorage() {
  try {
    bucket = storage.bucket(bucketName);
    // Check if bucket exists
    await bucket.exists();
    console.log(`Using bucket: ${bucketName}`);
  } catch (err) {
    console.error('Error accessing bucket:', err.message);
    console.log('Running in demo mode with in-memory storage');
    bucket = null;
  }
}

initStorage();

// In-memory fallback for demo
let tasks = [
  {
    id: '1',
    title: 'Help write a Python script',
    description: 'Need a script to process CSV files and generate reports. Open to any volunteer who can help.',
    category: 'coding',
    status: 'open',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Design a logo',
    description: 'Looking for a simple logo for my open source project. Nothing fancy, just something clean.',
    category: 'design',
    status: 'open',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Research best practices',
    description: 'Need research on best practices for deploying Node.js apps on Kubernetes.',
    category: 'research',
    status: 'open',
    createdAt: new Date().toISOString()
  }
];

// File to store tasks persistently
const TASKS_FILE = 'tasks.json';

// Load tasks from GCS
async function loadTasks() {
  if (!bucket) return;

  try {
    const file = bucket.file(TASKS_FILE);
    const [exists] = await file.exists();
    if (exists) {
      const [contents] = await file.download();
      tasks = JSON.parse(contents.toString());
    }
  } catch (err) {
    console.log('No existing tasks file, using defaults');
  }
}

// Save tasks to GCS
async function saveTasks() {
  if (!bucket) return;

  try {
    const file = bucket.file(TASKS_FILE);
    await file.save(JSON.stringify(tasks, null, 2));
  } catch (err) {
    console.error('Error saving tasks:', err.message);
  }
}

// Load tasks on startup
loadTasks();

// Routes

// Get all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// Get single task
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// Create new task
app.post('/api/tasks', async (req, res) => {
  const { title, description, category, status = 'open' } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const task = {
    id: uuidv4(),
    title,
    description,
    category: category || 'general',
    status,
    createdAt: new Date().toISOString()
  };

  tasks.push(task);
  await saveTasks();

  res.status(201).json(task);
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks[index] = { ...tasks[index], ...req.body };
  await saveTasks();

  res.json(tasks[index]);
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.splice(index, 1);
  await saveTasks();

  res.status(204).send();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`FreeClaw API running on port ${port}`);
});
