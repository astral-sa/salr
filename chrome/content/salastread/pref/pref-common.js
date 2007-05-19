
function initSettings(pagename) {
   parent.initPage(pagename);
   /*
   var stx = "";
   for (var tp in parent.prefobj) {
      if (tp.indexOf("_")!=-1) {
         stx += tp+": "+parent.prefobj[tp]+"\n";
      }
   }
   alert(stx);
   */
   for (var thisField in parent.prefobj) {
      var tel = document.getElementById(thisField);
      var tval = parent.prefobj[thisField];
      if (tel) {
         if (thisField.indexOf("toggle_")==0) {
            setToggleField(thisField,tel,tval);
         }
         else if (thisField.indexOf("url_")==0) {
            setUrlField(thisField,tel,tval);
         }
         else if (thisField.indexOf("string_")==0) {
            setStringField(thisField,tel,tval);
         }
         else if (thisField.indexOf("int_")==0) {
            setIntField(thisField,tel,tval);
         }
         else if (thisField.indexOf("defaulturl_")==0) {
            setDefaultUrlField(thisField,tel,tval);
         }
         else if (thisField.indexOf("defaultstring_")==0) {
            setDefaultStringField(thisField,tel,tval);
         }
      }
   }
}

function setToggleField(thisField,tel,tval) {
   if ( tel.nodeName=="checkbox" ) {
      if (tval) {
         tel.setAttribute("checked", tval);
      } else {
         tel.removeAttribute("checked");
      }
      //tel.onchange = "alert('here');";
      tel.addEventListener("CheckboxStateChange",
        function() { parent.prefobj[thisField] = tel.getAttribute("checked")?true:false; setNeeds(tel); },
        true);
   }
}

function setNeeds(tel) {
   if ( tel.getAttribute("salastread_requiremenurebuild")=="yes" ) {
      parent.prefobj.NeedMenuRebuild = true;
   }
   if ( tel.getAttribute("salastread_requirefirefoxrestart")=="yes" ) {
      parent.prefobj.NeedFirefoxRestart = true;
   }
}

function setUrlField(thisField,tel,tval) {
   if ( tel.nodeName=="textbox" ) {
      tel.setAttribute("value", tval);
      tel.addEventListener("change",
        function() { parent.prefobj[thisField] = tel.value; setNeeds(tel); },
        true);
   }
}

function setStringField(thisField,tel,tval) {
   if ( tel.nodeName=="textbox" ) {
      tel.setAttribute("value", tval);
      tel.addEventListener("change",
        function() { parent.prefobj[thisField] = tel.value; setNeeds(tel); },
        true);
   }
}

function setIntField(thisField,tel,tval) {
   if ( tel.nodeName=="textbox" ) {
      tel.setAttribute("value", String(tval));
      tel.addEventListener("change",
        function() { try {var j = Number(tel.value); parent.prefobj[thisField] = j; setNeeds(tel); } catch (e) { } },
        true);
   }
}

function setDefaultUrlField(thisField,tel,tval) {
   if ( tel.nodeName=="button" ) {
      tel.addEventListener("command",
        function() { loadDefaultUrl(thisField); },
        true);
   }
}

function loadDefaultUrl(thisField) {
   var targetField = thisField.substring(7);
   var tel = document.getElementById(targetField);
   if ( tel.nodeName=="textbox" ) {
      tel.value = parent.prefobj[thisField];
      parent.prefobj[targetField] = tel.value;
   }
   setNeeds(tel);
}

function setDefaultStringField(thisField,tel,tval) {
   //alert("here");
   if ( tel.nodeName=="button" ) {
      tel.addEventListener("command",
        function() { loadDefaultString(thisField); },
        true);
   }
}

function loadDefaultString(thisField) {
   var targetField = thisField.substring(7);
   var tel = document.getElementById(targetField);
   if ( tel.nodeName=="textbox" ) {
      tel.value = parent.prefobj[thisField];
      parent.prefobj[targetField] = tel.value;
   }
   setNeeds(tel);
}
