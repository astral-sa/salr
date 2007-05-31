// <script>
var persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
                      .createInstance(Components.interfaces.nsISupports);
persistObject = persistObject.wrappedJSObject;

function tpOnLoad() {
   if (!feature_pref) return;
   setVerbiage();
}

function setVerbiage() {
   var fStatus = document.getElementById("fStatus");
   var fVerb = document.getElementById("fVerb");

   if (persistObject[feature_pref]) {
      fStatus.innerHTML = "enabled";
      fVerb.innerHTML = "disable";
   } else {
      fStatus.innerHTML = "disabled";
      fVerb.innerHTML = "enable";
   }
}

function toggleFeature() {
   persistObject[feature_pref] = !persistObject[feature_pref];
   setVerbiage();
}

var tpOldLoad = typeof(window.onload)=="function" ? window.onload : function(){};
window.onload = function() { tpOnLoad(); tpOldLoad(); };
