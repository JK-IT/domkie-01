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
  var startkey = req.query.startkey ? req.query.startkey : null;
  kaw.BookListing(type, subtype, startkey)
  .then(result=>{ //array of items and startkey
    return new Promise((resolve, reject)=>{
      ejs.renderFile('views/partials/miniBookDisplay.ejs', {bookdata: result})
      .then(str=>{
        resolve({
          str:str,
          startkey: result['startkey']
        });
      }).catch(err=>{
        reject(err);
      });
    });
  }).then(resobj=>{
    res.end(JSON.stringify({
      success: true,
      str: resobj.str,
      startkey: resobj.startkey //startkey is stringtify
    }));
  })  
  .catch(err=>{
    //res.status(500);
    bookerr('FETCHING BOOK ERR ' + err);
    res.end(JSON.stringify({success: err}));   
  });
  
}); // END FETCHING BOOK WITH TYPE AND SUBTYPE

/**=========== >>> FETCH  OPEN BOOK WITH TITLE */
book.get('/open', (req, res)=>{
  var type = req.query.type;
  var title = req.query.title;
  booklog(type + ' ---- ' + title);
  kaw.OpenBook(type, title).then(bookdetail=>{
    ejs.renderFile('views/partials/bookpage.ejs', {bookdetail: bookdetail})
    .then(respage=>{
      //res.render('index', {renderpage: respage})
      res.end(JSON.stringify({
        success:true,
        str: respage
      }))
    }).catch(rendererr=>{
      bookerr('RENDER BOOKPAGE ERR ---' + rendererr);
      res.end(JSON.stringify({
        success: false
      }))
    });
  });
  
}); // END OPEN BOOK ROUTE

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
}); // END LOADING CHAPTER

/** >>>>>> sort by genre route --fetching */
book.get('/fetch/genre/:genre', (req, res)=>{
  var genre = req.params.genre;
  var type = req.query.type;
  let key = '';
  if(req.query.startkey){
    key = req.query.startkey;
  } else {
    key = 'none';
  }
  kaw.BookGenreListing(type, genre,key)
  .then(kawres=>{
    if(kawres.length == 0){
      res.end(JSON.stringify({
        success: true,
        str: 'empty'
      }));
    } else {
      return new Promise((resole, reject)=>{
        ejs.renderFile('views/partials/miniBookDisplay.ejs', {bookdata: kawres})
        .then(str=>{
          resole({
            str: str,
            lastkey: kawres['startkey'] ? kawres['startkey']: 'none'
          });
        })
        .catch(err=>{
          bookerr('RENDER BOOK DATA ERROR ' + err);
        });
      });
    }
  })
  .then(resobj=>{
    res.end(JSON.stringify({
      success: true,
      str: resobj.str,
      startkey: resobj.lastkey
    }));
  })
  .catch(err=>{
    if(!err){
      res.end(JSON.stringify({success: false}));
    } 
  });
}); //END SORT BY GENRE ROUTING

/**Book Searching function */
book.get('/search/:booktype', (req, res)=>{
  let booktype = req.params.booktype;
  let bookname = req.query.bookname;
  var items = [];
  kaw.BookSearching(booktype, bookname, items)
  .then(searchres=>{
    if(searchres.length != 0){
      return ejs.renderFile('views/partials/miniBookDisplay.ejs', {bookdata: searchres});
    }else {
      res.end(JSON.stringify({
        success: true,
        str: 'empty'
      }));
    }
  })
  .then(str=>{
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      str: str
    }));
  })
  .catch(err =>{
    res.set('Content-Type', 'text/plain');
    res.status(400);
    res.end('False to find book');
  });
  
}); // END BOOK SEARCHING

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
          
        });
    })
    .catch(err => {
      bookerr('error while listing book by publisher ');
      
    });
});

/*
  helper function

*/
function AssembleUrl (reqobj, endpoint){
  var url = reqobj.protocol + '://' + reqobj.get('host') + '/' + endpoint;
  return url;
}

module.exports = book;