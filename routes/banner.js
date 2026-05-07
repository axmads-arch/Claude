const express = require('express');
const router = express.Router();

let bannerData = {
  title: 'Yangi mahsulotlar! 🎉',
  subtitle: 'Har kuni yangi va mazali taomlar',
  emoji: '🍩'
};

router.get('/', (req, res) => {
  res.json(bannerData);
});

router.put('/', (req, res) => {
  const { title, subtitle, emoji } = req.body;
  if (title) bannerData.title = title;
  if (subtitle) bannerData.subtitle = subtitle;
  if (emoji) bannerData.emoji = emoji;
  res.json(bannerData);
});

module.exports = router;
