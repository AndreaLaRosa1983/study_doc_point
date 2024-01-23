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
  accessKeyId: process.env_REGION,
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

        // Inizializza la lista delle conditions
        const conditions = [];

        // Aggiungi l'attributo Conditions all'utente
        user.conditions = conditions;

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

let updateUser = async (user, userID, role) => {
  // Verifica le autorizzazioni prima di procedere con l'aggiornamento
  if (!checkUserPermissions(user, userID, role)) {
    throw { message: 'Accesso non autorizzato' };
  }

  // Se l'email viene modificata, aggiorna anche la tabella 'Email_Table'
  if (user.Email && user.Email !== undefined && user.Email !== null) {
    const emailParams = {
      TableName: 'Email_Table',
      Key: {
        'Email': user.Email,
      },
      UpdateExpression: 'SET #userId = :userId',
      ExpressionAttributeNames: {
        '#userId': 'UserID',
      },
      ExpressionAttributeValues: {
        ':userId': userID,
      },
    };

    await docClient.update(emailParams).promise();
  }

  // Costruisci dinamicamente l'espressione di aggiornamento per 'User_Table'
  let updateExpression = 'SET';
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};

  Object.keys(user).forEach((key) => {
    // Ignora UserID e altri campi che non devono essere aggiornati
    if (key !== 'UserID' && key !== 'Password' && user[key] !== undefined && user[key] !== null) {
      updateExpression += ` #${key} = :${key},`;
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = user[key];
    }
  });

  // Rimuovi l'ultima virgola dalla stringa di aggiornamento
  updateExpression = updateExpression.slice(0, -1);

  // Aggiorna 'User_Table'
  const params = {
    TableName: 'User_Table',
    Key: {
      'UserID': user.UserID,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const data = await docClient.update(params).promise();

  return data.Attributes;
};


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
let getUserById = async (userID, role) => {
  const userParams = {
    TableName: 'User_Table',
    Key: {
      'UserID': userID,
    },
  };

  try {
    const userData = await docClient.get(userParams).promise();

    // Verifica le autorizzazioni prima di restituire i dati utente
    if (!checkUserPermissions(userData.Item, userID, role)) {
      return null;
    }

    return userData.Item;
  } catch (error) {
    console.error('Errore nella lettura dell\'utente dalla tabella User:', error);
    throw error;
  }
}

// Funzione per verificare le autorizzazioni dell'utente
let checkUserPermissions = (user, userID, role) => {
  // Se l'utente richiedente è un medico o un super utente, permetti l'accesso
  if (role === 'medical' || role === 'super') {
    return true;
  }

  // Se l'utente richiedente è un utente normale, verifica che l'ID corrisponda
  return user.UserID === userID;
}


let authenticateUser = async (email, password, role, callback) => {
  try {
    const userData = await getUserByEmail(email, role);
    if (userData) {
      const storedPassword = userData.Password;
      const passwordMatch = await bcrypt.compare(password, storedPassword);

      if (passwordMatch) {
        const token = jwt.setToken(userData.UserID, userData.Email);
        callback(null, { token: token, userID: userData.UserID });
      } else {
        console.log("La password non corrisponde");
        callback(null, null);
      }
    } else {
      console.log("L'utente non è stato trovato con l'email specificata");
      callback(null, null);
    }
  } catch (error) {
    console.error('Errore durante l\'autenticazione:', error);
    callback(error, null);
  }
};

let updateConditions = async (userID, role, conditions, callback) => {
  try {
    const user = await getUserById(userID, role);
    console.log("sono qui dentro 1");
    if (user) {
      if (!checkUserPermissions(user, userID, role)) {
        throw { message: 'Accesso non autorizzato' };
      }
      console.log("sono qui dentro 2");
      const updatedUser = { ...user, conditions: conditions };
      console.log("sono qui dentro 3");
      const updatedUserData = await updateUser(updatedUser, userID, role);
      console.log("sono dentro 4");
      callback (null, { updatedUserData : updatedUserData});
    } else {
      console.log("L'utente non è stato trovato con l'ID specificato");
      return null;
    }
  } catch (error) {
    console.error('Errore durante l\'aggiornamento delle condizioni:', error);
    throw error;
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
  updateConditions
};
