const jwt = require('jsonwebtoken');
const secretKey = 'il_tuo_segreto_supersegreto';

const verifyToken = (role) => (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).json({ message: 'Token non fornito' });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(401).json({ message: 'Token non valido' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: 'Accesso non autorizzato' });
    }

    req.user = user;
    next();
  });
};

module.exports = verifyToken;