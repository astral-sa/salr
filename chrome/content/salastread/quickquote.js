var persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
                      .createInstance(Components.interfaces.nsISupports).wrappedJSObject;

var hasSpellCheck = false;

var attachedFileName = "";

var imageShackResult = null;
var isDetached = false;

var quoteWaitString = "[[ Please wait, retrieving post quote... ]]";

function detachFromDocument() {
   isDetached = true;
   document.getElementById("submit-swap").disabled = true;
   document.getElementById("submit-normal").disabled = true;
   document.getElementById("previewbtn").disabled = true;
   document.getElementById("submit-swap").setAttribute("label","Detached");
   document.getElementById("submit-normal").setAttribute("label","Detached");
}

function doWaffleImages() {
   imageShackResult = null;
   openDialog("chrome://salastread/content/waffleimages/waffleimages.xul", "_blank",
                               "chrome, titlebar, modal");
   if (imageShackResult) {
      insertTextAtCursor(imageShackResult);
   }
}

function recoverLastPost() {
   if ( persistObject.__quickreply__lastpost ) {
      var res = confirm("Do you want to replace the contents of this Quick Reply "+
         "window with the text of the last reply you attempted to submit? "+
         "The text of the current reply will be lost.");
      if ( res ) {
         document.getElementById("messagearea").value = persistObject.__quickreply__lastpost;
      }
   } else {
      alert("There is no last post to recover.");
   }
}

function checkKeys(e) {
   if ( e.ctrlKey ) {
      if ( (e.charCode==119 || e.charCode==87) ) {   // "w"
         releaseVars();
         window.close();
      }
   }
}

function addQuoteText(txt) {
   //if (txt=="") {
   //}
   document.getElementById("messagearea").value += "\n" + txt;
}

function grabComplete() {
   alert("got it");
}

function emotRegex(s) {
      emotRe = /src="(.*?)".*?<br \/>(.*?)<\/td>/i;
      emotRe.exec(s);
      persistObject.emoticons.push( new Array(RegExp.$2, RegExp.$1) );
}

function getEmoticonsFromServer() {
   try {
      var xht = new XMLHttpRequest();
      xht.open("GET", "http://forums.somethingawful.com/misc.php?s=&action=showsmilies", false);
      xht.send(null);
      var restext = xht.responseText;

      persistObject.emoticons = new Array();  

      emotRe = /<td class="smtxt">(.*?)<\/td>/gi;
      emotArray = restext.match(emotRe);

      emotArray.forEach(emotRegex);
      persistObject.emoticons.sort();
   }
   catch (e) {
      alert("getEmoticonsFromServer() error:\n" + e);
      persistObject.emoticons = null;
   }
}

var pageGetter = null;
var getter_isquote = 0;
var getter_getFormKeyOnly = true;

var sa_formkey = (persistObject.__cachedFormKey && persistObject.__cachedFormKey!="") ? persistObject.__cachedFormKey : "";

function showDebugData(event) {
   if (event.button == 2) {
      alert("threadid = "+window.opener.__salastread_quotethreadid+"\nformkey = "+ sa_formkey);
   }
}

function startPostTextGrab(getFormKeyOnly, postid) {
   pageGetter = new XMLHttpRequest();
   getter_isquote = 1;
   getter_getFormKeyOnly = getFormKeyOnly;
   if (!postid) {
      postid = window.opener.__salastread_quotepostid;
   }
   var targeturl = "http://forums.somethingawful.com/newreply.php?s=&action=newreply&postid=" + postid;
   if ( postid==null ) {
      getter_isquote = 0;
      targeturl = "http://forums.somethingawful.com/newreply.php?s=&action=newreply&threadid=" + window.opener.__salastread_quotethreadid;
   }
   if (window.__salastread_quickpost_forumid) {
      getter_isquote = 0;
      targeturl = "http://forums.somethingawful.com/newthread.php?forumid=" + window.__salastread_quickpost_forumid;     
     getter_getFormKeyOnly = 1;
   }
   if (window.__salastread_is_edit) {
      getter_isquote = 1;
      targeturl = "http://forums.somethingawful.com/editpost.php?s=&action=editpost&postid=" + postid;     
   }
   //alert("targeturl = "+targeturl);
   pageGetter.open("GET", targeturl, true);
   pageGetter.onreadystatechange = postTextGrabCallback;
   pageGetter.send(null);
}

function postTextGrabCallback() {
   try {
      if (pageGetter.readyState==2) {
         if (pageGetter.status != 200) {
            alert("Failed to communicate with forums.somethingawful.com");
            pageGetter.abort();
         }
      }
      else if (pageGetter.readyState==4) {
         var respText = pageGetter.responseText;
         finalizeTextGrab(respText);
      }
   }
   catch (ex) {
   }
}

function __old__() {
   //try{
   var isquote = 1
   var targeturl = "http://forums.somethingawful.com/newreply.php?s=&action=newreply&postid=" + window.opener.__salastread_quotepostid;
   if ( window.opener.__salastread_quotepostid==null ) {
      //alert("isquote = 0");
      isquote = 0;
      targeturl = "http://forums.somethingawful.com/newreply.php?s=&action=newreply&threadid=" + window.opener.__salastread_quotethreadid;
   }
   var xht = new XMLHttpRequest();
   xht.open("GET", targeturl, false);
   xht.send(null);
   var restext = xht.responseText;
   var fkeygettext = xht.responseText;
}

function getQuoteIntroText() {
   var astr = persistObject.string_quoteIntroText;
   if ( astr.indexOf("|")!=-1 ) {
      var qits = astr.split("|");
      var qnum = Math.floor( Math.random() * qits.length );
      return qits[qnum];
   } else {
      return astr;
   }
}

function replaceQuoteIntroText(restext,postid) {
/*
   if ( restext.match(/had this to say about the Jewish conspiracy:/) ) {
      var qumatch = restext.match(/\[QUOTE\]\[i\](.*?) had this to say about the Jewish conspiracy:/);
      if (qumatch) {
         var xstr = getQuoteIntroText();
         xstr = xstr.replace(/\[who\]/g, qumatch[1]);
         return restext.replace("[QUOTE][i]"+qumatch[1]+" had this to say about the Jewish conspiracy:",
                   "[QUOTE][i][PL="+postid+"]"+xstr+"[/PL]");
      }
   } else {
      var qumatch = restext.match(/\[QUOTE\]\[i\](.*?) came out of the closet to say: /);
      if (qumatch) {
         var xstr = getQuoteIntroText();
         xstr = xstr.replace(/\[who\]/g, qumatch[1]);
         return restext.replace("[QUOTE][i]"+qumatch[1]+" came out of the closet to say: ",
                   "[QUOTE][i][PL="+postid+"]"+xstr+"[/PL]");
      }
   }
*/

   var re = new RegExp("^\\[quote=(.+)\\]$", "m");
   var qm = restext.match(re);
   if (qm) {
      var qwho = qm[1];
      qwho = qwho.replace("&", "&amp;");
      qwho = qwho.replace("[", "&#91;");
      qwho = qwho.replace("]", "&#93;");
      qwho = qwho.replace("\"", "&quot;");
      qwho = qwho.replace("'", "&#39;");
      qwho = qwho.replace("<", "&lt;");
      qwho = qwho.replace(">", "&gt;");
      restext = restext.replace(re, "[quote="+qwho+"]");
   }
   return restext;
}

function qpSetPostIcon(e) {
  var el = e.originalTarget;
  var pib = document.getElementById('posticonbutton');
  pib.setAttribute('image', el.getAttribute('image'));
  pib.iconid = el.iconid;
}

function finalizeTextGrab(restext) {
	var before = document.getElementById("messagearea").value
	before = before.replace(quoteWaitString, "");

   var el = document.getElementById("replypage").contentDocument.body;
   el.innerHTML = restext;
   var tnode = selectSingleNode(document.getElementById("replypage").contentDocument, el, "//TEXTAREA[@name='message']");
   document.getElementById("messagearea").value = before +  tnode.value;
   doPreview();

   var fknode = selectSingleNode(document.getElementById("replypage").contentDocument, el, "//INPUT[@name='formkey']");
   if (fknode) {
     sa_formkey = fknode.value;
     persistObject.__cachedFormKey = sa_formkey;
   }

   if (!isDetached) {
      document.getElementById("submit-swap").disabled = false;
      document.getElementById("submit-normal").disabled = false;
   }
   
   if (window.__salastread_is_edit) {
      document.title = 'Quick Edit';
      document.getElementById('qrtitle').setAttribute('value', 'Quick Edit');
      document.getElementById('previewbtn').disabled = true;
   }
      
   if (window.__salastread_quickpost_forumid) {
     //This is a Quick Post window - look the part!
     document.title = 'Quick Post';
     document.getElementById('qrtitle').setAttribute('value', 'Quick Post');
     document.getElementById('quickpostoptions').setAttribute('collapsed', 'false');
     //Uh, also load the post icons
     var iconz = selectNodes(document.getElementById("replypage").contentDocument, el, "//INPUT[@name='iconid']");
     var iconmenu = document.getElementById('posticonmenu');
     var hbox = document.getElementById('posticonmenuhbox');
     document.getElementById('posticonbutton').iconid = 0;
     for (var i = 0; i < iconz.length; i++) {
       var l = iconz[i];
       var iconid = l.value;
       while (l.nextSibling) {
         l = l.nextSibling;
         if (l.src) {
           var newel = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","menuitem");
           newel.className = "menuitem-iconic";
           newel.setAttribute("image", l.src);
           newel.iconid = iconid;
           newel.addEventListener('click', qpSetPostIcon, false);
           hbox.appendChild(newel);
           if (i % 5 == 0) {
             hbox = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","hbox");
             iconmenu.appendChild(hbox);
           }
           break;
         }
       }
     }
   }
   
   return; 


   var fkeygettext = restext;
   if (getter_isquote==1 && getter_getFormKeyOnly==false) {
      // Why doesn't this work? :(
      //var tamatch = restext.match(/<textarea.*?>(.*?)<\/textarea>/mi)[1];
      restext = restext.substring( restext.indexOf("<textarea")+1 );
      restext = restext.substring( restext.indexOf(">")+1 );
      restext = restext.substring( 0, restext.indexOf("</textarea") );
      restext = restext.replace(/&lt;/ig,"<");
      restext = restext.replace(/&gt;/ig,">");
      restext = restext.replace(/&quot;/ig,"\"");
      restext = restext.replace(/&amp;/ig,"&");
      restext = replaceQuoteIntroText(restext, window.opener.__salastread_quotepostid);
/*
      restext = restext.replace("[QUOTE][i]", "[QUOTE][i][PL="+window.opener.__salastread_quotepostid+"]");
      if ( restext.match(/had this to say about the Jewish conspiracy:/) ) {
         restext = restext.replace("had this to say about the Jewish conspiracy:[/i]", "had this to say about the Jewish conspiracy:[/PL][/i]");
      } else {
         restext = restext.replace("of the closet to say: [/i]", "of the closet to say:[/PL][/i]");
      }
*/
      if ( persistObject.toggle_quickQuoteImagesAsLinks ) {
         restext = restext.replace(/\[IMG\](.*?)\[\/IMG\]/ig,"[URL=$1][image][/URL]");
      }

      var tstr = document.getElementById("messagearea").value;
      tstr = tstr.replace(quoteWaitString, restext+"\n\n");
      document.getElementById("messagearea").value = tstr;
   } else {
      if (getter_getFormKeyOnly==false) {
         document.getElementById("messagearea").value = "";
      }
   }

   if ( fkeygettext.indexOf("name=\"formkey\">")!=-1 ) {
      // FYAD's tag looks different *grumble grumble*
      fkeygettext = fkeygettext.substring( fkeygettext.indexOf("name=\"formkey\">")-50 );
   } else {
      fkeygettext = fkeygettext.substring( fkeygettext.indexOf("<input type=\"hidden\" name=\"formkey\" value=\"")+1 );
   }
   fkeygettext = fkeygettext.substring( fkeygettext.indexOf("value=\"")+7 );
   fkeygettext = fkeygettext.substring( 0, fkeygettext.indexOf("\"") );
   //alert(fkeygettext);
  
   sa_formkey = fkeygettext;
   persistObject.__cachedFormKey = sa_formkey;
   if (!isDetached) {
      document.getElementById("submit-swap").disabled = false;
      document.getElementById("submit-normal").disabled = false;
   }
   return;
}

function addQuoteFromPost(postid) {
   var qstr = document.getElementById("messagearea").value;
   qstr = qstr.replace(/[\r\n]*$/, "");
   document.getElementById("messagearea").value = qstr + "\n\n" + quoteWaitString;

   startPostTextGrab(false, postid);
}

function importData() {
   try {
   if ( persistObject.toggle_quickQuoteSwapPostPreview ) {
      document.getElementById("submit-swap").style.display = "-moz-box";
      document.getElementById("submit-normal").style.display = "none";
   } else {
      document.getElementById("submit-normal").style.display = "-moz-box";
      document.getElementById("submit-swap").style.display = "none";
   }
   if ( !window.opener.__salastread_needretrieval ) {
      document.getElementById("messagearea").value = window.opener.__salastread_quotetext;
      if (sa_formkey=="" || !sa_formkey) {
         // Grab the reply page in the background to get the formkey...
         startPostTextGrab(true);
      } else {
         // using cached form key...
         if ( !isDetached ) {
            document.getElementById("submit-swap").disabled = false;
            document.getElementById("submit-normal").disabled = false;
         }
      }
   } else {
      document.getElementById("messagearea").value = quoteWaitString;
      startPostTextGrab(false);
   }
   document.getElementById("messagearea").focus();
   if ( typeof(opener.sbOverlay) != "undefined" ||
        typeof(Components.classes["@mozilla.org/spellbound;1"]) != "undefined") {
      hasSpellCheck = true;
      document.getElementById("spellcheckbutton").style.display = "-moz-box";
   }
   if ( persistObject.toggle_quickQuoteSubscribeDefault ) {
      document.getElementById("subscribe").setAttribute("checked",true);
   }
   if ( persistObject.toggle_quickQuoteDisableSmiliesDefault ) {
      document.getElementById("disablesmilies").setAttribute("checked",true);
   }
   if ( persistObject.toggle_quickQuoteSignatureDefault && !window.opener.__salastread_alreadypostedinthread ) {
      document.getElementById("signature").setAttribute("checked",true);
   }
   if ( persistObject.toggle_quickQuoteLivePreview ) {
      document.getElementById("preview").setAttribute("checked",true);
      togglePreview();
   }
   }
   catch (e) { alert(e); }
}

function releaseVars() {
   window.opener.releaseQuickQuoteVars();
}

function doSubmit(subtype) {
   persistObject.__quickreply__lastpost = document.getElementById("messagearea").value;
   window.opener.quickQuoteSubmit(
      document.getElementById("messagearea").value,
      document.getElementById("parseurl").checked,
      document.getElementById("subscribe").checked,
      document.getElementById("disablesmilies").checked,
      document.getElementById("signature").checked,
      subtype,
      sa_formkey,
      attachedFileName
   );
}

function performSpellCheck() {
   if (!hasSpellCheck) { alert("SpellBound is not installed."); return; }
   try {
      var ma = document.getElementById("messagearea");
      //alert( ma.nodeName.toLowerCase() );
      var args = [];
      args[0] = ma;
      if (typeof(Components.classes["@mozilla.org/spellbound;1"]) != "undefined") {
         var scheck = ma.value;
         args[0] = scheck;
         var results = [];
         window.openDialog("chrome://spellbound/content/SBSpellCheck.xul",
	     			"_blank", "chrome,close,titlebar,modal,resizable", false, true, true, args, results);
         if ( typeof(results[0]) != "undefined" ) {
            ma.value = results[0];
         }
      } else {
         var savedmatext = ma.value;
         window.openDialog("chrome://spellbound/content/EdSpellCheck.xul",
	     			"_blank", "chrome,close,titlebar,modal,resizable", false, true, true, args);
         if ( ma.value == "undefined" || typeof(ma.value)=="undefined" ) {
            ma.value = savedmatext;
         }
      }
      //opener.sbOverlay.openSpellCheck( document.getElementById("messagearea") );
   }
   catch (e) {
      alert(e);
   }
}

function clearChildrenFrom(xid) {
   var xel = document.getElementById(xid).firstChild;
   while (xel.firstChild!=null) {
      xel.removeChild(xel.firstChild);
   }
}

function getEmoticons() {
   try {
      if ( typeof(persistObject.emoticons)=="undefined" || persistObject.emoticons==null ) {
         //alert("here");
         getEmoticonsFromServer();
      }
      clearChildrenFrom("menu_a");
      clearChildrenFrom("menu_d");
      clearChildrenFrom("menu_g");
      clearChildrenFrom("menu_j");
      clearChildrenFrom("menu_m");
      clearChildrenFrom("menu_p");
      clearChildrenFrom("menu_s");
      clearChildrenFrom("menu_v");
      clearChildrenFrom("menu_y");
      var menu = document.getElementById("emoticonmenu");
      //while (menu.firstChild!=null) {
      //   menu.removeChild(menu.firstChild);
      //}
      for (var i=0; i<persistObject.emoticons.length; i++) {
         var thisemot = persistObject.emoticons[i];
         if (thisemot[0]!=null && thisemot[0].length>0) {
            addMenuItem(menu, thisemot[0], thisemot[1]);
         }
      }
   }
   catch (e) {
      alert(e);
   }
}

function addMenuItem(menu, label, image) {
   var targetid = "menu_y";
   var menuch = label.match(/[a-z]/i);
   if (menuch) {
      var mstr = "ABCabc";
      if ( mstr.indexOf(menuch[0])!= -1 ) { targetid = "menu_a"; }
      mstr = "DEFdef";
      if ( mstr.indexOf(menuch[0])!= -1 ) { targetid = "menu_d"; }
      mstr = "GHIghi";
      if ( mstr.indexOf(menuch[0])!= -1 ) { targetid = "menu_g"; }
      mstr = "JKLjkl";
      if ( mstr.indexOf(menuch[0])!= -1 ) { targetid = "menu_j"; }
      mstr = "MNOmno";
      if ( mstr.indexOf(menuch[0])!= -1 ) { targetid = "menu_m"; }
      mstr = "PQRpqr";
      if ( mstr.indexOf(menuch[0])!= -1 ) { targetid = "menu_p"; }
      mstr = "STUstu";
      if ( mstr.indexOf(menuch[0])!= -1 ) { targetid = "menu_s"; }
      mstr = "VWXvwx";
      if ( mstr.indexOf(menuch[0])!= -1 ) { targetid = "menu_v"; }
      mstr = "YZyz";
      if ( mstr.indexOf(menuch[0])!= -1 ) { targetid = "menu_y"; }
   }

   var newel = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","menuitem");
   newel.className = "menuitem-iconic";
   newel.setAttribute("label", label);
   newel.setAttribute("image", image);

   //menu.appendChild(newel);
   document.getElementById(targetid).firstChild.appendChild(newel);
   newel.addEventListener("command", function() { selectedEmoticon(label); }, true);
}

function selectedEmoticon(emotlabel) {
   insertTextAtCursor(emotlabel);
}

function insertTextAtCursor(emotlabel) {
   var ebtext = document.getElementById("messagearea").value;
   var selstart = document.getElementById("messagearea").selectionStart;
   var selend = document.getElementById("messagearea").selectionEnd;
   ebtext = ebtext.substring(0,selstart) + emotlabel + ebtext.substring(selend);
   document.getElementById("messagearea").focus();
   document.getElementById("messagearea").value = ebtext;
   document.getElementById("messagearea").setSelectionRange(selstart+emotlabel.length, selstart+emotlabel.length);
   doPreview();
}

function doAttach() {
   if ( attachedFileName=="" ) {
   var nsIFilePicker = Components.interfaces.nsIFilePicker;
   var fp = Components.classes["@mozilla.org/filepicker;1"]
           .createInstance(nsIFilePicker);
   fp.init(window, "Select an Image to Attach", nsIFilePicker.modeOpen);
   fp.appendFilter("Image Files","*.gif; *.jpg; *.jpeg; *.png"); 
   var res=fp.show();
   if (res==nsIFilePicker.returnOK){
      attachedFileName = fp.file.path;
      document.getElementById("attachbtn").setAttribute("label","Remove");
   }
   } else {
      document.getElementById("attachbtn").setAttribute("label","Attach...");
      attachedFileName = "";
   }
}

function getvBcode(command) {
   var str = null;
    
   var theBox = document.getElementById("messagearea");
   var oPosition = theBox.scrollTop;
   var oHeight = theBox.scrollHeight;

   var startPos = theBox.selectionStart;
   var endPos = theBox.selectionEnd;
   str = theBox.value.substring(startPos, endPos);
			
   var nHeight = theBox.scrollHeight - oHeight;
   theBox.scrollTop = oPosition + nHeight;

   switch (command) {
      case "img":
         var menuch = str.match(/^(http:\/\/)|(https:\/\/)|(ftp:\/\/)/i);
         if(menuch) {
            insertTextAtCursor("[img]" + str + "[/img]");
         } else {
            var url = prompt('Enter a URL to an image below.', ' ');
            if(url) {
               insertTextAtCursor("[img]" + url + "[/img]");
            }
         }
      break;

      case "urltag":
         var menuch = str.match(/^(http:\/\/)|(https:\/\/)|(ftp:\/\/)/i);
         if(menuch) {
            insertTextAtCursor("[url]" + str + "[/url]");
         } else {
            var url = prompt('You have selected text that may not be a URL. Enter a URL to link to with the selected text or press cancel to make the selected text a link.', ' ');
            if(!url) {
               insertTextAtCursor("[url]" + str + "[/url]");
            } else {
               insertTextAtCursor("[url=" + url + "]" + str + "[/url]");
            }
         }
      break;  

      case "bold":
         insertTextAtCursor("[b]" + str + "[/b]");
      break;

      case "code":
         insertTextAtCursor("[code]" + str + "[/code]");
      break;

      case "quote":
         insertTextAtCursor("[quote]" + str + "[/quote]");
      break;

      case "italic":
         insertTextAtCursor("[i]" + str + "[/i]");
      break;

      case "underline":
         insertTextAtCursor("[u]" + str + "[/u]");
      break;

      case "strike":
         insertTextAtCursor("[s]" + str + "[/s]");
      break;

      case "sub":
         insertTextAtCursor("[sub]" + str + "[/sub]");
      break;

      case "super":
         insertTextAtCursor("[super]" + str + "[/super]");
      break;

      default : alert("vBcode error! No menu option selected.");
   }	
}

function doPreview() {

   var preview = document.getElementById("previewiframe").contentDocument.getElementById("messagepreview");
   var markup = document.getElementById("messagearea").value;

	markup = markup.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

   var vbcode = [];

   // Text style
   vbcode['<b>$1</b>'] = /\[b\](.*?)\[\/b\]/gi;
   vbcode['<i>$1</i>'] = /\[i\](.*?)\[\/i\]/gi;
   vbcode['<u>$1</u>'] = /\[u\](.*?)\[\/u\]/gi;
   vbcode['<s>$1</s>'] = /\[s\](.*?)\[\/s\]/gi;

	markup = markup.replace(/\[sub\]|\[\/sub\]|\[super\]|\[\/super\]/gi, function (strMatch){
		var strReturn = null;
		if(strMatch == "[sub]")
			strReturn = "<span style=\"vertical-align: sub;\">";
		else if(strMatch == "[super]")
			strReturn = "<span style=\"vertical-align: super;\">";

      if(strMatch.match(/\[\/.*?\]/gi))
         strReturn = "</span>";

		return strReturn;
	});

   // Spoiler
   vbcode['<span style="background: #000000;" onmouseover="this.style.color=\'#FFFFFF\';" onmouseout="this.style.color=this.style.backgroundColor=\'#000000\'">$1</span>'] = /\[spoiler\](.*?)\[\/spoiler\]/gi;

   // Code and quote
   vbcode['<blockquote><pre><span style="font-family: verdana,arial,helvetica">code:</span><hr />$1<hr /></pre></blockquote>'] = /\[code\](.*?)\[\/code\]/gi;
   vbcode['<blockquote class="qb2"><h4>quote:</h4><p>$1</p></blockquote>'] = /\[quote\](.*?)\[\/quote\]/gi;
   vbcode['<blockquote class="qb2"><h4>$1 posted:</h4><p>$2</p></blockquote>'] = /\[quote=([^\]]+)\](.*?)\[\/quote\]/gi;
 
   // Links and images
   if (document.getElementById("parseurl").checked) {   
      markup = markup.replace(/(^|\s)((((ht|f)tps?:\/\/)|(www|ftp)\.)[a-zA-Z0-9\.\#\@\:%&_/\?\=\~\-]+)/gim, "$1<a href=\"$2\" target=\"_blank\">$2</a>");
   }

   vbcode['<a href="$1" target=\"_blank\">$2</a>'] = /\[url=([^\]]+)\](.*?)\[\/url\]/gi;
   vbcode['<a href="$1" target=\"_blank\">$1</a>'] = /\[url\](.*?)\[\/url\]/gi;
   vbcode['<a href="mailto:$1">$1</a>'] = /\[email\](.*?)\[\/email\]/gi;
   vbcode['<img src="$1" alt="$1" />'] = /\[img\](.*?)\[\/img\]/gi;
   vbcode['<a title="$1" target=\"_blank\"><img width="100" border="0" src="$1" alt="$1"/></a>'] = /\[timg\](.*?)\[\/timg\]/gi;

   // Smileys
   if (!document.getElementById("disablesmilies").checked) {   

      if ( typeof(persistObject.emoticons)=="undefined" || persistObject.emoticons==null ) {
         getEmoticonsFromServer();
      }

      vbcode['<img src="http://forumimages.somethingawful.com/images/smilies/emot-goatse.gif"/>'] = /&amp;submit/gi;
      vbcode['<img src="http://forumimages.somethingawful.com/images/smilies/smile.gif"/>'] = /:\)/gi;
      vbcode['<img src="http://forumimages.somethingawful.com/images/smilies/frown.gif"/>'] = /:\(/gi;
      vbcode['<img src="http://forumimages.somethingawful.com/images/smilies/wink.gif"/>'] = /;\)/gi;
      vbcode['<img src="http://i.somethingawful.com/mjolnir/images/livestock~01-14-04-whore.gif"/>'] = /;-\*/gi;

      var matches = markup.match(/\:(\w+|\?)\:/gi);
   
      if (matches) {
         for (var i = 0; i < matches.length; i++) {
            for (var j=0; j<persistObject.emoticons.length; j++) {
               var thisemot = persistObject.emoticons[j];
               if (thisemot[0]!=null && thisemot[0].length>0) {
                  if (matches[i] == thisemot[0])
                     markup = markup.replace(matches[i], '<img src="'+thisemot[1]+'"/>');
               }
            }
         }
      }
   }

   markup = markup.replace(/\n/g, "<br />");

   for (var rplc in vbcode) {
      markup = markup.replace(vbcode[rplc], rplc);
   }

   var iframe = document.getElementById("previewiframe").contentWindow;
   iframe.scrollBy(0, iframe.document.body.scrollHeight);

   preview.innerHTML = "<p>"+ markup +"</p>";
}

function togglePreview() {
   if (document.getElementById("preview").checked)
      document.getElementById("previewbox").removeAttribute('collapsed');
   else
      document.getElementById("previewbox").setAttribute('collapsed', 'true');

   persistObject.toggle_quickQuoteLivePreview = document.getElementById("preview").checked;
   persistObject.SavePrefs();

   window.sizeToContent();
   doPreview();
}