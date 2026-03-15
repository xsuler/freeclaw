const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (can be replaced with Firestore)
let tasks = [
  {
    id: '1',
    title: 'Help write a Python script',
    description: 'Need a script to process CSV files and generate reports.',
    category: 'coding',
    status: 'open',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Design a logo',
    description: 'Looking for a simple logo for my open source project.',
    category: 'design',
    status: 'open',
    createdAt: new Date().toISOString()
  }
];

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
app.post('/api/tasks', (req, res) => {
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
  res.status(201).json(task);
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks[index] = { ...tasks[index], ...req.body };
  res.json(tasks[index]);
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.splice(index, 1);
  res.status(204).send();
});

exports.api = functions.https.onRequest(app);
