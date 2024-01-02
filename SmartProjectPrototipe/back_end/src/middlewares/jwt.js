var jwt = require('jsonwebtoken');

let setToken = (id,username) => {
  
       let payload = {
            id: id,
            username: username,
        }
        
        var token = jwt.sign(payload,"chiaveSegreta", {
            algorithm : "HS256",
            expiresIn : "1h"
        });
        return token;
}

module.exports = {setToken}