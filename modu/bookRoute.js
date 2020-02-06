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
book.get('/fetch/load/:type', (req, res)=>{
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

/**=========== >>>  OPEN BOOK WITH TITLE */
book.get('/open', (req, res)=>{
  var type = req.query.type;
  var title = req.query.title;
  booklog(type + ' ---- ' + title)
  kaw.OpenBook(type, title).then(bookdetail=>{
    ejs.renderFile('views/partials/bookpage.ejs', {bookdetail: bookdetail})
    .then(respage=>{
      res.render('index', {renderpage: respage})
    }).catch(rendererr=>{
      bookerr('RENDER BOOKPAGE ERR ---' + rendererr);
      
    });
  });
  
}); 

/**======== >>>> Display content of a chapter */
book.get('/loadchap', (req, res)=>{
  var chapprefix = req.query.chapprefix;
  kaw.LoadChap(chapprefix)
  .then(chapinfo=>{
    /** chapinfo: {
       *contents:  [{
            Key: 'Land Lock/Chapter 004/004.jpg',
            LastModified: 2020-01-26T01:09:59.000Z,
            ETag: '"07c6b9f084f52b23db9ac17c2cf534a4"',
            Size: 85062,
            StorageClass: 'INTELLIGENT_TIERING'
          }]
      ,
      s3link: s3bucketlink }
     */
    res.end(JSON.stringify({success: true, chapinfo: chapinfo}))
  })
  .catch(err=>{
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

/*
  helper function

*/
function AssembleUrl (reqobj, endpoint){
  var url = reqobj.protocol + '://' + reqobj.get('host') + '/' + endpoint;
  return url;
}

module.exports = book;