const jwt = require('jsonwebtoken');
const secretKey = 'il_tuo_segreto_supersegreto';
const users = [];  // Array per salvare temporaneamente gli utenti

// Mock Super User
users.push({ username: 'super', password: 'user', role: 'super' });

const registerUser = (req, res) => {
  const { username, password } = req.body; // i dati devono essere di più

  // Verifica se l'utente esiste già
  const existingUser = users.find(user => user.username === username); // qui va fatta la chiamata di verifica a dynamodb
  if (existingUser) {
    return res.status(400).json({ message: 'Username già in uso' });
  }

  // Registra il nuovo utente
  const newUser = { username, password, role: 'user' };
  const fakevariabletest = { username, password};
  users.push(newUser); // qui va fatto l'inserimento su dynamo db

  res.json({ message: 'Registrazione utente avvenuta con successo', user: newUser });
};



const registerMedical = (req, res) => {
  const { username, password, superUserAuth } = req.body;

  // Verifica se il superUserAuth è valido (deve essere true)
  if (!superUserAuth) {
    return res.status(403).json({ message: 'Autorizzazione super user richiesta' });
  }

  // Registra il nuovo medical user
  const newMedicalUser = { username, password, role: 'medical' };
  users.push(newMedicalUser);

  res.json({ message: 'Registrazione medical user avvenuta con successo', user: newMedicalUser });
};

const registerSuper = (req, res) => {
  const { username, password } = req.body;

  // Verifica se l'utente esiste già
  const existingUser = users.find(user => user.username === username);
  if (existingUser) {
    return res.status(400).json({ message: 'Username già in uso' });
  }

  // Registra il nuovo super user
  const newSuperUser = { username, password, role: 'super' };
  users.push(newSuperUser);

  res.json({ message: 'Registrazione super user avvenuta con successo', user: newSuperUser });
};

const login = (req, res) => {
  const { username, password } = req.body;

  // Verifica se le credenziali sono corrette
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Credenziali non valide' });
  }

  // Genera il token JWT
  const token = jwt.sign({ username, role: user.role }, secretKey, { expiresIn: '1h' });

  res.json({ message: 'Login avvenuto con successo', token });
};

module.exports = {
  registerUser,
  registerMedical,
  registerSuper,
  login,
};
