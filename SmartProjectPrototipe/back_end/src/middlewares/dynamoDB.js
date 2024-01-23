const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const jwt = require('./jwt');

const docClient = new AWS.DynamoDB.DocumentClient();

const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env_REGION,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

console.log('Sto provando a connettermi a DynamoDB...');

const checkEmail = async (email) => {
  const params = {
    Key: { "Email": email },
    TableName: 'Email_Table'
  };

  try {
    const data = await docClient.get(params).promise();
    return data.Item;
  } catch (err) {
    console.error('Errore nella lettura dalla tabella Email:', JSON.stringify(err, null, 2));
    return null;
  }
}

const checkUserPermissions = (user, userID, role) => {
  // Se l'utente richiedente è un medico o un super utente, permetti l'accesso
  if (role === 'medical' || role === 'super') {
    return true;
  }

  // Se l'utente richiedente è un utente normale, verifica che l'ID corrisponda
  return user.UserID === userID;
};

const getUserByEmail = async (email, requestingUser) => {
  const emailItem = await checkEmail(email);

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

  try {
    const userData = await docClient.get(userParams).promise();
    console.log('Dati utente letti dalla tabella User:', JSON.stringify(userData, null, 2));

    if (!checkUserPermissions(userData.Item, userID, requestingUser)) {
      return null;
    }

    return userData.Item;
  } catch (error) {
    console.error('Errore nella lettura dell\'utente dalla tabella User:', error);
    throw error;
  }
};

const checkEmailAsync = async (email) => {
  const params = {
    Key: { "Email": email },
    TableName: 'Email_Table'
  };

  try {
    const data = await docClient.get(params).promise();
    return data.Item;
  } catch (error) {
    console.error('Errore nella lettura dalla tabella Email:', JSON.stringify(error, null, 2));
    throw error;
  }
};

const insertUser = async (user) => {
  const emailItem = await checkEmail(user.Email);

  if (emailItem) {
    console.log('L\'indirizzo email esiste già nella tabella Email.');
    return null;
  }

  user.UserID = uuidv4();
  user.Password = await hashPassword(user.Password);

  const conditions = [];
  user.Conditions = conditions;

  const paramsUser = {
    TableName: 'User_Table',
    Item: user,
  };

  try {
    await docClient.put(paramsUser).promise();
    console.log('Utente inserito con successo:', JSON.stringify(paramsUser.Item, null, 2));

    const paramsEmail = {
      TableName: 'Email_Table',
      Item: {
        'Email': user.Email,
        'UserID': user.UserID,
      },
    };

    await docClient.put(paramsEmail).promise();
    console.log('Email inserita con successo nella tabella Email.');

    return paramsUser.Item;
  } catch (err) {
    console.error('Errore nell\'inserimento dell\'utente:', JSON.stringify(err, null, 2));
    throw err;
  }
}

const updateUser = async (user, userID, role) => {
  if (!checkUserPermissions(user, userID, role)) {
    throw { message: 'Accesso non autorizzato' };
  }

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

  let updateExpression = 'SET';
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};

  Object.keys(user).forEach((key) => {
    if (key !== 'UserID' && key !== 'Password' && user[key] !== undefined && user[key] !== null) {
      updateExpression += ` #${key} = :${key},`;
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = user[key];
    }
  });

  updateExpression = updateExpression.slice(0, -1);

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

const deleteUser = async (user, userID, requestingUser) => {
  if (!checkUserPermissions(user, userID, requestingUser)) {
    throw { message: 'Accesso non autorizzato' };
  }

  const params = {
    TableName: 'User_Table',
    Key: {
      'UserID': user.UserID,
    },
  };

  try {
    await docClient.delete(params).promise();
    console.log('Utente eliminato con successo.');
  } catch (err) {
    console.error('Errore nell\'eliminazione dell\'utente:', JSON.stringify(err, null, 2));
    throw err;
  }
}

const getUserById = async (userID, role) => {
  const userParams = {
    TableName: 'User_Table',
    Key: {
      'UserID': userID,
    },
  };

  try {
    const userData = await docClient.get(userParams).promise();

    if (!checkUserPermissions(userData.Item, userID, role)) {
      return null;
    }

    return userData.Item;
  } catch (error) {
    console.error('Errore nella lettura dell\'utente dalla tabella User:', error);
    throw error;
  }
}

const authenticateUser = async (email, password, role) => {
  try {
    const userData = await getUserByEmail(email, role);

    if (userData) {
      const storedPassword = userData.Password;
      const passwordMatch = await bcrypt.compare(password, storedPassword);

      if (passwordMatch) {
        const token = jwt.setToken(userData.UserID, userData.Email);
        return { token: token, userID: userData.UserID };
      } else {
        console.log("La password non corrisponde");
        return null;
      }
    } else {
      console.log("L'utente non è stato trovato con l'email specificata");
      return null;
    }
  } catch (error) {
    console.error('Errore durante l\'autenticazione:', error);
    throw error;
  }
};

const updateConditions = async (userID, role, conditions) => {
  try {
    const user = await getUserById(userID, role);

    if (user) {
      if (!checkUserPermissions(user, userID, role)) {
        throw { message: 'Accesso non autorizzato' };
      }

      const updatedUser = { ...user, Conditions: conditions };
      const updatedUserData = await updateUser(updatedUser, userID, role);
      return { updatedUserData: updatedUserData };
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
