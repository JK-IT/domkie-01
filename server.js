const express = require('express');
const deb = require('./modu/debug');
const path = require('path');
const bdpar = require('body-parser');
const kaw = require('./modu/kaw');
const ejs = require('ejs');
const bookroute = require('./modu/bookRoute');
const creatorroute = require('./modu/creatorRoute');
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
app.use(helmet());
app.use(bdpar.json());
app.use(bdpar.urlencoded({extended:false}));
app.use(cors());

if(process.env.NODE_ENV == 'production'){
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 43200000, //half of a day
    etag: true,
    lastModified: true,
    /* setHeaders: function(res, path){
      var hashRegex = new RegExp('\\.[0-9a-f]{8}\\.');
      if(hashRegex.test(path)){
        res.setHeader('Cache-Control', 'max-age=43200000');
      }
    } */
  }));
  app.use((req,res,next)=>{
    //later inspect req url to get pathname for cache control
    
    res.locals.logurl = "https://domkie.auth.us-west-2.amazoncognito.com/login?response_type=code&client_id=3bpnd386ku67jlgbftpmo79c12&redirect_uri=https://domkie.com/creator/user";
    res.locals.logouturl = 'https://domkie.com';
    next();
  });
} else {
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge:0,
    setHeaders: function(res, path){
    }
  }));
  app.use((req, res, next)=>{
    //set no-cache no-store for dev
    res.set('Cache-Control', 'no-cache');
    res.locals.logurl = "https://domkie.auth.us-west-2.amazoncognito.com/login?response_type=code&client_id=3bpnd386ku67jlgbftpmo79c12&redirect_uri=http://localhost:8008/creator/user";
    res.locals.logouturl = 'http://localhost:8008';
    next();
  });
}
/** dealing with COOKIE AND SESSION STORE */
var sess={
  secret: 'bokiesectcatsowhatever',
  cookie:{sameSite: 'lax'},
  resave: false,
  saveUninitialized: false,
  //name: 'Domkie Creator',
  store: new memstore({
    //checkPeriod: 86400000,
    //ttl: 43200000
  })
};
if(process.env.NODE_ENV != 'production'){
  app.use(morgan('combined'));
}else {
  sess.cookie.secure = true;
  port = process.env.PORT || 5500;
}
app.use(exsession(sess));


//DONE WITH COOKIE AND SESSION STORE


/**General handling */
app.get('/', (req, res)=>{
  req.session.cookie.path = '/';
  res.set('Cache-Control', 'public');
  res.render('index');
}); // END GENERAL HANDLING

/* Fetching manga homepage */
app.get('/manga', (req,res)=>{
  //setting revalidate on proxy or shared cache
  req.session.cookie.path = '/manga';
  res.set('Cache-Control', 'public'); //'proxy-revalidate,no-cache'
  (async function(){
    kaw.HomepageManga()
    .then(introMangaBooks =>{
      return ejs.renderFile('views/partials/manga.ejs', {introManga: introMangaBooks});
    })
    /* .then(mangapge=>{
      return ejs.renderFile('views/partials/homepage.ejs', {page: mangapge});
      
    }) */.then(manpagestr=>{
      //this is where u return str from rendering the complete mangahomepage
      res.end(JSON.stringify({
        success: true,
        str: manpagestr
      }));
    })
    .catch(pageerr=>{
      apperr('ERROR WHILE TRY TO GET MANGA HOMEPAGE ' + pageerr);
      res.end(JSON.stringify({
        success: false
      }));
    });
  })();
});

/* Fetching comic homepage */
app.get('/comic', (req,res)=>{
  //for now just set public cuz nothing gonna changed yet
  req.session.cookie.path = '/comic';
  res.set('Cache-Control', 'public');
  ejs.renderFile('views/partials/comic.ejs')
  /* .then(comstr=>{
    return ejs.renderFile('views/partials/homepage.ejs', {page: comstr});
  }) */
  .then(compagestr=>{
    res.end(JSON.stringify({
      success: true,
      str: compagestr
    }));
  })
  .catch(rendererr=>{
    apperr('ERROR RENDING COMIC HOMEPAGE ' + rendererr);
    res.end(JSON.stringify({
      success: false
    }));
  });
});

app.get('/404', (req, res)=>{
  res.render('404');
});

app.get('/500', (req, res)=>{
  res.render('500');
});
app.get('/ads.txt', (req, res)=>{
  res.set('Cache-Control','public');
  res.setHeader('Content-Type', 'text/plain');
  res.sendFile(__dirname + '/ads.txt');
});

app.use('/book', (req, res, next)=>{
  //applog(req.session.login);
  //revalidate before using the cache
  req.session.cookie.path = '/book';
  res.set('Cache-Control', 'public');
  next();
}, bookroute);

app.use('/creator', (req, res, next)=>{
  res.set({
    'Cache-Control': 'no-cache'
  });
  //applog(req.session.login);
  res.locals.logurl = null;
  next();
} ,creatorroute);


app.listen(port, '127.0.0.1', (err)=>{
  if(err){
    apperr('Server has an error ' + err);
  } else {
    applog('SERVER IS RUNNING, environment ' + port + ' ' + process.env.NODE_ENV);
  }
});