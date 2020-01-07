var exp = require('express');
var creator = exp.Router();
var ejs = require('ejs');
var debug = require('./debug');
var kaw = require('./kaw');
var util = require('util');
var crypto = require('crypto-js');

var reqmodule = require('request');
var querystring = require('querystring');
var fetch = require('node-fetch');
var linksmodu = require('./linkmodule');
var link = {};
var creatorLog = debug.extend('creator-log');
var errlog = debug.extend('creator-err');


if(process.env.NODE_ENV == 'production'){
  link = linksmodu.productlinks;
  
} else {
 link = linksmodu.devlinks;
}
creator.use((req, res, next)=>{
  //set up show banner so it will not show if in this page
  res.locals.showBanner = false;
  //creatorLog('REQ SESSION IN CREATOR ROUTE ' + JSON.stringify(req.session.domkie));
  next();
});

creator.get('/',(req, res, next)=>{
  creatorLog('creator root path ' + req.session);
  if(req.session.loggedin){
    if(req.session.loggedin == false || req.session.loggedin == undefined){
      next();
    } else {
      creatorLog('USER ALREADY LOGGED IN');
      res.redirect('/creator/user');
    }
  } else {
    next();
  }
  
} ,(req, res, next)=>{
  ejs.renderFile('views/partials/creator-intro.ejs', {logurl: link.loginurl})
    .then(str =>{
      res.render('index', {page: str})
    })
    .catch(err =>{
      errlog(err);
      res.redirect(req.protocol + '://' + req.get('host') + '/500');
    });
});

//get callback req, if code is granted, set up session, else return to login page
/* creator.get('/callback', (req, res, next)=>{
  //when it comes to this point u for sure have grant code
  //setup session, redirect to user page then getting user info 
  req.session.loggedin = true;
  req.session.refresh = false;
  req.session.authcode = req.query.code;
  res.redirect('/creator/user');
}) */

creator.get('/user',(req, res, next)=>{
  
  if(req.session.domkie.loggedin && req.session.domkie.userinfo){
    //creatorLog('user session exist ' + (req.header('x-forwarded-for') || req.connection.remoteAddress));
    //caling aws s3 to get items from server if user have it
    var prefix = req.session.domkie.userinfo.sub + '/listing/';
    //creatorLog(prefix);
    kaw.GetUserFolder(prefix)
      .then(useritems=>{
        //creatorLog('user items ' + useritems);
        DisplayUserPage('creator-user.ejs', useritems.Contents, req.session.domkie.userinfo, res, req);
      })
      .catch(err =>{
        res.redirect(req.protocol + '://' + req.get('host') + '/500');
      });
  } 
  else if(req.session.domkie.loggedin && !req.session.domkie.userinfo && req.session.domkie.acccode){
    kaw.GetUserAtt(req.session.domkie.acccode)
    .then(useratt=>{
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
      });
      req.session.domkie.userinfo = userinfo; //save to session
      var prefix = userinfo.sub + '/listing/';
      return kaw.GetUserFolder(prefix);
    })
    .then(userfolder=>{
      //creatorLog('USER FOLDER '+ util.inspect(userfolder, true, 2, true));
      DisplayUserPage('creator-user.ejs', userfolder.Contents, req.session.domkie.userinfo, res, req);
    })
    .catch(error=>{
      errlog('GET /USER ERROR '  + error);
      res.redirect(link.loginurl);
    });
  }
  else {
      //using auth code from url to get access token to get user info
    //creatorLog('AUTH CODE ' + req.query.code);
    var form ={
      grant_type: 'authorization_code',
      client_id: process.env.pool_client_id,
      redirect_uri: link.cburl,
      code: req.query.code //req.session.authcode
    }; 
    let tokenurl  = 'https://domkie.auth.us-west-2.amazoncognito.com/oauth2/token?' + querystring.stringify(form);
    fetch(tokenurl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
        //use this if u have client secret
        //'Authorization': 'Basic 3bpnd386ku67jlgbftpmo79c12' = 'Basic BASE64(CLIENT_ID:CLIENT_SECRET)'
        //u need to convert base64-clientid:clientsecret to base64 as above
      }
    })
    .then(postresp => {
      return postresp.json();
    })
    .then(tokensjson=>{
      //creatorLog('TOKEN RESPONSE ' + JSON.stringify(tokensjson));
      var acc_token = /* (JSON.parse(tokensjson)) */tokensjson.access_token;
      //creatorLog(acc_token);
      req.session.domkie.loggedin = true;
      req.session.domkie.acccode = acc_token;
      req.session.domkie.refcode = /* (JSON.parse(tokensjson)) */tokensjson.refresh_token;
      req.session.domkie.idtok = /* (JSON.parse(tokensjson)) */tokensjson.id_token;
      return acc_token;
    })
    .then(acctoken =>{
      //getting user attribute
      //this is the way to get user info using SDK FOR AWS
      return kaw.GetUserAtt(acctoken);})
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
      });
      req.session.domkie.userinfo = userinfo; //save to session
      var prefix = userinfo.sub + '/listing/';
      return kaw.GetUserFolder(prefix);
    })
    .then(userfolder=>{
      //creatorLog('USER FOLDER '+ util.inspect(userfolder, true, 2, true));
      DisplayUserPage('creator-user.ejs', userfolder.Contents, req.session.domkie.userinfo, res, req);
    })
    .catch(error=>{
      errlog('GET /USER ERROR '  + error);
      res.redirect(link.loginurl);
    });
  }
});

creator.get('/logout', (req, res)=>{
  
  /* req.session.domkie.loggedin = false;
  //req.session.refresh = null;
  req.session.domkie.acccode = null;
  req.session.domkie.refcode = null;
  req.session.domkie.userinfo = null;
  req.session.domkie.idtok = null; */
  req.session.destroy((err)=>{
    if (err){
      errlog('LOG OUT ERROR: SESSION DESTROY ' + err);
      res.redirect(req.protocol + '://' + req.get('host') + '/500');
    } else {
      var questr = {
        client_id: process.env.pool_client_id,
        logout_uri: link.logouturl
      };
      reqmodule.get('https://domkie.auth.us-west-2.amazoncognito.com/oauth/logout', {
        body: querystring.stringify(questr)
      }, (err, response, body)=>{
        if(err){
          errlog('LOG OUT ERROR: AWS LOGOUT ENDPOINT '  + err);
          res.redirect(req.protocol + '://' + req.get('host') + '/500');
        }else {
          creatorLog('Successfull logout from cognito');
          //creatorLog(body);
          //creatorLog('return url ' + req.protocol + '://' + req.get('host'));
          res.redirect(req.protocol + '://' + req.get('host'));
        }
      });
    }
  });
});

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
  creatorLog(hexsig);
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
            creatorLog(err);
            res.status(500);
            res.end();
          })
      })
      .catch(err =>{
        if(err == null){
          res.end(JSON.stringify({str: null}))
        } else {
          creatorLog('catching err when fetching the item ' + err);
        }
      })
  })
});

//browser: fetch to delete objects
creator.get('/user/deleteobj', (req, res)=>{
  let subuser = req.query.usersub;
  let item = req.query.itemname;
  let prefix = subuser + '/listing/' + item + '/' ;
  creatorLog('prefix to delete ' + prefix);
  kaw.DeleteObjs('dom-upload', prefix)
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
            //creatorLog(ext);
            
            if((keyobj.Key.split('/').pop()[0]).match(/email/ig)){
              //creatorLog('found email');
              obj.description.email = keyobj.Key;
            } else {
              //creatorLog('found freckle');
              obj.description.description = keyobj.Key;
            }
          } else {
            obj.imglist.push(objname);
          }
        } else {
          let objname = keyobj.Key.split('/').pop();
          let ext = objname.split('.');
          //creatorLog(ext);
          if(ext.length == 1 || ext.indexOf('txt') != -1){
            
            if(ext[0].match(/(^email)./ig)){
              //creatorLog('found email');
              obj.description.email = keyobj.Key;
            } else {
              //creatorLog('found freckle');
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
      //creatorLog('OUT USER FOLDER LIST ' + util.inspect(outfolder, true, 2, true));
      ejs.renderFile('views/partials/' + userpage, {user: userinfo, listing: outfolder})
        .then(str =>{
          res.render('index', {page: str});
        })
        /* .catch(err=>{
          errlog(err);
          res.redirect(req.protocol + '://' + req.get('host') + '/500');
        }); */
      
    })
    .catch(err =>{
      creatorLog('ERROR ' + err);
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
    //make them creatorLog in again
    res.redirect(link.loginurl)
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
            //make them creatorLog in again
            res.redirect(loginurl)
          } else {
            var userinfo = JSON.parse(body);
            creatorLog(userinfo);
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
    creatorLog('found freckle');
    //getting data from blob
    var strdata = await kaw.GetBlobText('dom-upload', keyobj.Key)
    creatorLog('blob data ' + strdata);
    obj.description = JSON.parse(strdata);
    
  }
*/
