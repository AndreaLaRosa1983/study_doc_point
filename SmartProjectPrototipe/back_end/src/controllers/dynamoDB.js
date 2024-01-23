const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const jwt = require('../middlewares/jwt');

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
    Key: { "email": email },
    TableName: 'Email_Table'
  };
  console.log(JSON.stringify(params));
  try {
    const data = await docClient.get(params).promise();
    return data.Item;
  } catch (err) {
    console.error('Errore nella lettura dalla tabella Email:2', JSON.stringify(err, null, 2));
    return null;
  }
}

const checkUserPermissions = (user, user_id, role) => {
  // Se l'utente richiedente è un medico o un super utente, permetti l'accesso
  if (role === 'medical' || role === 'super') {
    return true;
  }

  // Se l'utente richiedente è un utente normale, verifica che l'ID corrisponda
  return user.user_id === user_id;
};

const getUserByEmail = async (email, requestingUser) => {
  const emailItem = await checkEmail(email);

  if (!emailItem) {
    console.log('Indirizzo email non trovato nella tabella Email.');
    return null;
  }

  const user_id = emailItem.user_id;
  console.log("email " + emailItem.user_id);
  const userParams = {
    TableName: 'User_Table',
    Key: {
      'user_id': user_id,
    }
  };
  console.log("parametri olaaa" + userParams);;
  try {
    const userData = await docClient.get(userParams).promise();
    if (!checkUserPermissions(userData.Item, user_id, requestingUser)) {
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
    Key: { "email": email },
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
  const emailItem = await checkEmail(user.email);
  if (emailItem) {
    return null;
  }

  user.user_id = uuidv4();
  user.password = await hashPassword(user.password);

  const conditions = [];
  user.conditions = conditions;

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
        'email': user.email,
        'user_id': user.user_id,
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

const updateUser = async (user, user_id, role) => {
  if (!checkUserPermissions(user, user_id, role)) {
    throw { message: 'Accesso non autorizzato' };
  }

  if (user.email && user.email !== undefined && user.email !== null) {
    const emailParams = {
      TableName: 'Email_Table',
      Key: {
        'email': user.email,
      },
      UpdateExpression: 'SET #user_id = :user_id',
      ExpressionAttributeNames: {
        '#user_id': 'user_id',
      },
      ExpressionAttributeValues: {
        ':user_id': user_id,
      },
    };

    await docClient.update(emailParams).promise();
  }

  let updateExpression = 'SET';
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};

  Object.keys(user).forEach((key) => {
    if (key !== 'user_id' && key !== 'password' && user[key] !== undefined && user[key] !== null) {
      updateExpression += ` #${key} = :${key},`;
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = user[key];
    }
  });

  updateExpression = updateExpression.slice(0, -1);

  const params = {
    TableName: 'User_Table',
    Key: {
      'user_id': user.user_id,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const data = await docClient.update(params).promise();

  return data.Attributes;
};

const deleteUser = async (user, user_id, requestingUser) => {
  if (!checkUserPermissions(user, user_id, requestingUser)) {
    throw { message: 'Accesso non autorizzato' };
  }

  const params = {
    TableName: 'User_Table',
    Key: {
      'user_id': user.user_id,
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

const getUserById = async (user_id, role) => {
  const userParams = {
    TableName: 'User_Table',
    Key: {
      'user_id': user_id,
    },
  };

  try {
    const userData = await docClient.get(userParams).promise();

    if (!checkUserPermissions(userData.Item, user_id, role)) {
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
    console.log("userdata:" + userData);
    if (userData) {
      const storedPassword = userData.password;
      const passwordMatch = await bcrypt.compare(password, storedPassword);
      console.log("a qui arrivo" + JSON.stringify(userData));
      if (passwordMatch) {
        const token = jwt.setToken(userData.user_id, userData.email);
        return { token: token, user_id: userData.user_id };
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

const updateConditions = async (user_id, role, conditions) => {
  try {
    const user = await getUserById(user_id, role);

    if (user) {
      if (!checkUserPermissions(user, user_id, role)) {
        throw { message: 'Accesso non autorizzato' };
      }

      const updatedUser = { ...user, conditions: conditions };
      const updatedUserData = await updateUser(updatedUser, user_id, role);
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
