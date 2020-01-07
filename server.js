const express = require('express');
const deb = require('./modu/debug');
const path = require('path');
const bdpar = require('body-parser');
const kaw = require('./modu/kaw');
const ejs = require('ejs');
const bookroute = require('./modu/bookRoute');
const creatorroute = require('./modu/creatorRoute');
var marketroute = require('./modu/marketRoute');
var linkmodu = require('./modu/linkmodule');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const app = express();
const exsession = require('express-session');
var memstore = require('memorystore')(exsession);
var applog = deb.extend('server-log');
var apperr = deb.extend('server-error');
var port = 8008;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); //setting this so u can set session or cookie when u have nodejs behind a proxy

if(process.env.NODE_ENV == 'production'){
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 43200000, //half of a day
    setHeaders: function(res, path, stat){
      
    }
  }));
} else {
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 0, //half of a day
    setHeaders: function(res, path, stat){
      
    }
  }));
}

app.use(helmet());
app.use(bdpar.json());
app.use(bdpar.urlencoded({extended:false}));
app.use ((req, res, next)=>{
  if(process.env.NODE_ENV == 'production'){
    res.set({
      'Cache-Control': 'public',
    });
    res.locals.logurl = linkmodu.productlinks.loginurl;
    res.locals.logouturl = linkmodu.productlinks.logouturl;
  } else {
    res.set({
      'Cache-Control': 'no-cache'
    });
    res.locals.logurl = linkmodu.devlinks.loginurl;
    res.locals.logouturl = linkmodu.devlinks.logouturl;
  }
  next();
});

app.use(cors());

var sess={
  secret: 'bokiesectcat',
  cookie:{path: '/', sameSite: 'lax'},
  resave: false,
  saveUninitialized: true,
  //name: 'Domkie Creator',
  store: new memstore({
    //checkPeriod: 86400000,
    ttl: 43200000
  })
}
if(process.env.NODE_ENV != 'production'){
  app.use(morgan('combined'));
}else {
  sess.cookie.secure = true;
  port = process.env.PORT || 5500;
}
app.use(exsession(sess));
app.use((req, res, next)=>{
  //applog('Request going through here');
  //applog(req.session.id);
  if(!req.session.domkie){
    req.session.domkie = {
      loggedin: false,
      acccode: null,
      refcode: null,
      userinfo: null
    };
    res.locals.loggedin = false;
  } else {
    //applog(JSON.stringify(req.session.domkie));
    //FIX THIS
    //{"loggedin":true,"authcode":"ca733154-08e0-41d0-b7aa-228a5a81aad2","userinfo":null}
    if(req.session.domkie.loggedin && req.session.domkie.userinfo){
      //display banner
      res.locals.loggedin = req.session.domkie.loggedin;
      //display user name on homepage
      res.locals.username = req.session.domkie.userinfo.name;
      //url return to userhub on homepage
      res.locals.userurl = req.protocol + '://' + req.get('host') + '/creator/user';
    } /* else if(req.session.domkie.loggedin){
      
    } */ else if(!req.session.domkie.loggedin && req.query.code){ //code u just return from amazon log in screen
      //set this to use in creator banner ejs
      res.locals.loggedin = true; 
      res.locals.username = null;
    } else {
      res.locals.loggedin = false;
    }
  }
  next();
});


app.use('/book', (req, res, next)=>{
  //applog(req.session.login);
  next();
}, bookroute);

app.use('/creator', (req, res, next)=>{
  res.set({
    'Cache-Control': 'no-cache'
  });
  //applog(req.session.login);
  //res.locals.logurl = null;
  next();
} ,creatorroute);

app.use('/market', marketroute);

app.get('/', (req, res)=>{
  (async function(){
    var newman = function(){
      return new Promise((resolve, reject)=>{
        kaw.CallNewManga()
          .then(mandata =>{
            resolve(mandata);
          }).catch(err =>{
            //apperr('err with calling new manga' + err);
          })
      })
    }();

    var newcom = function(){
      return new Promise((resolve, reject)=>{
        kaw.CallNewComic()
          .then(comdata =>{
            resolve(comdata)
          }).catch(err => {
            //apperr('err with calling new comic')
          })
      })
    }();
    try{
      var mandata = await newman;
      var comdata = await newcom;

      ejs.renderFile('./views/partials/homepage.ejs', {mangadata: mandata, comicdata: comdata})
        .then(str =>{res.render('index', {page: str});})
        .catch(err =>{ apperr('error: rendering homepage ' + err);});
    }catch (err){
      apperr('err while try to await to get new books ' + err);
      res.redirect('/500'); 
    }
  })();
})

app.get('/404', (req, res)=>{
  res.render('404')
})

app.get('/500', (req, res)=>{
  res.render('500')
})
app.get('/ads.txt', (req, res)=>{
  res.setHeader('Content-Type', 'text/plain');
  res.sendFile(__dirname + '/ads.txt');
});


app.listen(port, '127.0.0.1', (err)=>{
  if(err){
    apperr('Server has an error ' + err);
  } else {
    applog('SERVER IS RUNNING, environment ' + port + ' ' + process.env.NODE_ENV);
  }
})