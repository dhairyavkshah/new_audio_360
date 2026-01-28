const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

app.get('/api/archive/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    
    const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&mediatype=audio&output=json&rows=15&fl[]=identifier,title,creator,collection`;
    
    const response = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `Archive.org returned ${response.status}` });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Proxy] Search error:', error.message);
    res.status(500).json({ error: 'Failed to fetch from Archive.org' });
  }
});

app.get('/api/archive/metadata/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const metadataUrl = `https://archive.org/metadata/${identifier}`;
    
    const response = await fetch(metadataUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: `Archive.org returned ${response.status}` });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Proxy] Metadata error:', error.message);
    res.status(500).json({ error: 'Failed to fetch metadata from Archive.org' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Proxy] Archive.org proxy server running on port ${PORT}`);
});
