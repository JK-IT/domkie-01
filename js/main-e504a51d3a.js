
function OpenBook(e, title, type){
  window.open(window.origin + '/book/' + type + '/' + title, '_blank', "fullscreen=yes,titlebar=yes,location=no");
}

function ListBook(e, type){
  window.location.assign(window.origin + '/book/' + type);
}

function FetchMore(e, type, idname, publisher = null){
  var container = document.getElementById(idname);
  var tar = e.currentTarget;
  var lastkey = tar.getAttribute("data-lastkey");
  if(publisher != '' && publisher != null){
    fetch(window.origin + "/book/fetch/" + type + "/?lastkey=" + lastkey + "&publisher=" + publisher)
    .then(resp=>{
      if(resp.ok){
        resp.json()
        .then(data =>{
          container.removeChild(container.lastElementChild);
          container.innerHTML += data.added;
        })
      }
    })
    .catch(err =>{
      console.error('getting error while fetching book by genre' + err);
    })
  } else {
    fetch(window.origin + "/book/fetch/" + type + "/?lastkey=" + lastkey )
    .then(resp =>{
      if(resp.ok){
        resp.json()
        .then(data =>{
          container.removeChild(container.lastElementChild);
          container.innerHTML += data.added;
        })
      }
    })
    .catch(err =>{
      console.error('getting error while fetching ' + err);
    })
  }
  
}

function OpenChapter(e, title, chap){
  (e.currentTarget).classList.add('opened-chap');
  var chapcon = (e.currentTarget).nextElementSibling;
  if(chapcon.childElementCount == 0){
    fetch(window.origin + "/book/open/" + title + "/" + chap )
    .then(function(resp){
      if(resp.ok){
        resp.json()
        .then(chapdata =>{
          chapdata.imglist.forEach(function(ele, idx){
            var image = document.createElement('img');
            image.src = ele;
            chapcon.appendChild(image);
          })
          var button = document.createElement('button');
          button.innerText = "End of Chapter";
          button.style.width = "100%";
          chapcon.appendChild(button);
          chapcon.classList.toggle('nodisplay');
        })
      }
    })
    .catch(err=>{
      console.error('getting error while fetching chapter ' + err);
    })
  } else {
    chapcon.classList.toggle('nodisplay');
  }
  
}

function ToggleChapReading(e){
  (e.currentTarget).classList.toggle('nodisplay');
}

function SearchBook(e){
  e.preventDefault();
  console.log('get search req')
  var bookname = ((document.forms.searchForm).elements.searchField).value;
  ((document.forms.searchForm).elements.searchField).value = "";
  bookname = bookname.toLowerCase();
  fetch(window.origin + '/book/search/' + bookname)
    .then(resp=>{
      if(resp.ok){
        resp.json()
          .then(data =>{
            var seresdiv = document.getElementsByClassName('search-result')[0];
            if(seresdiv.childElementCount != 0){
              while(seresdiv.lastElementChild){
                seresdiv.removeChild(seresdiv.lastElementChild);
              }
            }
            seresdiv.innerHTML = data.searchres;
          })
          .catch(err =>{
            console.error('getting error while parsing json from response')
          })
      }
    })
    .catch(err =>{
      console.error('getting error while search for the book')
    })
}

function ClearSearch(e){
  var seresdiv = document.getElementsByClassName('search-result')[0];
  if(seresdiv.childElementCount != 0){
    while(seresdiv.lastElementChild){
      seresdiv.removeChild(seresdiv.lastElementChild);
    }
  }
}

function BookGenreLink(e, genlink, divname){
  var tar = e.currentTarget;
  var parele = tar.parentElement; 
  for(var ele of parele.children){
    ele.classList.remove('sub-link-active');
  }
  tar.classList.add('sub-link-active');
  var div = document.getElementById(divname);
  if( div != null){
    if(divname == 'comicListing'){
      var comiclink = null;
      switch(genlink){
        case "Others": {
          comiclink = window.origin + '/book/list/comic/' + 'Others';
          break;
        }
        case "DC Comics":{
          comiclink = window.origin + '/book/list/comic/' + 'DC Comics';
          break;
        }
        case "Marvel Comics": {
          comiclink = window.origin + '/book/list/comic/' + 'Marvel Comics';
          break;
        } 
        default:{
          comiclink = window.origin + '/book/fetch/comic?lastkey=null';
        }
      }
      fetch(comiclink)
      .then(resp => {
        if(resp.ok){
          resp.json()
            .then(data =>{
              while(div.lastElementChild){
                div.removeChild(div.lastElementChild);
              }
              div.innerHTML += data.added;
            })
        }
      })
      .catch(err =>{
        console.error('error while get book by comic genre ' + err);
      })
    } else {
      var mangalink = null;
      switch(genlink){
        case "manga":{
          mangalink = window.origin + '/book/list/manga/' + 'manga';
          break;
        }
        case "manhwa": {
          mangalink = window.origin + '/book/list/manga/' + 'manhwa';
          break;
        }
        case "manhua": {
          mangalink = window.origin + '/book/list/manga/' + 'manhua';
          break;
        }
        default:{
          mangalink = window.origin + '/book/fetch/manga?lastkey=null'
        }
      }
      fetch(mangalink)
      .then(resp =>{
        if(resp.ok){
          resp.json()
            .then(data =>{
              while(div.lastElementChild){
                div.removeChild(div.lastElementChild);
              }
              div.innerHTML += data.added;
            })
        }
      })
      .catch(err =>{
        console.error('error while get book by manga genre ' + err);
      })
    }
    
  }
}

var emailregex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

function Login(e){
  var loginform = document.forms.namedItem("loginForm");
  var email = (loginform.elements.namedItem('email')).value;
  
  var pw = (loginform.elements.namedItem('pwlogin')).value;
   
  var emailspan = (document.getElementById('loginEmailSpan'));
  emailspan.innerHTML = '';
  var pwspan = document.getElementById('loginPwSpan');
  pwspan.innerHTML = '';
  var emailvalid = emailregex.test(email);
  var pwvalid = (pw.length >= 6);
  if(emailvalid && pwvalid){
    //perform checking authentication
    var paform = e.currentTarget.parentElement;
    paform.method = 'POST';
    paform.action = 'creator/login';
    paform.submit();
    loginform.elements.namedItem('email').value = '';
    loginform.elements.namedItem('pwlogin').value = '';
  } else {
    if(!emailvalid){
      emailspan.innerHTML = 'Please enter a valid email address!!!';
    }
    if(!pwvalid){
      pwspan.innerHTML = 'Password must be at least 6 in length';
    }
  }
}

function Signup(e){
  var signupform = document.forms.namedItem('signupForm');
  var displayname = (signupform.elements.namedItem('username')).value;
  
  var email = (signupform.elements.namedItem('email')).value;
  var emailvalid = emailregex.test(email);
  
  var pw = (signupform.elements.namedItem('pwsignup')).value;
  var pwvalid = (pw.length >= 6);
  
  var repw = (signupform.elements.namedItem('repwsignup')).value;
  var repwvalid = (pw === repw);
  
  var emailspan = document.getElementById('signupEmailSpan');
  emailspan.innerHTML = '';
  var pwspan = document.getElementById('signupPwSpan');
  pwspan.innerHTML = '';
  var repwspan = document.getElementById('signupRePwSpan');
  repwspan.innerHTML = '';
  
  if(emailvalid && pwvalid && repwvalid){
    console.log(e.target.parentElement);
    var paform = e.target.parentElement;
    paform.method = 'POST';
    paform.action = 'creator/signup';
    paform.submit();
    (signupform.elements.namedItem('username')).value = '';
    (signupform.elements.namedItem('email')).value = '';
    (signupform.elements.namedItem('pwsignup')).value = '';
    (signupform.elements.namedItem('repwsignup')).value = '';
  } else {

    if(!emailvalid) emailspan.innerHTML = "Please enter a valid email address!!!";
    if(!pwvalid) pwspan.innerHTML = "Password must be at least 6 in length";
    if(!repwvalid) repwspan.innerHTML = "Password does not match!";
  }

}

function UploadUsingTempCredentials(e, userpoolsubid){
  e.preventDefault();
  fetch('http://localhost:8008/creator/user/upload////', {
    credentials: "include",
    method: 'GET'
  })
    .then(resp =>{
      if(resp.ok){
        resp.json().then(packeddata =>{
          
          //var form = document.createElement('form');
          var oriform = document.forms.namedItem('upload-form');
          var elebeforelast = oriform.lastElementChild.previousElementSibling;
          /* var form = document.createElement('form');
          form.setAttribute('enctype', 'multipart/form-data');
          form.setAttribute('method', 'post');
          form.setAttribute('action', 'http://s3.us-west-2.amazonaws.com/dom-buck-test/'); */
          //create form fields
          //acl permission
          var aclf = document.createElement('input');
          aclf.name = 'acl';
          aclf.value = "public-read";
          aclf.type = 'hidden';
          oriform.insertBefore(aclf, elebeforelast);

          //cache control
          var caccon = document.createElement('input');
          caccon.name = 'Cache-Control';
          caccon.value = 'no-cache';
          caccon.type = 'hidden'
          oriform.insertBefore(caccon, elebeforelast);
          //content type
          var contype = document.createElement('input');
          contype.name = 'Content-Type';
          contype.value = 'image/jpeg';
          contype.type = 'hidden';
          oriform.insertBefore(contype, elebeforelast);
          //algorithm
          var algorithm = document.createElement('input');
          algorithm.name = 'X-Amz-Algorithm';
          algorithm.value = packeddata.xamzalgor;
          algorithm.type = 'hidden';
          oriform.insertBefore(algorithm, elebeforelast);
          //policy
          var pol = document.createElement('input');
          pol.name = 'Policy' ;
          pol.value = packeddata.xamzb64poli;
          pol.type = 'hidden';
          oriform.insertBefore(pol, elebeforelast);
          //signature
          var signature = document.createElement('input');
          signature.name = 'X-Amz-Signature';
          signature.value = packeddata.xamzsignature;
          signature.type = 'hidden'
          oriform.insertBefore(signature, elebeforelast);
          //date
          var amzdate = document.createElement('input');
          amzdate.name = 'X-Amz-Date' ;
          amzdate.value = packeddata.xamzdate;
          amzdate.type = 'hidden';
          oriform.insertBefore(amzdate, elebeforelast);
          //creden
          var amzcreden = document.createElement('input');
          amzcreden.setAttribute('name', 'X-Amz-Credential')
          amzcreden.setAttribute('value', packeddata.xamzcred)
          amzcreden.setAttribute('type', 'hidden');
          oriform.insertBefore(amzcreden, elebeforelast);

          //key of object, redirection, 
          var keyprefix = `${userpoolsubid}/${packeddata.idenid}`
          console.log('prefix key ' + keyprefix);
          var key = document.createElement('input');
          key.setAttribute( 'type','hidden');
          key.setAttribute( 'name','key');
          key.setAttribute( 'value', keyprefix + '/${filename}');
          oriform.insertBefore(key, elebeforelast);

          //this session token tell aws system that this user is temporary
          var setok = document.createElement('input');
          setok.setAttribute('type', 'hidden');
          setok.setAttribute('name', 'x-amz-security-token');
          setok.setAttribute('value', packeddata.xamzsetoken);
          oriform.insertBefore(setok, elebeforelast);
          
          //console.log(oriform);
          oriform.submit();
        })
        .catch(err =>{
          console.log('error while parsing json body ' + err)
        })
      }
    })
    .catch(err =>{
      console.log('error while fetching data ' + err);
    })
}

//upload with presignedURl
function UploadListing(e, usersub){
  e.preventDefault();
  var oriform = document.forms['uploadListingForm']
  //var elebeforelast = oriform.lastElementChild.previousElementSibling;
  var filelist = (oriform.elements.namedItem('file')).files;

  fetch(window.origin + '/creator/user/upload/', {
    credentials: 'include',
    cache: 'no-store'
  })
    .then(resp =>{
      if(resp.ok){
        resp.json()
          .then(body=>{
            //object acl
            var acl = GenInputEle('hidden', 'acl', 'public-read');
            //signature
            var sig = GenInputEle('hidden', 'x-amz-signature', body.amzsig)
            //date
            var amzdate = GenInputEle('hidden', 'x-amz-date', body.amzdate)
            //creden
            var amzcreden = GenInputEle('hidden', 'x-amz-credential', body.amzcred)
            //algorithm
            var algorithm = GenInputEle('hidden', 'x-amz-algorithm', body.amzalgor)
            //policy
            var pol = GenInputEle('hidden', 'policy', body.amz64poli);
            //content type
            //var contype = GenInputEle('hidden', 'Content-Type', 'image/png');
            //cache control
            var cacon = GenInputEle('hidden', 'Cache-Control', 'no-cache');
            //key
            //var key = GenInputEle('hidden', 'key', 'testing/${filename}');
            //oriform.submit();

            var subform = document.createElement('form');
            /* subform.action = 'https://s3.us-west-2.amazonaws.com/dom-upload' //body.url;
            subform.method = 'post'; */
            subform.enctype = 'multipart/form-data'
            subform.acceptCharset = 'UTF-8'
            subform.appendChild(acl);
            subform.appendChild(sig);
            subform.appendChild(amzdate);
            subform.appendChild(amzcreden);
            subform.appendChild(algorithm);
            subform.appendChild(pol);
            subform.appendChild(cacon);
            // ---- REQUIRED TO CHANGE CONTENT TYPE AN KEY
            (async function(){
              var potres = true;
              if(filelist.length >= 1){
                for(var file of filelist){
                  var objkey = {};
                  var key = usersub + '/listing/' + (oriform.elements.namedItem('itemName')).value + '/${filename}';
                  var fext = (file.name.split('.')).pop();
                  objkey['Content-Type'] = 'image/' + fext;
                  objkey['key'] = key;
                  objkey['file'] = file;
                  var fordata = GenFormTemplate(subform, objkey);
                  var fetres = await fetch('https://dom-upload.s3.amazonaws.com', {
                    method: 'POST',
                    body: fordata
                  });
                  if(fetres.ok){
                    //console.log('success');
                    potres = potres && true;
                  } else {
                    var teerror = await fetres.text();
                    potres = potres && false;
                    console.log(teerror);
                  }
                }
              }
              //console.log('done posting files' );
              var errspan = document.getElementById('listingFormWarning')
              if(potres){
                //console.log('clear form');
                oriform.reset();
                errspan.classList.add('hidden');
                //call to load what user just upload
                var prefix = usersub + '/listing/';
                var requrl = window.location.origin + '/creator/user/getitems?prefix=' + prefix;
                
                fetch(requrl, {
                  method: 'GET',
                  credentials: "same-origin",
                  cache: 'no-store'
                }).then(resp=>{
                  if(resp.ok && resp.status != 500){
                    resp.json()
                      .then(jsonobj=>{
                        if(jsonobj.str != null){
                          var itemele = document.getElementsByClassName('item-container');
                          while(itemele.length != 0){
                            itemele[0].parentNode.removeChild(itemele[0])
                          }
                          var fiele = document.getElementById('listing').firstElementChild;
                          var template = document.createElement('template');
                          template.innerHTML = ((jsonobj.str).trim());
                          try{
                            fiele.insertAdjacentElement('afterend', template.content.firstElementChild);
                          } catch(err){
                            console.error(err);
                          }
                        }
                      }).catch(jsonerr =>{
                        console.log(jsonerr);
                      })
                  } else {
                    console.log(resp.statusText);
                    resp.text().then(te =>{console.log('text from resp '+ te)})
                  }
                }).catch(err=>{
                  if(err) console.log(err);
                })
              }else {
                errspan.classList.remove('hidden');
                errspan.innerHTML = "Server is too busy, please try again after a few minutes."
              }
            })();
            
          })
          .catch(err =>{
            //error while parsing json body
            //console.log(err);
          })
      }
    })
    .catch(err =>{
      //error -fetching upload 
      //console.log(err);
    })
}

/*
  ----HELPER FUNCTIONS
*/

function GenInputEle(type, name, value){
  var inp = document.createElement('input');
  inp.name = name;
  inp.value = value;
  inp.type = type;
  return inp;
}

function GenFormTemplate(template, objkey){
  var fodata = new FormData(template);
  var entries = Object.entries(objkey);
  for (var [key, val] of entries){
    fodata.append(key, val);
  }
  return fodata;
}

/* var postres = true;
    for( var form of foarr){
      console.log('uploading')
      fetch(body.url, {
        method: 'POST',
        body: form
      }).then(resp =>{
        //
        if(resp.ok){
          console.log(resp.status);
          postres = postres && true;
        } else {
          postres = postres && false;
          resp.text()
          .then(textbody =>{
            console.log(textbody);
          })
          .catch(err =>{
            //console.error(err);
          })
        }
      }).catch(err =>{
        //console.error(err);
      })
    } */

/*
//object acl
  var acl = GenInputEle('hidden', 'acl', 'public-read');
  //signature
  var sig = GenInputEle('hidden', 'x-amz-signature', body.fields['X-Amz-Signature'])
  //date
  var amzdate = GenInputEle('hidden', 'x-amz-date', body.fields['X-Amz-Date'])
  //creden
  var amzcreden = GenInputEle('hidden', 'x-amz-credential', body.fields['X-Amz-Credential'])
  //algorithm
  var algorithm = GenInputEle('hidden', 'x-amz-algorithm', body.fields['X-Amz-Algorithm'])
  //policy
  var pol = GenInputEle('hidden', 'policy', body.fields.Policy);
  //content type
  //var contype = GenInputEle('hidden', 'Content-Type', 'image/png');
  //cache control
  var cacon = GenInputEle('hidden', 'Cache-Control', 'no-cache');
  //key
  //var key = GenInputEle('hidden', 'key', 'testing/${filename}');
  //oriform.submit();

  var subform = document.createElement('form');
  subform.action = body.url;
  subform.method = 'post';
  subform.enctype = 'multipart/form-data'
  subform.acceptCharset = 'UTF-8'
  subform.appendChild(acl);
  subform.appendChild(sig);
  subform.appendChild(amzdate);
  subform.appendChild(amzcreden);
  subform.appendChild(algorithm);
  subform.appendChild(pol);
  subform.appendChild(cacon);
  // ---- REQUIRED TO CHANGE CONTENT TYPE AN KEY
  (async function(){
    var potres = true;
    if(filelist.length >= 1){
      for(var file of filelist){
        var objkey = {};
        var key = usersub + '/listing/' + (oriform.elements.namedItem('itemName')).value + '/${filename}';
        var fext = (file.name.split('.')).pop();
        objkey['Content-Type'] = 'image/' + fext;
        objkey['key'] = key;
        objkey['file'] = file;
        var fordata = GenFormTemplate(subform, objkey);
        //console.log('perform post');
        var fetres = await fetch(body.url, {
          method: 'POST',
          body: fordata
        });
        if(fetres.ok){
          //console.log('success');
          potres = potres && true;
        } else {
          var teerror = await fetres.text();
          potres = potres && false;
          console.log(teerror);
        }
      }
    }
    //console.log('done posting files' );
    var errspan = document.getElementById('listingFormWarning')
    if(potres){
      //console.log('clear form');
      oriform.reset();
      errspan.classList.add('hidden');
      //call to load what user just upload
      var prefix = usersub + '/listing/';
      var requrl = window.location.origin + '/creator/user/getitems?prefix=' + prefix;
      
      fetch(requrl, {
        method: 'GET',
        credentials: "same-origin"
      }).then(resp=>{
        if(resp.ok && resp.status != 500){
          resp.json()
            .then(jsonobj=>{
              if(jsonobj.str != null){
                var itemele = document.getElementsByClassName('item-container');
                while(itemele.length != 0){
                  itemele[0].parentNode.removeChild(itemele[0])
                }
                var fiele = document.getElementById('listing').firstElementChild;
                var template = document.createElement('template');
                template.innerHTML = ((jsonobj.str).trim());
                try{
                  fiele.insertAdjacentElement('afterend', template.content.firstElementChild);
                } catch(err){
                  console.error(err);
                }
              }
            }).catch(jsonerr =>{
              console.log(jsonerr);
            })
        } else {
          console.log(resp.statusText);
          resp.text().then(te =>{console.log('text from resp '+ te)})
        }
      }).catch(err=>{
        if(err) console.log(err);
      })
    }else {
      errspan.classList.remove('hidden');
      errspan.innerHTML = "Server is too busy, please try again after a few minutes."
    }
  })();
*/