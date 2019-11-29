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
  //log('creator root path ' + req.session);
  if(req.session.loggedin){
    if(req.session.loggedin == false || req.session.loggedin == undefined){
      next();
    } else {
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
  res.set({
    'Cache-Control': 'no-cache'
  })
  next();
} ,(req, res, next)=>{
  
  if(req.session.userinfo != null || req.session.userinfo != undefined){
    //log('user session exist ' + (req.header('x-forwarded-for') || req.connection.remoteAddress));
    //caling aws s3 to get items from server if user have it
    var prefix = req.session.userinfo.sub + '/listing/';
    log(prefix);
    kaw.GetUserFolder(prefix)
      .then(useritems=>{
        var outfolder = GetItemListImg(useritems.Contents, 2);
        log(outfolder)
        if(outfolder == null){
          ejs.renderFile('views/partials/creator-user.ejs', {user: req.session.userinfo, listing: null})
          .then(str =>{
            res.render('index', {page: str})
          })
          .catch(err =>{
            errlog('error rendering page ' + err);
            res.redirect(req.protocol + '://' + req.get('host') + '/500');
          })
        } else {
          ejs.renderFile('views/partials/creator-user.ejs', {user: req.session.userinfo, listing: outfolder})
            .then(str =>{
              res.render('index', {page: str})
            })
            .catch(err=>{
              errlog(err);
              res.redirect(req.protocol + '://' + req.get('host') + '/500');
            })
        }
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
          var prefix = userinfo.sub + '/listing/'
          kaw.GetUserFolder(prefix)
          .then(userfolder =>{
            var outfolder = GetItemListImg(userfolder.Contents, 2);
            log(outfolder)
            if(outfolder == null){
              ejs.renderFile('views/partials/creator-user.ejs', {user: userinfo, listing: null})
              .then(str =>{
                res.render('index', {page: str})
              })
              .catch(err =>{
                errlog('error rendering page ' + err);
                res.redirect(req.protocol + '://' + req.get('host') + '/500');
              })
            } else {
              ejs.renderFile('views/partials/creator-user.ejs', {user: userinfo, listing: outfolder})
                .then(str =>{
                  res.render('index', {page: str})
                })
                .catch(err=>{
                  errlog(err);
                  res.redirect(req.protocol + '://' + req.get('host') + '/500');
                })
            }
          })
          .catch(err =>{
            res.redirect(req.protocol + '://' + req.get('host') + '/500');
          })
        })
        .catch(err =>{
          res.statusCode = 500;
          res.redirect(req.protocol + '://' + req.get('host') + '/500');
        })
      }
    })
  }
  
})

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

//browser: fetch with post to this api
creator.get('/user/upload', (req, res)=>{
  kaw.GetSignedPost()//GetSignedUrl(action, key)
    .then(data =>{
      res.set({'Content-Type': 'application/json'})
      res.send(JSON.stringify(data));
    })
    .catch(err =>{
      if(err == null){
        res.statusCode = 500;
        res.end();
      }
    })
})

//browser: fetch to get item to this api
creator.get('/user/getitems', (req, res)=>{
  var prefix = req.query.prefix;
  kaw.GetUserFolder(prefix)
  .then(userfolder=>{
    var outfolder = GetItemListImg(userfolder.Contents, 2);
    res.set('Content-Type', 'application/json');
    if(outfolder == null){
      res.send(JSON.stringify({str: null}))
    } else {
      ejs.renderFile('views/partials/itemListing.ejs', {listing: outfolder, prefix: prefix})
      .then(str =>{
        res.status(200);
        res.send(JSON.stringify({str: str}))
      })
      .catch(err=>{
        log(err);
        res.status(500);
        res.end();
      })
    }
  })
  .catch(err =>{
     
  })
})


/**Helper function */

function GetItemListImg(inarr, inlev){
  if(inarr.length == 0){
    return null;
  }
  var outfolder = [];
  var obj = {
    imglist: []
  };
  var temparr = [];
  for(var keyobj of inarr){
    var itemname = (keyobj.Key.split('/').splice(-2, 1))[0];
    if(temparr.indexOf(itemname) == -1){
      if(obj.name != null || obj.imglist.length != 0){
        var tobj = JSON.parse(JSON.stringify(obj));
        outfolder.push(tobj);
      } 
      temparr.push(itemname);
      obj.name = itemname;
      obj.imglist.length = 0; //empty array
      obj.imglist.push(keyobj.Key.split('/').pop());
    } else {
      //if item exists, look up in the folder if the name already there
      /* for(var itemobj of outfolder){
        if(itemobj.name == itemname){
          itemobj.imglist.push(keyobj.Key.split('/').pop());
          break;
        }
      } */
      obj.imglist.push(keyobj.Key.split('/').pop());
    }
    if(inarr.indexOf(keyobj) == (inarr.length -1)){
      //this is the end of content array
      var tobj = JSON.parse(JSON.stringify(obj));
      outfolder.push(tobj);
    }
  }
  return outfolder;
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
  this will be used to get credentials and filled up requirement to use http POST
    USING TEMPORARY CREDENTIALS
    CALCULATING THE SIGNATURE BY YOURSELF


creator.get('old/user/upload', (req, res)=>{
  //log('==== upload req header ' + JSON.stringify( req.session.idtok));
  kaw.GetTempCred(req.session.idtok)
    .then(data =>{
      var tempcreobj = JSON.parse(data);
      //log('=======++++++++++++ data from getting credential using get id ' + data)
      
      //get current date and add 1 more day
        //to convert to iso format using .toISOString();
      var policydate = new Date();
      policydate.setDate(policydate.getDate() + 1);
      var yyyy = policydate.getUTCFullYear().toString();
      var mm = (policydate.getUTCMonth() + 1).toString();
      if(mm.length == 1 ){mm = '0' + mm}
      var dd = policydate.getUTCDate().toString();
      if(dd.length == 1) {dd = '0' + dd};
      var ymd = yyyy + mm + dd;
      var amzcred = `${tempcreobj.Credentials.AccessKeyId}/${ymd}/us-west-2/s3/aws4_request`;
      var amzdate = ymd + 'T000000Z';
      var amzalgor = "AWS4-HMAC-SHA256";
      //this require aws credentials
      var policy = {
        "expiration": policydate.toISOString(),
        "conditions": [
          { "acl": "public-read"},
          {"bucket": "dom-buck-test"},
          ["starts-with", "$key", ''],
          ['starts-with', '$Content-Type', ''],
          ['starts-with', '$Cache-Control', 'no-cache'],
          {"x-amz-algorithm": amzalgor},
          //<your-access-key-id>/<date>/<aws-region>/<aws-service>/aws4_request
          {"x-amz-credential": amzcred},
          {"x-amz-date": amzdate},
          //['content-length-range', 1048579, 20971580],
          {"x-amz-security-token" : tempcreobj.Credentials.SessionToken} //this require for temporary credentials to worke
        ]
      }      

      var stringpolicy = JSON.stringify(policy);
      var b64policy = Buffer.from(stringpolicy, "utf-8").toString("base64");
      //log('string to sign ' + b64policy)
      var kdate = crypto.HmacSHA256(ymd, 'AWS4' + tempcreobj.Credentials.SecretKey);
      var kregion = crypto.HmacSHA256('us-west-2', kdate);
      var kservice = crypto.HmacSHA256('s3', kregion);
      var ksign = crypto.HmacSHA256('aws4_request', kservice);
      //log('Signing key ' + ksign);
      var signature = crypto.HmacSHA256(b64policy, ksign);
      //calculate signature
      var hexsig = signature.toString(crypto.enc.Hex);
      //var sig = crypto.createHmac('sha256', tempcreobj.Credentials.SecretKey).update(Buffer.from(b64policy, 'utf-8')).digest('base64'); 
      res.set({
        'Content-Type': 'application/json'
      });
      var packedData = {
        idenid: tempcreobj.IdentityId,
        xamzcred : amzcred,
        xamzdate : amzdate,
        xamzalgor : amzalgor,
        xamzacckey: tempcreobj.Credentials.AccessKeyId,
        xamzb64poli: b64policy,
        xamzsignature: hexsig,
        xamzsetoken: tempcreobj.Credentials.SessionToken
      }
      res.send(JSON.stringify(packedData));
    })
    .catch(err =>{
      errlog('we get error');
    })
  
})
*/
