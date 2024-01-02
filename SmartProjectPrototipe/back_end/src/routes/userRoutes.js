const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const verifyToken = require('../middlewares/verifyToken');

// Rotte utente
router.post('/register/user', UserController.registerUser);
router.post('/register/medical', UserController.registerMedical);
router.post('/register/super', UserController.registerSuper);
//router.post('/login', UserController.login);

router.get('/protected', verifyToken(), (req, res) => {
  res.json({ message: 'Hai accesso al percorso protetto!', user: req.user });
});

module.exports = router;
