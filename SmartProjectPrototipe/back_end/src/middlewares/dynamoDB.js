// dynamoDBService.js
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const jwt = require('./jwt');

const docClient = new AWS.DynamoDB.DocumentClient();

const hashPassword = async (password) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_REGION,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

console.log('Sto provando a connettermi a DynamoDB...');

let checkEmail = (email, callback) => {
  var params = {
    Key: { "Email": email },
    TableName: 'Email_Table'
  };

  docClient.get(params, (err, data) => {
    if (err) {
      console.error('Errore nella lettura dalla tabella Email:', JSON.stringify(err, null, 2));
      callback(err, null);
    } else {
      callback(null, data.Item); // Passa direttamente l'item trovato alla callback
    }
  });
}

// Funzione per ottenere l'utente tramite l'email
let getUserByEmail = async (email, requestingUser) => {
  try {
    const emailItem = await checkEmailAsync(email);

    if (!emailItem) {
      console.log('Indirizzo email non trovato nella tabella Email.');
      return null;
    }

    const userID = emailItem.UserID;

    const userParams = {
      TableName: 'User_Table',
      Key: {
        'UserID': userID,
      }
    };

    const userData = await docClient.get(userParams).promise();

    console.log('Dati utente letti dalla tabella User:', JSON.stringify(userData, null, 2));

    // Verifica le autorizzazioni prima di restituire i dati utente
    if (!checkUserPermissions(userData.Item, userID, requestingUser)) {
      return null;
    }

    return userData.Item;
  } catch (error) {
    console.error('Errore nella lettura dell\'utente dalla tabella User:', error);
    throw error;
  }
};

// Funzione ausiliaria per il check dell'email
let checkEmailAsync = async (email) => {
  const params = {
    Key: { "Email": email },
    TableName: 'Email_Table'
  };

  const data = await docClient.get(params).promise();

  return data.Item;
};

// Funzione per l'inserimento di un nuovo utente
let insertUser = (user, callback) => {
  // Verifica se l'email esiste già nella tabella delle email
  checkEmail(user.Email, async (err, emailItem) => {
    if (err) {
      callback(err, null);
    } else {
      if (emailItem) {
        // L'email esiste già, quindi non possiamo inserire un nuovo utente
        console.log('L\'indirizzo email esiste già nella tabella Email.');
        callback(null, null);
      } else {
        // L'email non esiste, possiamo procedere con l'inserimento dell'utente
        user.UserID = uuidv4();
        const hashedPassword = await hashPassword(user.Password);
        user.Password = hashedPassword;
        console.log("hashedPW: " + hashedPassword);

        // Inizializza la lista delle conditions
        const conditions = [];

        // Aggiungi l'attributo Medical
        user.Medical = user.Medical || false;

        // Aggiungi l'attributo Conditions all'utente
        user.Conditions = conditions;

        const paramsUser = {
          TableName: 'User_Table',
          Item: user,
        };

        docClient.put(paramsUser, (err) => {
          if (err) {
            console.error('Errore nell\'inserimento dell\'utente:', JSON.stringify(err, null, 2));
            callback(err, null);
          } else {
            console.log('Utente inserito con successo:', JSON.stringify(paramsUser.Item, null, 2));

            // Ora aggiungiamo l'email nella tabella delle email
            const paramsEmail = {
              TableName: 'Email_Table',
              Item: {
                'Email': user.Email,
                'UserID': user.UserID,
              },
            };

            docClient.put(paramsEmail, (err) => {
              if (err) {
                console.error('Errore nell\'inserimento dell\'email:', JSON.stringify(err, null, 2));
                callback(err, null);
              } else {
                console.log('Email inserita con successo nella tabella Email.');
                callback(null, paramsUser.Item);
              }
            });
          }
        });
      }
    }
  });
}

// Funzione per l'aggiornamento di un utente esistente
let updateUser = (user, userID, requestingUser, callback) => {
  // Verifica le autorizzazioni prima di procedere con l'aggiornamento
  if (!checkUserPermissions(user, userID, requestingUser)) {
    return callback({ message: 'Accesso non autorizzato' }, null);
  }

  const params = {
    TableName: 'User_Table',
    Key: {
      'UserID': user.UserID,
    },
    UpdateExpression: 'SET #name = :name, #age = :age, #conditions = :conditions',
    ExpressionAttributeNames: {
      '#name': 'Name',
      '#age': 'Age',
      '#conditions': 'Conditions',
    },
    ExpressionAttributeValues: {
      ':name': user.Name,
      ':age': user.Age,
      ':conditions': user.Conditions || [],
    },
    ReturnValues: 'ALL_NEW',
  };

  docClient.update(params, (err, data) => {
    if (err) {
      console.error('Errore nell\'aggiornamento dell\'utente:', JSON.stringify(err, null, 2));
      callback(err, null);
    } else {
      console.log('Utente aggiornato con successo:', JSON.stringify(data.Attributes, null, 2));
      callback(null, data.Attributes);
    }
  });
}

// Funzione per l'eliminazione di un utente
let deleteUser = (user, userID, requestingUser, callback) => {
  // Verifica le autorizzazioni prima di procedere con l'eliminazione
  if (!checkUserPermissions(user, userID, requestingUser)) {
    return callback({ message: 'Accesso non autorizzato' });
  }

  const params = {
    TableName: 'User_Table',
    Key: {
      'UserID': user.UserID,
    },
  };

  docClient.delete(params, (err) => {
    if (err) {
      console.error('Errore nell\'eliminazione dell\'utente:', JSON.stringify(err, null, 2));
      callback(err);
    } else {
      console.log('Utente eliminato con successo.');
      callback(null);
    }
  });
}

// Funzione per ottenere l'utente tramite l'ID
let getUserById = async (userID, requestingUser) => {
  const userParams = {
    TableName: 'User_Table',
    Key: {
      'UserID': userID,
    },
  };

  try {
    const userData = await docClient.get(userParams).promise();

    console.log('Dati utente letti dalla tabella User:', JSON.stringify(userData, null, 2));

    // Verifica le autorizzazioni prima di restituire i dati utente
    if (!checkUserPermissions(userData.Item, userID, requestingUser)) {
      return null;
    }

    return userData.Item;
  } catch (error) {
    console.error('Errore nella lettura dell\'utente dalla tabella User:', error);
    throw error;
  }
}

// Funzione per verificare le autorizzazioni dell'utente
let checkUserPermissions = (user, userID, requestingUser) => {
  // Se l'utente richiedente è un medico o un super utente, permetti l'accesso
  if (requestingUser.role === 'medical' || requestingUser.role === 'super') {
    return true;
  }

  // Se l'utente richiedente è un utente normale, verifica che l'ID corrisponda
  return user.UserID === userID;
}


let authenticateUser = async (email, password, callback) => {
  try {
    // Ottieni l'utente tramite l'email
    const userData = await getUserByEmail(email);

    if (userData) {
      // L'utente è stato trovato, verifica la password
      const storedPassword = userData.Password;
      const passwordMatch = await bcrypt.compare(password, storedPassword);

      if (passwordMatch) {
        console.log("Qui in authenticate 1");

        // Genera un token JWT
        const token = jwt.setToken(userData.UserID, userData.Email);

        // Invia il token al frontend
        callback(null, { token: token });
      } else {
        // La password non corrisponde
        console.log("Qui in authenticate 2");
        callback(null, null);
      }
    } else {
      // L'utente non è stato trovato con l'email specificata
      console.log("Qui in authenticate 3...");
      callback(null, null);
    }
  } catch (error) {
    console.error('Errore durante l\'autenticazione:', error);
    callback(error, null);
  }
};

module.exports = {
  hashPassword,
  getUserByEmail,
  insertUser,
  updateUser,
  deleteUser,
  authenticateUser,
  getUserById,
};
