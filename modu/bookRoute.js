const exp = require('express');
const book = exp.Router();
const util = require('util');
const ejs = require('ejs');
const kaw = require('./kaw')
const debug = require('./debug');
const memcache = require('memory-cache');
let booklog = debug.extend('book-router')
let bookerr = debug.extend('book-router-error');

book.get('/:type', (req, res)=>{
  var type = req.params.type;
  var subtype = req.query.subtype;
  kaw.BookListing(null, subtype)
  
})


book.get('/search/:name', (req, res)=>{
  booklog(req.params.name);
  kaw.FindBookName(req.params.name)
    .then(result=>{
      res.setHeader('Content-Type', 'application/json');
      booklog(result);
      ejs.renderFile('views/partials/search-result.ejs', {resdata: result.hits})
        .then(str=>{
          booklog(str);
          res.send(JSON.stringify({searchres: str}))
        })
        .catch(err =>{
          bookerr('error while rendering search res ' + err)
        })
      
    })
    .catch(err =>{
      
    })
})

book.get('/list/:type/:publisher', (req, res)=>{
  var publisher =  req.params.publisher;
  booklog('publisher of book ' + publisher);
  var xtrainfo = {publisher: null};
  if(req.params.type == 'manga'){
    xtrainfo.booktype = 'manga';
    xtrainfo.idtag = 'mangaListing';
    xtrainfo.publisher = publisher;
  } else {
    xtrainfo.booktype = 'comic';
    xtrainfo.idtag = 'comicListing';
    xtrainfo.publisher = publisher;
  }
  kaw.GetBookByPublisher(publisher, null)
    .then(bookdata =>{
      ejs.renderFile('views/partials/miniBookDisplay.ejs', {bookdata: bookdata, xtra: xtrainfo})
        .then(str =>{
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({added: str}))
          
        })
        .catch(err =>{
          bookerr('error while rendering book by publisher ' + err);
          
        })
    })
    .catch(err => {
      bookerr('error while listing book by publisher ');
      
    })
})

book.get('/fetch/:type', (req, res)=>{
  var querykey = req.query.lastkey;
  var publisher = req.query.publisher;
  var xtrainfo = {publisher: null};
  if(req.params.type == 'manga'){
    xtrainfo.booktype = 'manga';
    xtrainfo.idtag = 'mangaListing';
  } else {
    xtrainfo.booktype = 'comic';
    xtrainfo.idtag = 'comicListing';
  }
  if(publisher != null){
    booklog('publisher is not null ' + publisher);
    xtrainfo.publisher = publisher;
    kaw.GetBookByPublisher(publisher, ((querykey)? JSON.parse(querykey) : null))
      .then(bookdata =>{
        ejs.renderFile('views/partials/miniBookDisplay.ejs', {bookdata: bookdata, xtra: xtrainfo})
        .then(str =>{
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({added: str}));
          
        })
        .catch(err =>{
          bookerr('error while rendering book by publisher ' + err)
        })
      })
      .catch(err =>{
        bookerr('error while fetch book by publisher ' + err);
      })
  } else {
    var lastkeyobj = null;
    if(querykey != null){
      lastkeyobj = JSON.parse(querykey);
    }
    kaw.CallBook(req.params.type, lastkeyobj)
    .then(bookdata=>{
      ejs.renderFile('views/partials/miniBookDisplay.ejs', {bookdata: bookdata, xtra: xtrainfo})
        .then(str =>{
         //booklog(str);
         res.setHeader('Content-Type', 'application/json');
         res.send(JSON.stringify({added: str}));
        })
        .catch(err =>{
          bookerr('error while rendering the additional book form fetching ' + err);
        })
    })
    .catch(err =>{
      bookerr('error while calling book')
    })
  }

})

book.get('/:type/:title', (req, res)=>{
  var bookType = req.params.type;
  var title = req.params.title;
  booklog('get a request');
  (async function(){
    var bookdyna = function (){
      return new Promise ((resolve, reject)=>{
      kaw.GetBookdyna(title, bookType)
        .then(bookinfo=>{
          resolve(bookinfo)
        })
        .catch(err=>{bookerr('get err while getting book info from dynamodb ')})
        })
    }();
    var books3 = function(){
      return new Promise ((resolve, reject)=>{
        kaw.GetBooks3(title)
          .then(bookchap =>{resolve(bookchap)})
          .catch(err =>{bookerr('getting error while getting book chapters from s3')})
      })
    }();
    try{
      var bookinfo = await bookdyna;
      var bookchap = await books3;
      ejs.renderFile('views/partials/bookpage.ejs', {bookinfo: bookinfo, bookchap: bookchap})
        //.then(str=>{res.render('index', {page: str})})
        .then(str=>{res.render('partials/bookpage.ejs', {bookinfo: bookinfo, bookchap: bookchap})})
        .catch(err =>{bookerr('getting error while rendering Book Page ' + err);
        res.render('/500');})
    }catch(err){
      bookerr('getting error while open a book');
      res.render('/500');
    }
  })();
})

book.get("/open/:title/:chap", (req, res)=>{
  var ti = req.params.title;
  var chap = req.params.chap;
  kaw.GetBookChap(ti, chap)
    .then(data=>{
      var imgobj = {
        imglist: []
      }
      for(let i = 0; i < data.Contents.length; i++){
        var imgpath = (data.Contents[i].Key).replace(/\s+/g, '+');
        imgobj.imglist.push(`https://donkie-booket.s3-us-west-2.amazonaws.com/${imgpath}`)
      }
      res.set('Content-Type', 'application/json');
      res.send(JSON.stringify(imgobj));
      res.end();
    })
    .catch(err =>{
      res.end(err);
    })
})

/*
  helper function

*/
function GetUrl (req, res, status){
  res.status(status);
  var url = req.protocol + '://' + req.get('host') + '/' + status.toString();
  return url;
}

module.exports = book;