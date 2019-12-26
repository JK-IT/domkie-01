const exp = require('express');
const creator = exp.Router();
const ejs = require('ejs');
const debug = require('./debug');
const kaw = require('./kaw');
const util = require('util');
const crypto = require('crypto-js');

const reqmodule = require('request');
const querystring = require('querystring')

let log = debug.extend('creator-log');
let errlog = debug.extend('creator-err');

var loginurl = null;
var cburl = null;
var logouturl = null;

if(process.env.NODE_ENV == 'production'){
  
  cburl = 'https://domkie.com/creator/user'
  logouturl = 'https://domkie.com/creator'
  loginurl = "https://domkie.auth.us-west-2.amazoncognito.com/login?response_type=code&client_id=3bpnd386ku67jlgbftpmo79c12&redirect_uri=https://domkie.com/creator/user"
} else {
  cburl = 'http://localhost:8008/creator/user'
  logouturl = 'http://localhost:8008/creator'
  loginurl = "https://domkie.auth.us-west-2.amazoncognito.com/login?response_type=code&client_id=3bpnd386ku67jlgbftpmo79c12&redirect_uri=http://localhost:8008/creator/user"
}


creator.get('/',(req, res, next)=>{
  log('creator root path ' + req.session);
  if(req.session.loggedin){
    if(req.session.loggedin == false || req.session.loggedin == undefined){
      next();
    } else {
      log('USER ALREADY LOGGED IN');
      res.redirect('/creator/user');
    }
  } else {
    next();
  }
  
} ,(req, res, next)=>{
  ejs.renderFile('views/partials/creator-intro.ejs', {logurl: loginurl})
    .then(str =>{
      res.render('index', {page: str})
    })
    .catch(err =>{
      errlog(err);
      res.redirect(req.protocol + '://' + req.get('host') + '/500');
    })
})

//get callback req, if code is granted, set up session, else return to login page
/* creator.get('/callback', (req, res, next)=>{
  //when it comes to this point u for sure have grant code
  //setup session, redirect to user page then getting user info 
  req.session.loggedin = true;
  req.session.refresh = false;
  req.session.authcode = req.query.code;
  res.redirect('/creator/user');
}) */

creator.get('/user', (req, res, next)=>{
  log('req session ' + req.session);
  res.set({
    'Cache-Control': 'no-cache'
  })
  next();
} ,(req, res, next)=>{
  
  if(req.session.userinfo != null || req.session.userinfo != undefined){
    //log('user session exist ' + (req.header('x-forwarded-for') || req.connection.remoteAddress));
    //caling aws s3 to get items from server if user have it
    var prefix = req.session.userinfo.sub + '/listing/';
    //log(prefix);
    kaw.GetUserFolder(prefix)
      .then(useritems=>{
        //log('user items ' + useritems);
        DisplayUserPage('creator-user.ejs', useritems.Contents, req.session.userinfo, res, req);
      })
      .catch(err =>{
        res.redirect(req.protocol + '://' + req.get('host') + '/500');
      })
  } else {
      //using auth code to get access token to get user info
    //log(req.session.authcode);
    //log('user session doesn"t exist');
    req.session.loggedin = true;
    req.session.authcode = req.query.code;
    var form ={
      grant_type: 'authorization_code',
      client_id: process.env.pool_client_id,
      redirect_uri: cburl,
      code: req.query.code //req.session.authcode
    } 
    var formdata = querystring.stringify(form);
    reqmodule.post({
      headers:{
        'Content-Type': 'application/x-www-form-urlencoded'
        //use this if u have client secret
        //'Authorization': 'Basic 3bpnd386ku67jlgbftpmo79c12'
      },
      url: 'https://domkie.auth.us-west-2.amazoncognito.com/oauth2/token',
      body: formdata
    }, (err, response, body)=>{
      if(err || (JSON.parse(body)).error){
        errlog('error while getting token ' + err + '-' + (JSON.parse(body)).error);
        //make them log in again
        res.redirect(loginurl)
      } else {
        //log(JSON.parse(body));
        var acc_token = (JSON.parse(body)).access_token;
        req.session.refcode = (JSON.parse(body)).refresh_token;
        req.session.idtok = (JSON.parse(body)).id_token;

        //getting user attribute
        //this is the way to get user info using SDK FOR AWS
        kaw.GetUserAtt(acc_token)
        .then(useratt =>{
          var userinfo = {};
          
          //userinfo.id = (JSON.parse(body)).id_token;
          userinfo.poolid = process.env.pool_id;
          useratt.UserAttributes.forEach((item, idx)=>{
            if(item.Name == 'sub'){
              userinfo.sub = item.Value;
            }
            if(item.Name == 'phone_number'){
              userinfo.phoneNumber = item.Value;
            }
            if(item.Name == 'name'){
              userinfo.name = item.Value;
            }
            if(item.Name == 'email'){
              userinfo.email = item.Value;
            }
            if(item.Name == 'email_verified'){
              userinfo.verified = item.Value;
            }
          })
          req.session.userinfo = userinfo; //save to session
          var prefix = userinfo.sub + '/listing/';
          kaw.GetUserFolder(prefix)
          .then(userfolder =>{
            //log('USER FOLDER '+ util.inspect(userfolder, true, 2, true));
            DisplayUserPage('creator-user.ejs', userfolder.Contents, userinfo, res, req);
          })
          .catch(err =>{
            res.redirect(req.protocol + '://' + req.get('host') + '/500');
          });
        })
        .catch(err =>{
          res.statusCode = 500;
          res.redirect(req.protocol + '://' + req.get('host') + '/500');
        });
      }
    });
  }
});

creator.get('/logout', (req, res)=>{
  
  req.session.loggedin = false;
  //req.session.refresh = null;
  req.session.authcode = null;
  req.session.refcode = null;
  req.session.userinfo = null;
  
  var questr = {
    client_id: process.env.pool_client_id,
    logout_uri: logouturl
  }
  reqmodule.get('https://domkie.auth.us-west-2.amazoncognito.com/oauth/logout', {
    body: querystring.stringify(questr)
  }, (err, response, body)=>{
    if(err){
      errlog(err);
      res.redirect(req.protocol + '://' + req.get('host') + '/500');
    }else {
      log('Successfull logout from cognito');
      //log(body);
      res.redirect('/creator')
    }
  })
  //res.redirect('/creator')
})

//fetch with post to this api -- creator/user/upload
creator.get('/user/upload', (req, res)=>{
  var credobj = kaw.GetUploadCred();
  var policydate = new Date();
  policydate.setDate(policydate.getDate() + 1);
  var yyyy = policydate.getUTCFullYear().toString();
  var mm = (policydate.getUTCMonth() + 1).toString();
  if(mm.length == 1){mm = '0' + mm}
  var dd = policydate.getUTCDate().toString();
  if(dd.length == 1){dd = '0' + dd}
  var ymd = yyyy + mm + dd;
  var amzcred = `${credobj.id}/${ymd}/us-west-2/s3/aws4_request`;
  var amzdate = ymd + 'T000000Z';
  var amzalgor = "AWS4-HMAC-SHA256";
  var policy = {
    "expiration": policydate.toISOString(),
    "conditions": [
      {"acl": "public-read"},
      {"bucket": "dom-upload"},
      ["starts-with", "$key", ""],
      ["starts-with", "$Content-Type", ""],
      ["starts-with", "$Cache-Control", ""],
      {"x-amz-algorithm": amzalgor},
      {"x-amz-credential": amzcred},
      {"x-amz-date": amzdate}
    ]
  }
  var stringpolicy = JSON.stringify(policy);
  var b64policy = Buffer.from(stringpolicy, "utf-8").toString("base64");
  var kdate = crypto.HmacSHA256(ymd, 'AWS4' + credobj.key);
  var kregion = crypto.HmacSHA256('us-west-2', kdate);
  var kservice = crypto.HmacSHA256('s3', kregion);
  var ksign = crypto.HmacSHA256('aws4_request', kservice);

  var signature = crypto.HmacSHA256(b64policy, ksign);
  var hexsig = signature.toString(crypto.enc.Hex);
  log(hexsig);
  res.set({
    'Content-Type': 'application/json'
  })
  var packedData = {
    amzcred: amzcred,
    amzdate: amzdate,
    amzalgor: amzalgor,
    amz64poli: b64policy,
    amzsig: hexsig
  }
  res.end(JSON.stringify(packedData));
});

//browser: fetch to get item to this api -- creator/user/getitems?query
creator.get('/user/getitems', (req, res)=>{
  var usersub = req.query.usersub;
  var itemname = req.query.itemname;
  var prefix = usersub + '/listing/' + (itemname? itemname: '');
  kaw.GetUserFolder(prefix)
  .then(userfolder=>{
    GetItemListImg(userfolder.Contents, 2)
      .then(outfolder=>{
        res.set('Content-Type', 'application/json');
        ejs.renderFile('views/partials/itemListing.ejs', {listing: outfolder, usersub: usersub})
          .then(str =>{
            res.status(200);
            res.end(JSON.stringify({str: str}))
          })
          .catch(err=>{
            log(err);
            res.status(500);
            res.end();
          })
      })
      .catch(err =>{
        if(err == null){
          res.end(JSON.stringify({str: null}))
        } else {
          log('catching err when fetching the item ' + err);
        }
      })
  })
});

//browser: fetch to delete objects
creator.get('/user/deleteobj', (req, res)=>{
  let subuser = req.query.subuser;
  let item = req.query.itemname;
  let key = subuser + '/listing/' + item;
  kaw.DeleteObjs('dom-upload', key)
  .then(delres=>{
    if(delres){ //delres = true
      res.set('Content-Type', 'application/json');
      res.end(JSON.stringify({success: delres}));
    }
  }).catch(err=>{ //err = false
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify({success: err}));
  });
});

/**Helper function */

function GetItemListImg(inarr, inlev){
  return new Promise((resolve, reject)=>{
    (async function(){
      if(inarr.length == 0){
      reject(null);
      }
      var outfolder = [];
      var obj = {
        description: null,
        imglist: []
      };
      var temparr = [];
      for(var keyobj of inarr){
        var itemname = (keyobj.Key.split('/').splice(-2, 1))[0];
        if(temparr.indexOf(itemname) == -1){
          if(obj.name != null || obj.imglist.length != 0){
            outfolder.push(JSON.parse(JSON.stringify(obj)));
          } 
          temparr.push(itemname);
          obj.name = itemname;
          obj.imglist.length = 0; //empty array
          obj.description = {};

          let objname = keyobj.Key.split('/').pop();
          let ext = objname.split('.');
          if(ext.length == 1 || ext.indexOf('txt') != -1){
            log(ext);
            
            if((keyobj.Key.split('/').pop()[0]).match(/email/ig)){
              log('found email');
              obj.description.email = keyobj.Key;
            } else {
              log('found freckle');
              obj.description.description = keyobj.Key;
            }
          } else {
            obj.imglist.push(objname);
          }
        } else {
          let objname = keyobj.Key.split('/').pop();
          let ext = objname.split('.');
          //log(ext);
          if(ext.length == 1 || ext.indexOf('txt') != -1){
            
            if(ext[0].match(/(^email)./ig)){
              //log('found email');
              obj.description.email = keyobj.Key;
            } else {
              //log('found freckle');
              obj.description.description = keyobj.Key;
            }
          } else {
            obj.imglist.push(objname);
          }
        }
        if(inarr.indexOf(keyobj) == (inarr.length -1)){
          //this is the end of content array
          outfolder.push(JSON.parse(JSON.stringify(obj)));
        }
      }
      // LOOP OVER THE ARRAY AND UPDATE THE DESCRIPTION ITEM OBJECT
      for(let obj of outfolder){
        /* var strdata = await kaw.GetBlobText('dom-upload', obj.description);
        obj.description = JSON.parse(strdata); */ 
        var email = await kaw.GetBlobText('dom-upload', obj.description.email);
        obj.description.email = (JSON.parse(email)).email;
        var description = await kaw.GetBlobText('dom-upload', obj.description.description);
        obj.description.description = (JSON.parse(description)).description;
      }
      resolve(outfolder);
    })();
  }); 
}

function DisplayUserPage(userpage, userfolderarray, userinfo, res, req){
  GetItemListImg(userfolderarray, 2)
    .then(outfolder=>{
      //log('OUT USER FOLDER LIST ' + util.inspect(outfolder, true, 2, true));
      ejs.renderFile('views/partials/' + userpage, {user: userinfo, listing: outfolder})
        .then(str =>{
          res.render('index', {page: str})
        })
        .catch(err=>{
          errlog(err);
          res.redirect(req.protocol + '://' + req.get('host') + '/500');
        });
      
    })
    .catch(err =>{
      log('error getting image array ' + err);
      if(err == null){
        ejs.renderFile('views/partials/creator-user.ejs', {user: userinfo, listing: null})
        .then(str =>{
          res.render('index', {page: str})
        })
        .catch(err =>{
          errlog('error rendering page ' + err);
          res.redirect(req.protocol + '://' + req.get('host') + '/500');
        });
      }
    });
}

function securelogIn(req, res, next){
  if(req.session.loggedin == false || req.session.loggedin == undefined){
    errlog('COULD NOT FOUND THE SESSION COOKIE OR CACHING')
    //make them log in again
    res.redirect(loginurl)
  } else {
    next();
  }
}
module.exports = creator;


/*  OUTFOLDER LISTING 

[ { description: { description: 'huij', email: 'im@gm.com' },
       imglist: [ 'jeans1.jpg', [length]: 1 ],
        name: 'kit' },
      { description: { description: 'imitem2', email: 'im@lko.com' },
        imglist: [ 'drink1.jpg', [length]: 1 ],
        name: 'kit1' },
      [length]: 2 ] */

/*
var questr = {
    client_id: process.env.pool_client_id,
    logout_uri: 'http://localhost:8008/creator'
  }

  var reurl = new URL('https://domkie.auth.us-west-2.amazoncognito.com/oauth2/logout');
  reurl.search = querystring.stringify(questr);
  res.redirect(reurl.href);
*/

//this is another way to get user info - USING API ENDPOINT
        /* reqmodule.get({
          headers:{
            Authorization: 'Bearer '+ acc_token
          },
          url: 'https://domkie.auth.us-west-2.amazoncognito.com/oauth2/userInfo'
        }, function(err, response, body){
          if(err || (JSON.parse(body)).error){
            errlog('error while getting user info ' + err + '-' + (JSON.parse(body)).error);
            //make them log in again
            res.redirect(loginurl)
          } else {
            var userinfo = JSON.parse(body);
            log(userinfo);
            req.session.userinfo = userinfo;
            ejs.renderFile('views/partials/creator-user.ejs', {user: userinfo})
            .then(str =>{
              res.render('index', {page: str})
            })
            .catch(err =>{
              errlog('error while rendering user page' + err)
              res.redirect('/500');
            })
          }
        }) */

/*
  if(ext.length == 1 || ext.indexOf('txt') != -1){
    log('found freckle');
    //getting data from blob
    var strdata = await kaw.GetBlobText('dom-upload', keyobj.Key)
    log('blob data ' + strdata);
    obj.description = JSON.parse(strdata);
    
  }
*/
