const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const userRoutes = require('./src/routes/userRoutes');
const ruoterLogin = require('./src/routes/loginRouter');
const mid = require ('./src/middlewares/mid');
const app = express();
const dynamoDB = require('./src/middlewares/dynamoDB');

const port = process.env.PORT || 3000;

const exampleUser = {
  Name: 'John', // Nome dell'utente
  LastName: 'Doe',
  DateOfBirth: '1983-05-19', // Età dell'utente
  Email: 'sample1@example.com', // Indirizzo email dell'utente
  Password: 'Password',
  Country: 'Italy',
  Diseases: [{IEEE7:'0000', Description:'allergy amoxicilline'},{IEEE7:'0001', Description:'Cluster Headache'}]
  // Altri campi utente, se presenti...
};


app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

//
app.use('/user', userRoutes);

const callback = (err, data) => {
  if (err) {
    console.error('Errore nella lettura dalla tabella Email:', JSON.stringify(err, null, 2));
  } else {
    console.log('Dati letti dalla tabella Email:', JSON.stringify(data, null, 2));
  }
};

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  await dynamoDB.authenticateUser(email, password, (err, authResult) => {
    if (err) {
      console.error('Errore durante l\'autenticazione:', err);
      res.status(500).json({ error: 'Errore durante l\'autenticazione' });
    } else {
      if (authResult) {
        // Autenticazione riuscita, restituisci il token e i dati dell'utente al client
        res.json({ token: authResult.token });
      } else {
        // Credenziali non valide
        res.status(401).json({ error: 'Credenziali non valide' });
      }
    }
  });
})

// ...

app.listen(port, () => {
  console.log(`Il server è in ascolto sulla porta ${port}`);
});
//qui cifratura token una prima rotta non sarà protetta ma sarà quella che dovrà rilasciare il token. 
app.get('/',[mid.checkAuth], (req,res) => {
  res.end("Sono la home");
});

