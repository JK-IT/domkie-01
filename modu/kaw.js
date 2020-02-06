const kawaz = require('aws-sdk');
const util = require('util');
const denv = require('dotenv');
const s3bucketlink = "https://domkie-booket.s3-us-west-2.amazonaws.com/"
var debug = require('./debug');

denv.config();
//debug.log = console.info.bind(console);
if(process.env.NODE_ENV != 'production'){
  //load from currend working process, aka the root path, not the path of this file
  //kawaz.config.loadFromPath('./temp/a.json');
  /* kawaz.config.getCredentials(function(err){
    if(err){
      console.error('Error loading credentials ' + err.stack);
    }
  }) */
  var cred = new kawaz.SharedIniFileCredentials({profile: 'domkieadmin'});
  kawaz.config.credentials = cred;
}

kawaz.config.apiVersions = {
  cognitoidentityserviceprovider: '2016-04-18',
  cognitoidentity: '2014-06-30'
}

kawaz.config.update({region: 'us-west-2'});
/* kawaz.config.credentials = new kawaz.CognitoIdentityCredentials({
  IdentityPoolId: 'us-west-2:104f94f0-efc8-4601-a0ef-e3d0550d3aa5',
}) */
var s3 = new kawaz.S3({
  apiVersion: "2006-03-01"
});
let des3 = debug.extend('S3');
let des3err = debug.extend('S3-error');

const dynamo = new kawaz.DynamoDB({
  apiVersion:"2012-08-10"
})
let dedymo = debug.extend('dynamo');
let dedymoerr = debug.extend('dynamo-error');

/* const searchDomain = new kawaz.CloudSearchDomain({
  endpoint: "search-book-table-search-5oqcixmwgwfnxpr77sdbhirwbq.us-west-2.cloudsearch.amazonaws.com",
  apiVersion:"2013-01-01"
})
let searcherr = debug.extend('Search-Error');
let searchlog = debug.extend('Search-Log')
 */
const cogiden = new kawaz.CognitoIdentity();
let coglog = debug.extend('cognito');
let cogerr = debug.extend('cognito-error');

const cogservice = new kawaz.CognitoIdentityServiceProvider();
let logcogservice = debug.extend('cognito-service');
let errorcogservice = debug.extend('error-cognito-service')

var limit = null;
var kaw = {};



if(process.env.NODE_ENV == 'production'){
  limit = 20;
} else {
  limit = 12;
}
var time = ((Date.now() / 1000) - (7* 86400)).toString();
dedymo ('time to compare : ' + time);

//return ejs string rendering for updated and featured book
kaw.HomepageManga = function(){
  return new Promise((outresole, outreject)=>{
    var para = {
      TableName : 'book-table',
      //ConsistentRead: true, not working on global secondary indexes
      //Limit: 6,
      //IndexName: 'type-date-index',
      ConsistentRead: true,
      ScanIndexForward: false,
      ReturnConsumedCapacity: 'INDEXES',
      ExpressionAttributeNames: {'#d': 'time', '#t': 'type'},
      ExpressionAttributeValues: {':d': {'N': time}, ':ty': {'S': 'manga'}},
      //this is for key schema, date is not in key schema
      //KeyConditionExpression: '#t = :ty AND #d > :d',
      KeyConditionExpression: '#t = :ty AND #d >= :d'
      //FilterExpression: '#d >= :d' using gsi u don't need this
    };
    var updatedbook = new Promise((updateres, updatereject)=>{
      dynamo.query(para, (err, data)=>{
        if(err) updatereject(err);
        else updateres(data);
      });
    });
    
    var featuredpara = {
      TableName: 'book-table',
      ConsistentRead: true,
      IndexName: 'type-rating-index',
      ReturnConsumedCapacity: 'INDEXES',
      ProjectionExpression: "#n, rating",
      ExpressionAttributeNames: {'#t': 'type', '#r': 'rating', '#n': 'name'},
      ExpressionAttributeValues: {':ty':{'S': 'manga'}, ':ra': {'S': '4.3'}},
      KeyConditionExpression: "#t = :ty AND #r > :ra"
    }

    var featuredbook = new Promise((featresolve, featreject)=>{
      dynamo.query(featuredpara, (err, data)=>{
        if(err) featreject(err);
        else featresolve(data);
      });
    });
    var dataobj = {};
    updatedbook.then(data=>{
      if(data.Count == 0){
        var temppara = {
          TableName: 'book-table',
          ConsistentRead: false,
          ReturnConsumedCapacity: 'INDEXES',
          Limit: 5,
          ScanIndexForward:  false, //to make it traversal in descending
          ExpressionAttributeNames: {'#t': 'type'},
          ExpressionAttributeValues: {':ty':{'S': 'manga'}},
          KeyConditionExpression: "#t = :ty"
        }
        return new Promise((resolve, reject)=>{
          dynamo.query(temppara, (err, backdata)=>{
            if(err) reject(err);
            else resolve(backdata);
          });
        });
      } else {
        return data;
      }
    })
    .then(updata=>{
      //dedymo(updata);
      return new Promise((upres, uprej)=>{
        (async function (){
          for(let book of updata.Items){
            var title = FirstUppercase(book.name.S);
            title = title.trim();
            book.title = title;
            book.s3link = s3bucketlink + title.replace(/\s/g, '+')+'/';
            var key = title + '/sum.txt';
            //getblobtext using sdk so no need to replace space with + sign
            var sumtxt = await kaw.GetBlobText('domkie-booket', key);
            book.sum = sumtxt;
            
          }
          dataobj.upbook = updata.Items;
          upres(featuredbook);
        })();

      })

    })
    .then(featuredata =>{
      //dedymo(upfeatdata);
      for(let book of featuredata.Items){
        var title = FirstUppercase(book.name.S);
        book.title = title.trim();
        book.s3link = s3bucketlink + title.replace(/\s/g, '+')+'/';
      }
      dataobj.featbook = featuredata.Items;
      //dedymo(dataobj)
      outresole(dataobj);
    })
    .catch((err)=>{
      dedymoerr('ERROR - HOMEPAGE MANGA FUNCTION ' + err);
      outresole(false);
    });

  });
  
}; // END HOMEPAGE MANGA FUNCTION

kaw.BookListing = function(type, subtype,startkey = null){
  // if Err return false
  var par = {
    TableName: "book-table",
    IndexName: 'type-subtype-index',
    ExpressionAttributeNames: {'#ty': 'type', '#subty': 'subtype'},
    ExpressionAttributeValues: {':t' : {'S': type}, ':st' : {'S': subtype}},
    KeyConditionExpression: '#ty = :t AND #subty = :st',
    //Limit: lim,
    ConsistentRead: true,
    ReturnConsumedCapacity: 'INDEXES'
  }
  if(startkey != null){
    par.ExclusiveStartKey = starkey;
  }
  return new Promise((resolve, reject)=>{
    dynamo.query(par, (err, data)=>{
      if(err != null){
        /*--------->*/reject(false);
        dedymoerr(util.inspect(err, true, 5, true));
      } else {
        for(let item of data.Items){
          item.title = FirstUppercase(item.name.S);
          item.s3link = s3bucketlink + item.title.replace(/\s/g, '+') + '/';
        }
        /*--------->*/resolve(data.Items);
        //dedymo(util.inspect(data, true, 5, true));
      }
    });
  });
}; // END BOOK LISTING FUNCTION

kaw.OpenBook = function(type, title){
  //get data from dynamo then s3
  return new Promise((outres, outreject)=>{

    var bookname = title.toLowerCase();
    var dypar = {
      TableName: 'book-table',
      IndexName: 'type-name-index',
      ExpressionAttributeNames: {'#t': 'type', '#n': 'name'},
      ExpressionAttributeValues: {':ty': {'S': type}, ':bname': {'S': bookname}},
      KeyConditionExpression: "#t = :ty AND #n = :bname",
      ReturnConsumedCapacity: 'INDEXES'
    }
    var getbookdetails = new Promise((bres, breject)=>{
      dynamo.query(dypar, (err, data)=>{
        if(err) breject(err);
        else bres(data);
      });
    });
    getbookdetails.then(bookdetail=>{
      (async function(){
        //var title = FirstUppercase(bookdetail.Items[0].name.S);
        bookdetail.Items[0].title = title;
        bookdetail.Items[0].subtype.S = (bookdetail.Items[0].subtype.S).toUpperCase();
        bookdetail.Items[0].s3link = s3bucketlink + title.replace(/\s/g, '+') + '/';
        bookdetail.Items[0].sum = await kaw.GetBlobText('domkie-booket', title+'/sum.txt');
        var chaplist = await kaw.GetBlobText('domkie-booket', title + '/chapterlist.txt');
        bookdetail.Items[0].chaplist = (JSON.parse(chaplist)).chapterlist;
        outres(bookdetail.Items[0]);
      })();
    })
    .catch(err=>{
      des3err('ERROR OPENBOOK FUNCTION --- ' + err);
    });
  });
};// OPEN BOOK FUNCTION

//get images of the chapter , aka read the chapter
kaw.LoadChap = function(chapprefix){
  var par = {
    Bucket: 'domkie-booket',
    //Delimiter: '/',
    Prefix: chapprefix
  }
  return new Promise((resolve, reject)=>{
    s3.listObjectsV2(par, (err, data)=>{
      if(err){
        des3err(err);
        reject(false);
      } else {
        //des3(util.inspect(data, true, 4, true));
        let chapinfo = {s3link: s3bucketlink, contents : data.Contents}
        resolve(chapinfo);
      }
    })
  })
} // ====== LOAD CHAP FUNCTION

//use to get book info if u have full name
kaw.GetBookdyna = function(title, type){
  var name = title.toLowerCase();
  var par = {
    TableName: 'book_table',
    ExpressionAttributeNames: {'#ty': 'type', '#n': 'name'},
    ExpressionAttributeValues: {':typ': {'S': type}, ':na': {'S': name}},
    KeyConditionExpression: '#ty = :typ AND #n = :na',
    ConsistentRead: true,
    ReturnConsumedCapacity: 'INDEXES'
  }
  return new Promise((resolve, reject)=>{
    dynamo.query(par, (err, data)=>{
      if(err){
        dedymoerr(err);
        reject(err);
      } else {
        dedymo(util.inspect(data, true, 5, true));
        resolve(data);
      }
    })
  })
}

//using in search
kaw.FindBookName = function(name){
  var param = {
    query: name, /* required */
    //cursor: 'STRING_VALUE',
    //expr: 'STRING_VALUE',
    //facet: 'STRING_VALUE',
    //filterQuery: 'STRING_VALUE',
    //highlight: 'STRING_VALUE',
    partial: true,
    queryOptions: '{"fields":["name"]}',
    queryParser: 'simple',
    return: '_all_fields',
    size: 10,
    sort: 'name desc'
    //start: 'NUMBER_VALUE',
    //stats: 'STRING_VALUE'
  }
  return new Promise((resolve, reject)=>{
    searchDomain.search(param, function(err, data){
      if(err){
        searcherr('Error from cloudsearch ' + err);
      } else {
        resolve(data);
        searchlog(util.inspect(data, true, 6, true))
      }
    })
  })
}

kaw.GetBookByPublisher = function(genre, starkey = null){
  var param = {
    TableName: 'book_table',
    IndexName: 'publisher-index',
    ExpressionAttributeNames: {'#g': 'publisher'},
    ExpressionAttributeValues: {':gen': {'S': genre}},
    KeyConditionExpression: '#g = :gen',
    ExclusiveStartKey: starkey,
    //Limit: 3,
    ReturnConsumedCapacity: 'INDEXES'
  }
  return new Promise((resolve, reject)=>{
    dynamo.query(param, (err, data)=>{
      if(err){
        dedymoerr('Get Book Publisher ' + err);
        reject('false');
      } else {
        dedymo(util.inspect(data, true, 5, true));
        resolve(data);
      }
    })
  })
}

// using cognito identity to get temporary credentials
kaw.GetTempCred = function(iktok){
  var par = {
    IdentityPoolId: 'us-west-2:104f94f0-efc8-4601-a0ef-e3d0550d3aa5',
    Logins: {
      'cognito-idp.us-west-2.amazonaws.com/us-west-2_07r9szVZ4': iktok 
    }
  }
 
  return new Promise((resolve, reject)=>{
    cogiden.getId(par, (err, data)=>{
      if(err){
        cogerr('error when getting cognito id ' + err);
        reject(err);
      } else {
        //coglog(data);
          cogiden.getCredentialsForIdentity({
          IdentityId: data.IdentityId,
          Logins:{
            'cognito-idp.us-west-2.amazonaws.com/us-west-2_07r9szVZ4': iktok
          }
        }, (err, cred)=>{
          if(err){
            cogerr('error while getting credentials for identity ' + err);
            reject(err);
          } 
          else {
            coglog(util.inspect(data, true, 3, true));
            resolve(JSON.stringify(cred));
          }
        }) 
        //resolve(data);
      }
      
    })
  })
}


kaw.GetUserAtt = function(acctok){
  var par = {
    AccessToken: acctok
  }
  return new Promise((resolve, reject)=>{
    cogservice.getUser(par, (err, data)=>{
      if(err){
        errorcogservice('ERROR-GET USER ATTRIBUTE '+ err);
        reject(err);
      } else {
        //logcogservice(data);
        resolve(data);
      }
    })
  })
}

kaw.GetUserFolder = function(prefix){
  
  var par = {
    Bucket: 'dom-upload' , //'dom-buck-test',
    Prefix: prefix
  }
  return new Promise((resolve, reject)=>{
    s3.listObjectsV2(par, (err, data)=>{
      if(err){
        des3err('error - get user folder ' + err);
        reject(err);
      } else {
        //des3(data);
        resolve(data);
      }
    })
  })
}

kaw.GetUploadCred = function(){
  return {
    id: process.env.domadm,
    key:process.env.domkey
  }
}

kaw.GetBlobText = function(bucket, key){
  //des3('Key to get ' + key);
  var par = {
    Bucket: bucket,
    Key: key
  }
  var txtbin = s3.getObject(par).createReadStream().setEncoding('utf-8');
  return new Promise((resolve, reject)=>{
    var dat = '';
    txtbin.on('data', (chunk)=>{
      dat += chunk;
    })
    txtbin.on('error', (err)=>{
      des3err('error GET BLOB TEXT in KAW ' + key + ' ---- ' + err);
      reject(false);
    })
    txtbin.on('end', ()=>{
      //des3(dat);
      resolve(dat);
    })
  })
  
}

kaw.DeleteObjs = function(bucket, prefix){
  return new Promise((resolve, reject)=>{
    let listpar = {
      Bucket: bucket,
      Prefix: prefix
    }
    s3.listObjectsV2(listpar, (err, data)=>{
      if(err){
        des3err('ERROR - GETTING ITEMS IN KAW.DELETEOBJS ');
        des3err(err);
      } else {
        //des3('GETTING USERITEMS - KAW.DELETEOBJS ');
        //des3(data);
        let itemarray = [];
        for(let item of data.Contents){
          itemarray.push({Key: item.Key});
        }
        s3.deleteObjects({
          Bucket: bucket,
          Delete: {Objects: itemarray}
        }, (err, opresult)=>{
          if(err){
            des3err('KAW.DELETEOBJS: ERROR DELETING OBJECTS');
            des3err(err);
            reject(false);
          } else {
            des3('KAW.DELETEOBJS: DELETE SUCCESS ');
            //des3(opresult);
            resolve(true);
          }
        })
      }
    })
    
    
  })
}


//using presigned url to save cost from using temporary credentials with IDENTITY POOL ID
//-- using this u don't have to calculate signature for your temporary credentials
/* kaw.GetSignedPost = function(){
  var par = {
    Bucket: 'dom-upload' ,//'dom-buck-test',
    Expires: 900,
    Conditions: [
      {'acl': 'public-read'},
      ["starts-with", "$key", ''],
      //['starts-with', '$itemName', ''],
      ["starts-with", '$Content-Type',''],
      ['eq', '$Cache-Control', 'no-cache'],
    ]
    //Fileds: {key: 'key'}
  }
  return new Promise((resolve, reject)=>{
    var ec2meta = new kawaz.EC2MetadataCredentials();
    ec2meta.refresh((err)=>{
      if(err){
        des3err(err);
        reject(err);
      }else {
        des3('--------========== create another s3 -------============')
        des3('aws id ' + ec2meta.accessKeyId);
        des3('sesstion token ' + ec2meta.sessionToken);
        var anos3 = new kawaz.S3({
          accessKeyId: process.env.domadm,//ec2meta.accessKeyId,
          secretAccessKey: process.env.domkey//ec2meta.secretAccessKey,
        }) 
        anos3.createPresignedPost(par, (err, data)=>{
          if(err){
            des3err('err creating presigned post ' + err);
            reject(null);
          } else {
            des3('usrl-presigned ' + util.inspect(data, true, 3, true));
            resolve(data);
          }
        })
      }
    })
  })
}
 */
/* 
  Logins: {
    "IdentityId": <result from getId>
    "cognito-idp.us-east-2.amazonaws.com/us-east-2_xxxxxxx": <your idToken>
}
  //this section is for manual sign up and sign in
  --------------------------------------------
  //LEAVE IT HERE TO DEAL WITH IT LATER

var cognitoService = new kawaz.CognitoIdentityServiceProvider();
var coglog = debug.extend('Cognito-Service');
var cogerr = debug.extend('Cognito-Service-Error');


kaw.userSignUp = function(name, email, pw){
  coglog('name of registration ' + name);
  coglog('email of registration ' + email);
  coglog('password ' + pw);
  var param = {
    ClientId: process.env.pool_client_id,
    Password: pw,
    Username: email,
    UserAttributes: [
      {
        Name: 'name',
        Value: name
      },
      {
        Name: 'email',
        Value: email
      },
      {
        Name: 'phone_number',
        Value: '+17147819483'
      } 
    ]
  }
  cognitoService.signUp(param, (err, data)=>{
    if(err) cogerr(err);
    else coglog(data);
  })
}

kaw.userLogin = function(email, pw){
  coglog('email is ' + email);
  coglog('pw is ' + pw);
  var param = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.pool_client_id,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: pw
    }
  }
  cognitoService.initiateAuth(param).promise()
  .then(data => coglog(data))
  .catch(err => cogerr(err));
} 

  //========END MANUALLY SIGN UP SIGN IN
*/

function FirstUppercase(instring) {
  var strarr = (instring).split(' ');
  for (let strfrag of strarr) {
    var temp = strfrag.charAt(0).toUpperCase() + strfrag.slice(1);
    strarr[strarr.indexOf(strfrag)] = temp;
  }
  return String(strarr.join(' '));
}

module.exports = kaw;




