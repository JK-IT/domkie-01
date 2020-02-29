window.onload = function(event){  
  /* this.console.log('loading...');
  this.console.log(window.sessionStorage); */
  if(window.sessionStorage.length == 0){
    this.LoadMangaPage(true);
  } else {
    if(window.sessionStorage.path == '/manga'){
      this.LoadMangaPage(true);
    } else if(window.sessionStorage.path == '/comic'){
      this.LoadComicPage(true);
    } else if(window.sessionStorage.path == '/book/open'){
      this.DisplayBook(window.sessionStorage.type, window.sessionStorage.title);
    }
  }
};

window.onbeforeunload = function(event){
  //event.preventDefault();
  //event.returnValue = '';
  //this.console.log('before unload');
  //this.console.log(window.sessionStorage);
};

window.onunload = function(event){
  /* this.console.log('unload');
  this.console.log(window.sessionStorage); */
  window.location.assign(window.origin + '/');
};

/**Calling to Root  */
function RootLink(){
  window.sessionStorage.clear();
  window.location.assign(window.origin + '/');
}

// ------ load homepage
function LoadMangaPage(history = false){

  ChildRemove('bodyPlaceHolder'); // remove all children
  if(!document.getElementById('rootLoading')){
    var loadiv = GenLoadingDiv();
    //console.log(loadiv);
    document.getElementById('bodyRenderSection').appendChild(loadiv);
  }
  
  var fetchurl = window.origin + '/manga';
  if(history){
    window.history.pushState(null, null, fetchurl);
    window.sessionStorage.setItem('path', window.location.pathname);
    window.sessionStorage.setItem('url', window.location.href);
    //console.log(window.sessionStorage);
  }

  fetch(fetchurl, {
    method: 'GET',
    credentials: 'include'
  })
  .then(resp=>{
    if(resp.ok){
      //render the page
      return resp.json();
    }
  })
  .then(resobj=>{
    let placeholder = document.getElementById('bodyPlaceHolder');
    if(document.getElementById('rootLoading')){
      document.getElementById('bodyRenderSection').removeChild(document.getElementById('rootLoading'));
    } 
    if(resobj.success){
      while(placeholder.lastElementChild){
        placeholder.removeChild(placeholder.firstElementChild);
      } 
      placeholder.insertAdjacentHTML('beforeend', resobj.str);
      this.LoadBook('manga', 'all');
    } else {
      //window.location.replace('/500');
      //throw new Error('Failed to Connect to Server');
      let p = document.createElement('p');
      p.innerHTML = 'Opps!!! Something goes wrong. Please readload the page.';
      placeholder.appendChild(p);
    }
  })
  .catch(err=>{
    console.log('LOAD MANGA PAGE ERR ' + err);
  });
}// END LOAD MANGA PAGE

// ----- load comic page
function LoadComicPage(history = false){
  ChildRemove('bodyPlaceHolder'); //remove all children
  if(!document.getElementById('rootLoading')){
    var loadiv = GenLoadingDiv();
    //console.log(loadiv);
    document.getElementById('bodyRenderSection').appendChild(loadiv);
  }
  let url = window.origin + '/comic';
  if(history){
    window.history.pushState(null, null, url);
    window.sessionStorage.setItem('path', window.location.pathname);
    window.sessionStorage.setItem('url', window.location.href);
    //console.log(window.sessionStorage);
  }
  fetch(url, {
    method: 'GET',
    credentials: 'include'
  })
  .then(resp=>{
    if(resp.ok){
      return resp.json();
    }
  })
  .then(resobj=>{
    let placeholder = document.getElementById('bodyPlaceHolder');
    if(document.getElementById('rootLoading')){
      document.getElementById('bodyRenderSection').removeChild(document.getElementById('rootLoading'));
    } 
    if(resobj.success){
      while(placeholder.lastElementChild){
        placeholder.removeChild(placeholder.lastElementChild);
      }
      placeholder.insertAdjacentHTML('beforeend',resobj.str);
    } else {
      let p = document.createElement('p');
      p.innerHTML = 'Opps!!! Something goes wrong. Please readload the page.';
      placeholder.appendChild(p);
    }
  })
  .catch(err=>{
    console.log('COMIC PAGE LOAD ERR ' + err);
  });
}

//------load book by subtype on homepage
function LoadBook(type, subtype, inkey=null){
  //console.log(inkey);
  var fetchurl = window.origin + '/book/fetch/load/' + type + '?subtype=' + subtype;
  if(inkey != null){
    fetchurl += '&startkey=' + inkey;
  } 
  fetch(fetchurl, {
    method: 'GET',
    credentials: "include"
    //cache: "no-cache"
  }).then(resp=>{
    return resp.json();
  }).then(loadres =>{
    let bookarea = document.getElementById('bookArea');
    let spindiv = document.getElementsByClassName('spinLoading')[0];
    if(spindiv){
      bookarea.removeChild(spindiv);
    }
    if(!loadres.success){
      let p = document.createElement('p');
      p.innerHTML = "Oops!! Something goes wrong, please reload the page.";
      bookarea.appendChild(p);
    } else {
      let bookshelf = document.getElementsByClassName('book-display-wrapper')[0];
      if(!bookshelf){
        bookshelf = document.createElement('div');
        bookshelf.classList.add('book-display-wrapper');
        bookarea.appendChild(bookshelf);
      }
      bookshelf.insertAdjacentHTML('beforeend', loadres.str);
      let loadmorediv = document.getElementsByClassName('book-display-loadmore-button')[0];
      if(loadres.startkey!= null){
        if(loadmorediv){
          while(loadmorediv.firstElementChild){
            loadmorediv.removeChild(loadmorediv.lastElementChild);
          }
        } else {
          loadmorediv = document.createElement('div');
          loadmorediv.classList.add('book-display-loadmore-button');
          bookarea.appendChild(loadmorediv);
        }
        let loadbutt = document.createElement('button');
        loadbutt.innerHTML = 'Load More';
        loadbutt.addEventListener('click', function(e){
          let keyobj = JSON.parse(loadres.startkey);
          LoadBook.call(null, keyobj.type.S, keyobj.subtype ? keyobj.subtype.S : 'all', loadres.startkey);
        });
        loadmorediv.appendChild(loadbutt);
      } else {
        if(loadmorediv){
          bookarea.removeChild(loadmorediv);
        }
      }
    }
  })
  .catch(err=>{
    console.log('LOAD BOOK ERR: ' + err);
  });
} // =======>>>>>>>> LOAD BOOK FUNCTION

//--------display book info and chapter lists
function DisplayBook(type, title){
  //console.log(type + ' ---- ' + title);
  var name = title.toLowerCase();
  if(type == 'manga'){
    document.getElementById('mangaLi').setAttribute('style', 'color: rgb(209, 21, 146)');
    document.getElementById('comicLi').removeAttribute('style');
  } else if(type == 'comic'){
    document.getElementById('comicLi').setAttribute('style', 'color:rgb(0,98,255)');
    document.getElementById('mangaLi').removeAttribute('style');
  }
  var url = window.origin + '/book/open?type=' + type + '&title=' + title;
  window.history.pushState(null,null, url);
  window.sessionStorage.setItem('path', window.location.pathname);
  window.sessionStorage.setItem('type', type);
  window.sessionStorage.setItem('title', title);
  window.sessionStorage.removeItem('url');
  //console.log(window.sessionStorage);
  if(document.getElementById('rootLoading')){
    document.getElementById('bodyRenderSection').removeChild(document.getElementById('rootLoading'));
  }
  fetch(url, {
    method: 'GET',
    credentials: "include"
  })
  .then(resp=>{
    return resp.json();
  })
  .then(resobj=>{

    if(resobj.success){
      //
      ChildRemove('bodyPlaceHolder'); // remove all children
      bodyPlaceHolder.insertAdjacentHTML('beforeend', resobj.str);
      window.scrollTo(0,document.getElementById('bodyNaviLinks').offsetHeight + document.getElementById('headBar').offsetHeight);
      //document.getElementById('headBar').scrollIntoView();
    }else {
      throw new Error('Error reply from server.');
    }
  })
  .catch(err=>{
    console.log(err);
    var placeholder = document.getElementById('bodyPlaceHolder');
    while(placeholder.lastElementChild){
      placeholder.removeChild(placeholder.firstElementChild);
    }
    let p = document.createElement('p');
    p.innerHTML = 'Opps!!! Something goes wrong. Please reload the page';
    placeholder.appendChild(p);
  });
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
      if(chapterlist[i-1] == undefined){
        nexchaptitle = chapterlist[i+1].innerHTML;
      } else if(chapterlist[i+1] == undefined){
        prevchaptitle = chapterlist[i-1].innerHTML;
      } else {
        nexchaptitle = chapterlist[i+1].innerHTML;
        prevchaptitle = chapterlist[i- 1].innerHTML;
      }
      if(chapterlist[i].classList.contains('chaptitle-clicked')){
        chapclicked = true;
      } else {
        chapterlist[i].classList.add('chaptitle-clicked');
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
    let chapnavi = document.createElement('div');
    chapnavi.classList.add('floating-top-div');
    wrapdiv.setAttribute('data-chapter', inchap);
    //chap title
    let h3 = document.createElement('h3');
    h3.innerHTML = inchap;
    h3.classList.add('chaptitle-decor');
    chapnavi.appendChild(h3);

    //**************  button 
    let butdiv = document.createElement('div');
    butdiv.classList.add('bookpage-chapbutt-navi');
    let prevbutt = document.createElement('button');
    if(prevchaptitle == ''){
      
      prevbutt.setAttribute('disabled', 'true');
    }else {
      prevbutt.classList.add('chapbutt-navi');
      let prechapprefix = booktitle + '/' + prevchaptitle;
      prevbutt.addEventListener('click', function(e){
        e.preventDefault();
        //console.log('prev chapter -- ' + prevchaptitle);
        DisplayChapterContent.call(null,event, prechapprefix);
      });
    }
    prevbutt.innerHTML = "Previous Chapter";
    butdiv.appendChild(prevbutt);

    let nexbutt = document.createElement('button');
    if(nexchaptitle == ''){
      nexbutt.setAttribute('disabled', 'true');
    }else {
      nexbutt.classList.add('chapbutt-navi');
      let nexchapprefix = booktitle +'/' +nexchaptitle;
      nexbutt.addEventListener('click', function(e){
        e.preventDefault();
        console.log('next chapter -- ' + nexchapprefix);
        DisplayChapterContent.call(null,event, nexchapprefix);
      });
    }
    nexbutt.innerHTML = "Next Chapter";
    butdiv.appendChild(nexbutt);
    chapnavi.appendChild(butdiv);
    wrapdiv.appendChild(chapnavi);
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
      wrapdiv.appendChild(imgdivs);
      chapcontainer.appendChild(wrapdiv); 
      
      chapcontainer.scrollIntoView(true);
      //window.scrollTo(0, document.body.scrollHeight);
    } else {
      let p = document.createElement('p');
      p.innerHTML = "Failed to load chapter. Please reload the page!!!";
      chapcontainer.appendChild(p);
    }
  }).catch(err=>{
    console.log('DISPLAY CHAPTER CONTENT ERROR ' + err);
  });
  
} //======>>>>>> DISPLAY CHAPTER CONTENT

// /* --- book type navigations */
function BookTypeNavi(e, type){
  e.preventDefault();
  if(type == 'manga'){
    e.target.setAttribute('style', 'color: rgb(209, 21, 146)');
    (e.target.nextElementSibling).removeAttribute('style');
    LoadMangaPage(true);
  }else if(type == 'comic'){
    e.target.setAttribute('style', 'color:rgb(0,98,255)');
    (e.target.previousElementSibling).removeAttribute('style');
    LoadComicPage(true);
  } 
} //END BOOK TYPE NAVIGATION

// /* a function that load book by subtype */
function SortbySubtype(e, type, subtype, inkey= null){
  e.preventDefault();
  //console.log(e.currentTarget);
  let subnavi = document.getElementById('mangaNaviUl');
  for(let li of subnavi.children){
    li.removeAttribute('style');
  }
  let genrenavi = document.getElementById('mangaGenreUl');
  for(let li of genrenavi.children){
    li.removeAttribute('style');
  }
  e.currentTarget.setAttribute('style', 'color: brown;font-size: 1.3em;');
  //clear current children of book area
  let bookarea = document.getElementById('bookArea');
  while(bookarea.lastElementChild){
    bookarea.removeChild(bookarea.firstElementChild);
  }
  let spindiv = document.createElement('div');
  spindiv.classList.add('spinLoading');
  bookarea.appendChild(spindiv);
  LoadBook.call(null, type, subtype, inkey);
  
} // ===>>>>>> END OF Sort By Subtype

/**Sorting book by genre */
function SortbyGenre(e, type, genre, inkey = null){
  e.preventDefault();
  //console.log(e.currentTarget)
  let genreul = document.getElementById('mangaGenreUl');
  for(let li of genreul.children){
    li.removeAttribute('style');
  }
  let subnavi = document.getElementById('mangaNaviUl');
  subnavi.children[0].setAttribute('style', 'color: brown;font-size: 1.3em;');
  for(let i = 1; i < subnavi.children.length; i++){
    subnavi.children[i].removeAttribute('style');
    
  }
  e.currentTarget.setAttribute('style', 'color: rgb(6, 158, 100);font-size: 1.2em;');
  let bookarea = document.getElementById('bookArea');
  let genrediv = document.getElementById('genreDiv');
  if(!genrediv){
    while(bookarea.lastElementChild){
      bookarea.removeChild(bookarea.firstElementChild);
    }
    genrediv = document.createElement('div');
    genrediv.id = 'genreDiv';
    genrediv.setAttribute('data-genre', genre);
    bookarea.appendChild(genrediv);
  } else {
    if(genrediv.dataset.genre != genre){
      while(genrediv.lastElementChild){
        genrediv.removeChild(genrediv.lastElementChild);
      }
      if(document.getElementsByClassName('loadmore-button')[0]){
        bookarea.removeChild(document.getElementsByClassName('loadmore-button')[0]);
      }
      genrediv.dataset.genre = genre;
    }
  }
  // fetching book by genre
  var fetchurl = window.origin + '/book/fetch/genre/'+ genre + '?type='+ type;
  if(inkey != null){
    fetchurl += '&startkey=' + inkey;
  }
  fetch(fetchurl, {
    method: 'GET',
    credentials: 'include',
  }).then(resp=>{
    if(resp.ok){
      return resp.json();
    }
  }).then(jsres=>{
    
    if(jsres.success && jsres.str != 'empty'){
      genrediv.insertAdjacentHTML('beforeend', jsres.str);
      if(document.getElementsByClassName('loadmore-button')[0]){
        bookarea.removeChild(document.getElementsByClassName('loadmore-button')[0]);
      } 
      if(jsres.startkey != 'none'){
        let loadbutt = document.createElement('button');
        loadbutt.innerHTML = 'Load More';
        loadbutt.classList.add('loadmore-button');
        loadbutt.addEventListener('click', function(event){
          event.preventDefault();
          SortbyGenre.call(null,event , type, genre, jsres.startkey);
        });
        bookarea.appendChild(loadbutt);
      }
    }
  }).catch(err=>{
    console.log('ERROR FETCHING BOOK BY GENRE -- ' + err);
  });
} // ==== >>> Sorting BOOK BY GENRE

/** Searching book - Title or name*/
function SearchBook(e){
  e.preventDefault();
  let booktype = '';
  if(document.getElementById('mangaSection')){
    booktype = 'manga';
  } else {
    booktype = 'comic';
  }
  var bookname = ((document.forms.searchForm).elements.searchField).value;
  ((document.forms.searchForm).elements.searchField).value = "";
  bookname = bookname.toLowerCase();
  let fetchurl = window.origin + '/book/search/'+booktype+'?bookname='+bookname;
  fetch(fetchurl, {
    method: 'GET',
    credentials: 'include'
  })
    .then(resp=>{
      if(resp.ok){
        return resp.json();
      }else {
        /* return new Promise((resolve, reject)=>{
          resp.text().then(txt=>{
            reject(txt);
          });
        }); */
        throw resp.text();
      }  
    })
    .then(jsres=>{
      let bookarea = document.getElementById('bookArea');
      let h3 = document.createElement('h3');
      while(bookarea.lastElementChild){
        bookarea.removeChild(bookarea.firstElementChild); 
      }
      if(jsres.str != 'empty'){
        h3.innerHTML = 'Search Results:';
        bookarea.appendChild(h3);
        bookarea.insertAdjacentHTML('beforeend', jsres.str);
      } else {
        h3.innerHTML = 'X| Cannot Find The Title';
        bookarea.appendChild(h3);
      }
    })
    .catch(err =>{
      console.error('getting error while search for the book ' + err);
    });
} // END BOOK SEARCHING FUNCTION

// use this to generate PRELOADING FUNCTION
function GenLoadingDiv(){
  var div = document.createElement('div');
  div.id = 'rootLoading';
  var preload = document.createElement('div');
  preload.classList.add('preloader');
  div.appendChild(preload);
  return div;
} // END GENERATING PRELOADING FUNCTION

/**Child removing functionn */
function ChildRemove(parentname){
  if(document.getElementById(parentname) && document.getElementById(parentname).children.length != 0){
    while(document.getElementById(parentname).lastElementChild){
      document.getElementById(parentname).removeChild(document.getElementById(parentname).firstElementChild);
    }
  }
} // END REMOVING CHILDREN FUNCTIOON

/**HANDLING POPSTATE WHEN USER CLICK BACK BUTTON */
window.onpopstate = function (event){
  //this.alert(window.location);
  /* console.log('pop state');
  this.console.log(window.location); */
  //this.console.log(window.sessionStorage);

  let mangali = document.getElementById('mangaLi');
  let comicli = document.getElementById('comicLi');

  if(window.location.pathname == '/manga'){
    mangali.setAttribute('style', 'color: rgb(209, 21, 146)');
    comicli.removeAttribute('style');
    this.LoadMangaPage(true);
  } else if(window.location.pathname == '/comic'){
    comicli.setAttribute('style', 'color:rgb(0,98,255)');
    mangali.removeAttribute('style');
    this.LoadComicPage(true);
  } else if (window.location.pathname == '/book/open'){
    this.DisplayBook(window.sessionStorage.type, window.sessionStorage.title);
  } else {
    this.LoadMangaPage(true);
  }
}; //END HANDLING POPSTATE OF WINDOWS 


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
  var oriform = document.forms['uploadListingForm'];
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