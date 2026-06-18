const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const IMGBB_KEY = 'b59b77453337b7d29c865ed75ad39305';

router.post('/', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.json({ error: 'Rasm yoq' });

    const base64 = image.replace(/^data:image\/\w+;base64,/, '');

    const params = new URLSearchParams();
    params.append('key', IMGBB_KEY);
    params.append('image', base64);

    const r = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: params
    });
    const d = await r.json();
    if (d.success) return res.json({ url: d.data.url });
    return res.json({ error: JSON.stringify(d) });
  } catch(e) {
    return res.json({ error: e.message });
  }
});

module.exports = router;
