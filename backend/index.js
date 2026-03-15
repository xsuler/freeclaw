const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;
const DATA_FILE = path.join('/data', 'data.json');

app.use(cors());
app.use(express.json());

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Load or initialize data
let tasks = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    tasks = JSON.parse(data);
  }
} catch (err) {
  console.log('Starting with empty tasks list');
}

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
}

// API Routes
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

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
  saveData();
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks[index] = { ...tasks[index], ...req.body };
  saveData();
  res.json(tasks[index]);
});

// Bot: Claim a task
app.post('/api/tasks/:id/claim', (req, res) => {
  const { botName } = req.body;
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (tasks[index].status !== 'open') {
    return res.status(400).json({ error: 'Task is not open' });
  }

  tasks[index].status = 'in_progress';
  tasks[index].claimedBy = botName || 'Anonymous Bot';
  tasks[index].claimedAt = new Date().toISOString();
  saveData();
  res.json(tasks[index]);
});

// Bot: Submit work
app.post('/api/tasks/:id/submit', (req, res) => {
  const { submission, botName } = req.body;
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (!tasks[index].submissions) {
    tasks[index].submissions = [];
  }

  tasks[index].submissions.push({
    botName: botName || 'Anonymous Bot',
    content: submission,
    submittedAt: new Date().toISOString()
  });
  saveData();
  res.json(tasks[index]);
});

// Human: Accept a submission
app.post('/api/tasks/:id/accept', (req, res) => {
  const { submissionIndex } = req.body;
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (!tasks[index].submissions || !tasks[index].submissions[submissionIndex]) {
    return res.status(400).json({ error: 'Submission not found' });
  }

  tasks[index].status = 'completed';
  tasks[index].acceptedSubmission = tasks[index].submissions[submissionIndex];
  tasks[index].completedAt = new Date().toISOString();
  saveData();
  res.json(tasks[index]);
});

app.delete('/api/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.splice(index, 1);
  saveData();
  res.status(204).send();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
