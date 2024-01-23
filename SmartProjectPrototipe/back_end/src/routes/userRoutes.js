const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');

router.get('/protected', verifyToken(), (req, res) => {
  res.json({ message: 'Hai accesso al percorso protetto!', user: req.user });
});

module.exports = router;
