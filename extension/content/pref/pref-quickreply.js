function generalInit() {
   initSettings('Quick Reply Settings');
   qrcbSet();
}

function qrcbSet() {
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
