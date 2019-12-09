
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

//upload with presignedURl
function UploadListing(e, usersub){
  e.preventDefault();
  var oriform = document.forms['uploadListingForm']
  var errspan = document.getElementById('listingFormWarning');
  errspan.classList.add('hidden');
  //var elebeforelast = oriform.lastElementChild.previousElementSibling;
  //....check if all fields is filled
  if( (oriform.elements.namedItem('itemName').value == '' || oriform.elements.namedItem('email').value == '') || oriform.elements.namedItem('description').value == '' || oriform.elements.namedItem('file').files.length == 0){
    errspan.classList.remove('hidden');
    errspan.innerHTML = "Please fill out the all the fields.";
    return;
  }  

  var filelist = (oriform.elements.namedItem('file')).files;
  fetch(window.origin + '/creator/user/upload/', {
    credentials: 'include',
    cache: 'no-store'
  })
    .then(resp =>{
      if(resp.ok){
        resp.json()
          .then(body=>{
            var formfields = [];
            //object acl
            var acl = GenInputEle('hidden', 'acl', 'public-read');
            formfields.push(acl);
            //signature
            var sig = GenInputEle('hidden', 'x-amz-signature', body.amzsig);
            formfields.push(sig);
            //date
            var amzdate = GenInputEle('hidden', 'x-amz-date', body.amzdate);
            formfields.push(amzdate);
            //creden
            var amzcreden = GenInputEle('hidden', 'x-amz-credential', body.amzcred);
            formfields.push(amzcreden);
            //algorithm
            var algorithm = GenInputEle('hidden', 'x-amz-algorithm', body.amzalgor);
            formfields.push(algorithm);
            //policy
            var pol = GenInputEle('hidden', 'policy', body.amz64poli);
            formfields.push(pol);
            //content type
            //var contype = GenInputEle('hidden', 'Content-Type', 'image/png');
            //cache control
            var cacon = GenInputEle('hidden', 'Cache-Control', 'no-cache');
            formfields.push(cacon);
            //key
            //var key = GenInputEle('hidden', 'key', 'testing/${filename}');
            //oriform.submit();

            var subform = document.createElement('form');
            /* subform.action = 'https://s3.us-west-2.amazonaws.com/dom-upload' //body.url;
            subform.method = 'post'; */
            subform.enctype = 'multipart/form-data';
            subform.acceptCharset = 'UTF-8';
            for(let fi of formfields){
              subform.appendChild(fi);
            }
            // ---- REQUIRED TO CHANGE CONTENT TYPE AN KEY
            (async function(){
              var potres = true;
 
              var iteminfo = {};
              iteminfo.email = oriform.elements.namedItem('email').value;
              iteminfo.description = oriform.elements.namedItem('description').value;
              var blo = new Blob([JSON.stringify(iteminfo)], {
                type: 'text/plain'
              });
              var filekey = {};
              var fkey = usersub + '/listing/' + oriform.elements.namedItem('itemName').value + '/iteminfo';
              var ext = 'text/plain';
              filekey['Content-Type'] = 'text/plain';
              filekey['key'] = fkey;
              filekey['file'] = blo;
              var descripform = GenFormTemplate(subform, filekey);
              //a way to post or perform html action in js
              PerformXmlReq('https://dom-upload.s3.amazonaws.com', 'POST', descripform, function(event){
                console.log('success full upload item description');
                potres = potres && true;
              }, function(event){
                console.log('failed to upload item description');
                potres = potres && false;
              });

              // end section with xml
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
              
              if(potres){
                //console.log('clear form');
                oriform.reset();
                errspan.classList.add('hidden');
                //call to load what user just upload
                var prefix = usersub + '/listing/';
                var requrl = window.location.origin + '/creator/user/getitems?prefix=' + prefix;
                
                //fetching items after uploading
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

function PerformXmlReq(url, method, formdata, loadcallack, errorcallback){
  var xml = new XMLHttpRequest;
  xml.onload = loadcallack;
  xml.onerror = errorcallback;
  xml.open(method, url);
  xml.send(formdata);
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
*/