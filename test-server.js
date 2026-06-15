<<<<<<< HEAD
// test-server.js
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

app.post('/api/send-order-email', (req, res) => {
  console.log('📧 Email request received:', req.body);
  res.json({ success: true, message: 'Email endpoint working!' });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`✅ GET /api/health`);
  console.log(`✅ POST /api/send-order-email`);
=======
// test-server.js
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running!' });
});

app.post('/api/send-order-email', (req, res) => {
  console.log('📧 Email request received:', req.body);
  res.json({ success: true, message: 'Email endpoint working!' });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`✅ GET /api/health`);
  console.log(`✅ POST /api/send-order-email`);
>>>>>>> a114dcbce2976d5fa2df1449a65be436e3b40d57
});