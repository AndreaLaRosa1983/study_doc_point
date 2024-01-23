const jwt = require('./jwt');

const checkAuth = (req,res,next) => {
    try {
        if (req.headers['authorization'] == null) {
            res.sendStatus(401);
        } else {
            let token = req.headers['authorization'];
            token = token.slice(7,token.length);
            jwt.checkToken(token);
            next();
        }
    } catch(err) {
        console.log(err);
        res.sendStatus(401);
    }

}

module.exports = {checkAuth};