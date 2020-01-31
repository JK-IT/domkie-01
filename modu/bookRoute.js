const exp = require('express');
const book = exp.Router();
const util = require('util');
const ejs = require('ejs');
const kaw = require('./kaw')
const debug = require('./debug');
const memcache = require('memory-cache');
let booklog = debug.extend('book-router')
let bookerr = debug.extend('book-router-error');

/*====> FETCHING BOOK TYPE AND SUBTYPE */
book.get('/fetch/:type', (req, res)=>{
  var type = req.params.type;
  var subtype = req.query.subtype;
  kaw.BookListing(type, subtype, null)
  .then(result=>{ //array of items
    return ejs.renderFile('views/partials/miniBookDisplay.ejs', {bookdata: result})
  }).then(str=>{
    res.end(JSON.stringify({
      success: true,
      str: str
    }))
  })  
  .catch(err=>{
    //res.status(500);
    bookerr('FETCHING BOOK ERR ' + err);
    res.end(JSON.stringify({success: false}))   
  })
  
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
function AssembleUrl (reqobj, endpoint){
  var url = reqobj.protocol + '://' + reqobj.get('host') + '/' + endpoint;
  return url;
}

module.exports = book;