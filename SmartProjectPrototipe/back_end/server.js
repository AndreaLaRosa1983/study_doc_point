const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const userRoutes = require('./src/routes/userRoutes');
const ruoterLogin = require('./src/routes/loginRouter');
const mid = require ('./src/middlewares/mid');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(bodyParser.json());

app.use('/login', ruoterLogin);
app.use('/user', userRoutes);

app.listen(port, () => {
  console.log(`Il server è in ascolto sulla porta ${port}`);
});
//qui cifratura token una prima rotta non sarà protetta ma sarà quella che dovrà rilasciare il token. 
app.get('/',[mid.checkAuth], (rew,res) => {
  res.end("Ciao");
});