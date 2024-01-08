var jwt = require('jsonwebtoken');

let options = { algorithm : "HS256", expiresIn : "1h"}
let getPayload = (token) => {
    var decode = jwt.decode(token, { complete: true});
    return decode.payload;
}


let setToken = (id,username) => {
  
       let payload = {
            id: id,
            username: username,
        }
         
        var token = jwt.sign(payload,"chiaveSegreta", options);
        return token;
}

let checkToken = (token) => {
    return jwt.verify(token,"chiaveSegreta", options )
}

module.exports = {setToken, getPayload, checkToken}