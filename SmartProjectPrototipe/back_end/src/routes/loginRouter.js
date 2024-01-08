const express = require('express');
const router = express.Router();
const jwt = require('../middlewares/jwt');

router.post('/', (req,res) =>{
    console.log(req.body.username, req.body.password);
    if(req.body.username == 'pippo'){
        let token = jwt.setToken(2,req.body.username)
        let payload = jwt.getPayload(token);
        res.json({token: token, payload: payload}) // qui si rilascia un token
    } else {
        res.sendStatus(401);
    }
})

module.exports = router;