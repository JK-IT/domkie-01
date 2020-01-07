var market = require('express').Router();
var ejs = require('ejs');
var debug = require('./debug');

var marketlog = debug.extend('Market Router');
var marketerr = debug.extend('Market Error');

market.get('/', (req, res)=>{
  ejs.renderFile('views/partials/market.ejs', {local: res.locals})
  .then(pg=>{
    res.render('index', {page: pg});
  }).catch(err=>{
    marketerr(err);
    res.redirect(req.protocol + '://' + req.get('host') + '/500');
  });
});

market.get('/sell', (req, res)=>{
  if(req.session.domkie.loggedin){

  }
});

module.exports = market;