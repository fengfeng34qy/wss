var express = require('express');
var router = express.Router();
// var GetList = require('../Interface/index');

router.post('/xcx/getList', function(req, res) {
    res.send({status: 201,message: '只能修改自己的文章'})
});

module.exports = router;