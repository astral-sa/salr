
function ExtPrefs() {
}

ExtPrefs.prototype = {
   IsPrefOrDefault: function(thisField) {
      if ( this.IsPref(thisField) ||
           ( thisField.indexOf("default")==0 && this.IsPref(thisField.substring(7)) ) ) {
         return true;
      }
      return false;
   },

   IsPref: function(thisField) {
      if (thisField.indexOf("toggle_")==0 ||
          thisField.indexOf("url_")==0 ||
          thisField.indexOf("color_")==0 ||
          thisField.indexOf("string_")==0 ||
          thisField.indexOf("int_")==0 ) {
         return true;
      }
      return false;
   },

   GetSettings: function() {
      var pobj = Components.classes["@evercrest.com/salastread/persist-object;1"]
                    .createInstance(Components.interfaces.nsISupports);
      pobj = pobj.wrappedJSObject;
      if (!pobj)
         throw "Failed to create persistObject.";

      for (var thisField in pobj) {
         if (this.IsPrefOrDefault(thisField)) {
            this[thisField] = pobj[thisField];
         }
      }
   },

   SetSettings: function() {
      var pobj = Components.classes["@evercrest.com/salastread/persist-object;1"]
                    .createInstance(Components.interfaces.nsISupports);
      pobj = pobj.wrappedJSObject;

      if (!pobj)
         throw "Failed to create persistObject.";

      for (var thisField in this) {
         if (this.IsPref(thisField)) {
            pobj[thisField] = this[thisField];
         }
      }
      pobj.SavePrefs();
   },

   NeedMenuRebuild: false,
   NeedFirefoxRestart: false
};

function initPage(pageName) {
   var header = document.getElementById("header");
   header.setAttribute("title", pageName);
}

function switchPage(aButtonID) {
   var button = document.getElementById(aButtonID);
   document.getElementById("panelFrame").setAttribute("src",
      button.getAttribute("url"));
}

try {
var prefobj = new ExtPrefs();
prefobj.GetSettings();
} catch(e) {
   alert("err: "+e);
}

function saveChanges() {
   prefobj.SetSettings();
   if (prefobj.NeedMenuRebuild==true ||
       prefobj.NeedFirefoxRestart==true) {
      alert("Some of the changes you made will require you to restart Firefox to take effect.");
   }
}

function onLoad() {
   var fp = window.arguments[0];
   if ( typeof(fp)=="string" && fp.length > 0 && fp.substring(0,3)=="cat" ) {
      //switchPage( fp );
      document.getElementById(fp).focus();
      document.getElementById(fp).click();
   } else {
      //switchPage( "catGeneralButton" );
      document.getElementById("catGeneralButton").focus();
      document.getElementById("catGeneralButton").click();
   }
}
