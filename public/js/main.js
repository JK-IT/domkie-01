window.onload = function(event){
  //find which section is loaded to load more either manga or comic
  var secid = this.document.getElementById('mangaSection');
  if(secid){
    /**===> this is manga page */
    this.LoadBook('manga', 'manga')
  }
}

//------load book on homepage
function LoadBook(type, subtype){
  fetch(window.origin + '/book/fetch/load/' + type + '?subtype='+ subtype, {
    method: 'GET',
    credentials: "include",
    cache: "no-cache"
  }).then(resp=>{
    return resp.json();
  }).then(loadres =>{
    let bookarea = document.getElementById('bookArea');
    let spindiv = document.getElementsByClassName('spinLoading')[0];
    if(!loadres.success){
      bookarea.removeChild(spindiv);
      let p = document.createElement('p');
      p.innerHTML = "Oops!! Something goes wrong, please reload the page."
      bookarea.appendChild(p);
    } else {
      bookarea.removeChild(spindiv);
      bookarea.insertAdjacentHTML('beforeend', loadres.str);
    }
  })
  .catch(err=>{
    console.log('LOAD BOOK ERR: ' + err)
  })
} // =======>>>>>>>> LOAD BOOK FUNCTION

//--------display book info and chapter lists
function DisplayBook(type, title){
  //console.log(type + ' ---- ' + title);
  var name = title.toLowerCase();
  window.location.href = window.origin + '/book/open?type=' + type + '&title=' + title;
} // =======>>>>>>> DISPLAY BOOK FUNCTION

//-----display chapter content
function DisplayChapterContent(event,chapprefix){
  let booktitle = chapprefix.split('/')[0];
  let inchap = chapprefix.split('/')[1];
  let chapcontainer = document.getElementById('bookpage-chapter-content');
  let childlist = Array.from(chapcontainer.children);
  let chapterlist = Array.from(document.getElementsByClassName('bookpage-chaplist')[0].children);
  let nexchaptitle = '';
  let prevchaptitle = '';
  let chapclicked = false;
  for(let i = 0; i < chapterlist.length; i++){
    if(chapterlist[i].innerHTML.replace(/\s/g, '') == inchap.replace(/\s/g, '')){
      nexchaptitle = chapterlist[i+1].innerHTML;
      prevchaptitle = chapterlist[i- 1].innerHTML;
      if(chapterlist[i].classList.contains('chaptitle-clicked')){
        chapclicked = true;
      }
    }
  }

  if(childlist.length != 0){
    /**IF CHILD LIST != 0 =>>>>> REMOVE THE HIDDEN CLASS
     * IF NOT THEN JUST EXECUTE THE FETCH
     */

    //check if this is the error element
    if(chapcontainer.firstElementChild.nodeName == 'P'){
      chapcontainer.removeChild(chapcontainer.lastElementChild);
    } 

    for(let child of childlist){
      child.classList.add('hidden');
    }

    //***** GET TARGET CHAPTER EITHER FROM BUTTON OR P TAG LIST    
    if(chapclicked){

      for(let child of childlist){
        if((child.dataset.chapter).replace(/\s/g, '') == inchap.replace(/\s/g, '')){
          child.classList.remove('hidden');
          break;
        }
      }
      return;//stop the the execution of the rest of function
    }
  }
  fetch(window.origin + '/book/loadchap?chapprefix=' + chapprefix, {
    method: 'GET',
    credentials: "include"
  })
  .then(resp=>{
    if(resp.ok){
      return resp.json();
    } else {
      throw resp.text();
    }
  }).then(resobj=>{
    event.target.classList.add('chaptitle-clicked');
    let wrapdiv = document.createElement('div');
    wrapdiv.setAttribute('data-chapter', inchap);
    //chap title
    let h3 = document.createElement('h3');
    h3.innerHTML = inchap;
    h3.classList.add('chaptitle-decor')
    wrapdiv.appendChild(h3);

    //**************  button 
    let prevbutt = document.createElement('button');
    let prechapprefix = booktitle + '/' + prevchaptitle;
    prevbutt.addEventListener('click', function(e){
      console.log('prev chapter -- ' + prevchaptitle);
      DisplayChapterContent(event, prechapprefix)();
    })
    prevbutt.innerHTML = "Previous Chapter";
    wrapdiv.appendChild(prevbutt)
    let nexbutt = document.createElement('button');
    let nexchapprefix = booktitle +'/' +nexchaptitle;
    nexbutt.addEventListener('click', function(e){
      console.log('next chapter -- ' + nexchapprefix);
      DisplayChapterContent(event, nexchapprefix)();
    }) 
    nexbutt.innerHTML = "Next Chapter";
    wrapdiv.appendChild(nexbutt)
    //************ END BUTTON */

    if(resobj.success){
      let imgdivs = document.createElement('div');
      imgdivs.classList.add('bookpage-chapter-page');
      for(let chapkey of resobj.chapinfo.contents){
        chapkey = chapkey.Key.replace(/\s/g, '+');
        let img = document.createElement('img');
        img.src = resobj.chapinfo.s3link + chapkey;
        imgdivs.appendChild(img);
      }
      wrapdiv.appendChild(imgdivs)
      chapcontainer.appendChild(wrapdiv); 
      
      //chapcontainer.scrollIntoView(true);
      window.scrollTo(0, document.body.scrollHeight);
    } else {
      let p = document.createElement('p');
      p.innerHTML = "Failed to load chapter. Please reload the page!!!"
      chapcontainer.appendChild(p);
    }
  }).catch(err=>{
    console.log('DISPLAY CHAPTER CONTENT ERROR ' + err);
  })
  
} //======>>>>>> DISPLAY CHAPTER CONTENT

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

  // ---- REQUIRED TO CHANGE CONTENT TYPE AN KEY
  PreForm().then(subform=>{
    (async function(){
      var potres = new resFlag(true);

      var emailinfo = {email: oriform.elements.namedItem('email').value};
      var emailblo = new Blob([JSON.stringify(emailinfo)], {type: 'text/plain'});
      var descripinfo = {description: oriform.elements.namedItem('description').value};
      var descripblo = new Blob([JSON.stringify(descripinfo)], {type: 'text/plain'});
      var txtformobj = [];
      var emailkey = usersub + '/listing/' + oriform.elements.namedItem('itemName').value + '/emailinfo';
      var descriptionkey = usersub + '/listing/' + oriform.elements.namedItem('itemName').value + '/descriptioninfo';
      //var fkey = usersub + '/listing/' + oriform.elements.namedItem('itemName').value + '/iteminfo';
      txtformobj.push({key: emailkey, value: emailblo});
      txtformobj.push({key: descriptionkey, value: descripblo});
      for(let obj of txtformobj){
        let filekey = {};
        filekey['Content-Type'] = 'text/plain';
        filekey['key'] = obj.key;
        filekey['file'] = obj.value;
        var form = GenFormTemplate(subform, filekey);
        //a way to post or perform html action in js
        PerformXmlReq('https://dom-upload.s3.amazonaws.com', 'POST', form ,null ,function(xmlins, inresobj){
          //console.log('success full upload item description');
          console.log(xmlins.status);
          inresobj.setFlag(true);
        }, function(xmlins, inresobj){
          //console.log('failed to upload item description');
          console.log(xmlins.status);
          inresobj.setFlag(false);
        }, potres);
      }      
      
      // end section with xml
      var filelist = (oriform.elements.namedItem('file')).files;
      if(filelist.length >= 1){
        for(var file of filelist){
          let objkey = {};
          let key = usersub + '/listing/' + (oriform.elements.namedItem('itemName')).value + '/${filename}';
          let fext = (file.name.split('.')).pop();
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
            potres.setFlag(true);
          } else {
            var teerror = await fetres.text();
            potres.setFlag(false);
            console.log(teerror);
          }
        }
      }
      //console.log('done posting files' );
      //console.log('clear form');
      //console.log(oriform.elements.namedItem('itemName').value);
      if(potres.getFlag()){
        oriform.reset();
        errspan.classList.add('hidden');
        //call to load what user just upload
        //var prefix = usersub + '/listing/';
        var requrl = window.location.origin + '/creator/user/getitems?usersub=' + usersub;
        
        //fetching items after uploading
        fetch(requrl, {
          method: 'GET',
          credentials: "same-origin",
          cache: 'no-store'
        }).then(resp=>{
          if(resp.ok && resp.status < 400){
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
            resp.text().then(te =>{console.log('text from resp '+ te);});
          }
        }).catch(err=>{
          if(err) console.log(err);
        })
      }else {
        errspan.classList.remove('hidden');
        errspan.innerHTML = "Server is too busy, please try again after a few minutes."
      }
      })();
  }).catch(err=>{
    //error: generating subform
  });
  
          
}

function EditListing(e, usersub, itemname, listingtype=0){
  var tar = e.target; //this is the button
  if(tar.innerHTML == 'Edit'){
    tar.innerHTML = 'Update';
    //get div that wrap the form element
    (tar.parentElement.previousElementSibling).style.display = 'block';
  } else if (tar.innerHTML == 'Update'){
    var editform = tar.parentElement.previousElementSibling.firstElementChild;
    //console.log(editform);
    var checkres = CheckEmptyForm(editform);
    if(!checkres.empty){
      //console.log(checkres.fieldobj);
      //call submit to update form
      PreForm().then(subform=>{
        (async function(){
          var bodytext = [];
          var bodyfiles = [];
          for(var obj of checkres.fieldobj){
            if(obj.name.match(/(email)+/i)){
              //console.log('found email');
              var key = usersub + '/listing/' + itemname + '/emailinfo';
              var blo = new Blob([JSON.stringify({email: obj.value})], {type: 'text/plain'});
              var keyobj = {
                'Content-Type': 'text/plain',
                'key': key,
                'file': blo
              }
              var infoform = GenFormTemplate(subform, keyobj);
              bodytext.push(infoform);
            } else if(obj.name.match(/(description)+/i)) {
              //console.log('found description ' + obj.value);
              let key = usersub + '/listing/' + itemname + '/descriptioninfo';
              let blo = new Blob([JSON.stringify({description: obj.value})], {type: 'text/plain'});
              let keyobj = {
                'Content-Type': 'text/plain',
                'key': key,
                'file': blo
              }
              var desform = GenFormTemplate(subform, keyobj);
              bodytext.push(desform);
            } else if(obj.name.match(/(file)+/i) && obj.value.length != 0){ //file list not empty
              for(var file of editform.elements.namedItem('file').files){
                let key = usersub + '/listing/' + itemname + '/${filename}';
                var fext = file.name.split('.').pop();
                var objkey = {
                  'Content-Type': 'image/' + fext,
                  'key': key, 
                  'file': file
                };
                var fileform = GenFormTemplate(subform, objkey);
                bodyfiles.push(fileform);
              }
            }
          }
          var postingres = new resFlag(true);
          if(bodytext.length != 0){
            for(let bdtext of bodytext){
              let res = await PerformFetch('https://dom-upload.s3.amazonaws.com', bdtext);
              postingres.setFlag(res.success);
            }    
          }
          if(bodyfiles.length != 0){
            for(let bdfile of bodyfiles){
              let res = await PerformFetch('https://dom-upload.s3.amazonaws.com', bdfile);
              postingres.setFlag(res.success);
            }
          }
          if(postingres.getFlag()){
            //var requrl = window.location.origin + '/creator/user/getitems?usersub='+usersub+'&itemname='+itemname;
            //editform.clear();
            window.location.reload();
            //tar.innerHTML = 'Edit'; //'testing';
            //(tar.parentElement.previousElementSibling).style.display = 'none';
            /* PerformXmlReq(requrl,'GET', null, function(xmlins){
              console.log('success getting item');
              
            }, function(xmlins){
              console.log('failed to get items');
            }); */
          } else {
            let errspan = tar.nextElementSibling;
            errspan.classList.remove('hidden');
            errspan.innerHTML = 'Server is taking a break. Please try again later!!!';
          }
        })();
        
      }).catch(err=>{
        //error: generating subform
      });
    } else {
      tar.innerHTML = 'Edit'; //'testing';
      (tar.parentElement.previousElementSibling).style.display = 'none';
    }
  }
}

function DeleteObjects(event, usersub, itemname){
  //console.log(window.location.origin);
  let errspan = event.target.parentElement.lastElementChild;
  errspan.innerHTML = '';
  errspan.classList.add('hidden');
  let url = window.location.origin + '/creator/user/deleteobj?usersub=' + usersub + '&itemname=' + itemname;
  PerformXmlReq(url, 'GET', null, 'json', function(xml){
    //console.log('xml success status ' + xml.status);
    //console.log(xml.response);
    let resobj= (xml.response);
    if(resobj.success){
      //console.log('successful delete');
      window.location.reload();
    } else {
      //console.log('failed to delete obj');
      errspan.classList.remove('hidden');
      errspan.innerHTML = 'Server is busy now. Please try again in a moment!';
    }
  }, function(xml){
    console.log('xml error status ' + xml.status + ' xml error text: ');
    console.log(xml.responseText);
  });
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

function PerformXmlReq(url, method, formdata, responsetype ,loadcallack, errorcallback){
  var xml = null;
  if(window.XMLHttpRequest){
    xml = new XMLHttpRequest();
  } else {
    xml = new ActiveXObject('Microsoft.XMLHTTP');
  }
  if(responsetype != null){
    xml.responseType = responsetype;
  }
  if(arguments.length > 6){
    var arg = (Array.prototype.slice.call(arguments)).slice(6);
    arg.unshift(xml);
    xml.onload = ()=>{loadcallack.apply(null,  arg);};
    xml.onerror = ()=>{errorcallback.apply(null, arg);};
  } else {
    xml.onload = ()=>{loadcallack.call(null,xml);};
    xml.onerror = ()=>{errorcallback.call(null,xml);};
  }
  //console.log(arguments.length + ' ' + arguments[6]);
  //xml.withCredentials = true;
  xml.open(method, url);
  if(formdata != null){
    xml.send(formdata);
  } else {
    xml.send();
  }
}

function CheckEmptyForm(form){
  var empty = true;
  var fieldobj = [];
  for(var inp of form.elements){
    if(inp.value.length == 0){
      empty = empty && true;
    } else {
      empty = empty && false;
      var tempobj = {
        name: inp.name,
        value: inp.value
      };
      fieldobj.push(tempobj)
    }
  }
  
  return {
    empty: empty,
    fieldobj: fieldobj
  };
}

function PreForm(){
  //generate from with credentials
  return new Promise((resolve, rejects)=>{
    fetch(window.origin + '/creator/user/upload/', {
      credentials: "include", cache: "no-store"
    }).then(resp=>{
      if(resp.ok && resp.status < 400){
        resp.json().then(jsobj=>{
          //generate from here
          var formfields = [];
          //object acl
          var acl = GenInputEle('hidden', 'acl', 'public-read');
          formfields.push(acl);
          //signature
          var sig = GenInputEle('hidden', 'x-amz-signature', jsobj.amzsig);
          formfields.push(sig);
          //date
          var amzdate = GenInputEle('hidden', 'x-amz-date', jsobj.amzdate);
          formfields.push(amzdate);
          //creden
          var amzcreden = GenInputEle('hidden', 'x-amz-credential', jsobj.amzcred);
          formfields.push(amzcreden);
          //algorithm
          var algorithm = GenInputEle('hidden', 'x-amz-algorithm', jsobj.amzalgor);
          formfields.push(algorithm);
          //policy
          var pol = GenInputEle('hidden', 'policy', jsobj.amz64poli);
          formfields.push(pol);
          //content type
          //var contype = GenInputEle('hidden', 'Content-Type', 'image/png');
          //cache control
          var cacon = GenInputEle('hidden', 'Cache-Control', 'no-cache');
          formfields.push(cacon);
          var subform = document.createElement('form');
          /* subform.action = 'https://s3.us-west-2.amazonaws.com/dom-upload' //body.url;
          subform.method = 'post'; */
          subform.enctype = 'multipart/form-data';
          subform.acceptCharset = 'UTF-8';
          for(let fi of formfields){
            subform.appendChild(fi);
          }
          resolve(subform);
        }).catch(jserr=>{
          //js parsing error
          rejects(null);
        })
      }
    }).catch(err=>{
      //fetching error
      rejects(null);
    })
  })
  
}

function PerformFetch(url, body, inopt=null){
  return new Promise((resolve, reject)=>{
    var opt = {
      method: 'POST',
      //credentials: 'include', if url is aws s3 then u don't need credentials
      cache: "no-cache",
      //mode: 'cors',
      body: body
      };
    
    fetch(url, ((inopt) ? inopt : opt)).then(data =>{
      resolve({success:true, data: data});
    }).catch(err=>{
      reject({success:false, err: err})
    });
  });
}

function resFlag(inflag= null){
  this.flag = inflag? inflag: true;
  this.reset = function(){
    this.flag = true;
  };
  this.setFlag = function(setflag){
    this.flag = this.flag && setflag;
  };
  this.getFlag = function(){
    return this.flag;
  }
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