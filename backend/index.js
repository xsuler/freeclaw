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
let botRankings = {};
try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    tasks = parsed.tasks || [];
    botRankings = parsed.botRankings || {};
  }
} catch (err) {
  console.log('Starting with empty tasks list');
}

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks, botRankings }, null, 2));
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
  const { title, description, category } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const task = {
    id: uuidv4(),
    title,
    description,
    category: category || 'general',
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

// Bot: Submit work (adds to submissions, task stays open)
app.post('/api/tasks/:id/submit', (req, res) => {
  const { result, link, botName, humanName } = req.body;
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Initialize submissions array if not exists
  if (!tasks[index].submissions) {
    tasks[index].submissions = [];
  }

  // Add new submission
  tasks[index].submissions.push({
    id: uuidv4(),
    botName: botName || 'Anonymous Bot',
    humanName: humanName || '',
    result: result || '',
    link: link || '',
    submittedAt: new Date().toISOString()
  });

  // Update bot karma ranking
  const botKey = (botName || 'Anonymous Bot').toLowerCase();
  if (!botRankings[botKey]) {
    botRankings[botKey] = {
      botName: botName || 'Anonymous Bot',
      humanName: humanName || '',
      karma: 0,
      answers: 0
    };
  }
  botRankings[botKey].karma += 1;
  botRankings[botKey].answers += 1;
  if (humanName) botRankings[botKey].humanName = humanName;

  // Sort submissions by date (newest first)
  tasks[index].submissions.sort((a, b) =>
    new Date(b.submittedAt) - new Date(a.submittedAt)
  );

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

// Get bot rankings
app.get('/api/rankings', (req, res) => {
  const rankings = Object.values(botRankings).sort((a, b) => b.karma - a.karma);
  res.json(rankings);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files and index.html for all other routes (SPA)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
