
function generalInit() {
   cbSet();
}

function cbSet() {
   try {
   if ( !document.getElementById("toggle_showGoToLastIcon").getAttribute("checked") ) {
      document.getElementById("url_goToLastReadPost").setAttribute("disabled",true);
      document.getElementById("defaulturl_goToLastReadPost").setAttribute("disabled",true);
      document.getElementById("toggle_alwaysShowGoToLastIcon").setAttribute("disabled",true);
   } else {
      document.getElementById("url_goToLastReadPost").removeAttribute("disabled");
      document.getElementById("defaulturl_goToLastReadPost").removeAttribute("disabled");
      document.getElementById("toggle_alwaysShowGoToLastIcon").removeAttribute("disabled");
   }
   if ( !document.getElementById("toggle_showUnvisitIcon").getAttribute("checked") ) {
      document.getElementById("url_markThreadUnvisited").setAttribute("disabled",true);
      document.getElementById("defaulturl_markThreadUnvisited").setAttribute("disabled",true);
   } else {
      document.getElementById("url_markThreadUnvisited").removeAttribute("disabled");
      document.getElementById("defaulturl_markThreadUnvisited").removeAttribute("disabled");
   }
   } catch(e) {
      alert("err: "+e);
   }
}

function __dead_code() {
   var qqt = document.getElementById("qqtoggles");
   if ( !document.getElementById("toggle_useQuickQuote").getAttribute("checked") ) {
      var child = qqt.firstChild;
      while (child) {
         child.setAttribute("disabled",true);
         child = child.nextSibling;
      }
   } else {
      var child = qqt.firstChild;
      while (child) {
         child.removeAttribute("disabled");
         child = child.nextSibling;
      }
   }
}
