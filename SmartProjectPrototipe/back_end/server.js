const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const userRoutes = require('./src/routes/userRoutes');
const mid = require('./src/middlewares/mid');
const dynamoDB = require('./src/middlewares/dynamoDB');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

// Middleware per verificare l'autenticazione in tutte le route tranne /login
app.use((req, res, next) => {
  if (req.path !== '/login') {
    mid.checkAuth(req, res, next);
  } else {
    next();
  }
});

// Route per gestire la registrazione di un nuovo utente
app.post('/register', async (req, res) => {
  const userData = req.body;

  try {
    const newUser = await dynamoDB.insertUser(userData);
    if (newUser) {
      res.status(201).json({ message: 'Utente registrato con successo', user: newUser });
    } else {
      res.status(400).json({ error: 'L\'indirizzo email esiste già' });
    }
  } catch (error) {
    console.error('Errore durante la registrazione dell\'utente:', error);
    res.status(500).json({ error: 'Errore durante la registrazione dell\'utente' });
  }
});

// Route per ottenere i dettagli di un utente
app.get('/user/:userID', [mid.checkAuth], async (req, res) => {
  const userID = req.params.userID;

  try {
    const user = await dynamoDB.getUserById(userID, 'user');
    if (user) {
      res.status(200).json({ user });
    } else {
      res.status(404).json({ error: 'Utente non trovato' });
    }
  } catch (error) {
    console.error('Errore durante la lettura dell\'utente:', error);
    res.status(500).json({ error: 'Errore durante la lettura dell\'utente' });
  }
});

// Route per aggiornare i dettagli di un utente
app.put('/user/:userID', [mid.checkAuth], async (req, res) => {
  const userID = req.params.userID;
  const updatedUserData = req.body;

  try {
    const updatedUser = await dynamoDB.updateUser(updatedUserData, userID, 'user');
    if (updatedUser) {
      res.status(200).json({ updatedUser });
    } else {
      res.status(404).json({ error: 'Utente non trovato' });
    }
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dell\'utente:', error);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento dell\'utente' });
  }
});

// Route per eliminare un utente
app.delete('/user/:userID', [mid.checkAuth], async (req, res) => {
  const userID = req.params.userID;

  try {
    await dynamoDB.deleteUser(userID, 'user', 'user');
    res.status(200).json({ message: 'Utente eliminato con successo' });
  } catch (error) {
    console.error('Errore durante l\'eliminazione dell\'utente:', error);
    res.status(500).json({ error: 'Errore durante l\'eliminazione dell\'utente' });
  }
});

// Route per ottenere le condizioni di un utente
app.get('/user/:userID/conditions', [mid.checkAuth], async (req, res) => {
  const userID = req.params.userID;

  try {
    const user = await dynamoDB.getUserById(userID, 'user');
    if (user) {
      res.status(200).json({ conditions: user.Conditions });
    } else {
      res.status(404).json({ error: 'Utente non trovato' });
    }
  } catch (error) {
    console.error('Errore durante la lettura delle condizioni dell\'utente:', error);
    res.status(500).json({ error: 'Errore durante la lettura delle condizioni dell\'utente' });
  }
});

// Route per aggiornare le condizioni di un utente
app.put('/user/:userID/conditions', [mid.checkAuth], async (req, res) => {
  const userID = req.params.userID;
  const conditions = req.body;

  try {
    const updatedUserData = await dynamoDB.updateConditions(userID, 'user', conditions);
    if (updatedUserData) {
      res.status(200).json({ updatedUserData });
    } else {
      res.status(404).json({ error: 'Utente non trovato' });
    }
  } catch (error) {
    console.error('Errore durante l\'aggiornamento delle condizioni dell\'utente:', error);
    res.status(500).json({ error: 'Errore durante l\'aggiornamento delle condizioni dell\'utente' });
  }
});

// Avvio del server sulla porta specificata
app.listen(port, () => {
  console.log(`Il server è in ascolto sulla porta ${port}`);
});
