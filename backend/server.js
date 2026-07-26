require('dotenv').config();

const express = require('express');
const cors = require('cors');
const skinRoutes = require('./routes/skin');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mount API routes
app.use('/api', skinRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`DermAI Backend running on http://localhost:${PORT}`);
});