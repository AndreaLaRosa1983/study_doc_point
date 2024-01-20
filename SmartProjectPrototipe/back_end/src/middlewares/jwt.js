var jwt = require('jsonwebtoken');
let fs = require('fs');
let options = { algorithm : "RS256", expiresIn : "1h"}


let getPayload = (token) => {
    var decode = jwt.decode(token, { complete: true});
    return decode.payload;
}


let setToken = (id,username) => {
       let payload = {
            id: id,
            username: username,
        }
        let privateKey = fs.readFileSync(".\\rsa.key");
        var token = jwt.sign(payload, privateKey, options);
        return token;
}


let checkToken = (token) => {
    let publicKey = fs.readFileSync(".\\rsa.pem");
    return jwt.verify(token, publicKey, options);
}

module.exports = {setToken, getPayload, checkToken}