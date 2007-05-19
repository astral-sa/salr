
function aboutInit() {
   //return;
   var persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
                      .createInstance(Components.interfaces.nsISupports);
   persistObject = persistObject.wrappedJSObject;

   var timespentObj = document.getElementById("timespent");
   //var pobj = Components.classes["@mozilla.org/preferences-service;1"].
   //                 getService(Components.interfaces.nsIPrefBranch);
   //var timeSpent = 0;
   //if ( pobj.getPrefType("salastread.timespent")==pobj.PREF_INT ) {
   //   timeSpent = pobj.getIntPref("salastread.timespent");
   //}
   var timeSpent = persistObject._TimerValue;
   var tsstr = "none";
   if (timeSpent) {
      var res = new Array();
      if ( timeSpent >= 60*60*24 ) {
         var days = Math.floor(timeSpent/(60*60*24));
         timeSpent -= days*(60*60*24);
         if (days>1) {
            res.push(days+" days");
         } else {
            res.push(days+" day");
         }
      }
      if ( timeSpent >= 60*60 ) {
         var hours = Math.floor(timeSpent/(60*60));
         timeSpent -= hours*(60*60);
         if (hours>1) {
            res.push(hours+" hours");
         } else {
            res.push(hours+" hour");
         }
      }
      if ( timeSpent >= 60 ) {
         var mins = Math.floor(timeSpent/(60));
         timeSpent -= mins*(60);
         if (mins>1) {
            res.push(mins+" minutes");
         } else {
            res.push(mins+" minute");
         }
      }
      if (timeSpent>0) {
         if (timeSpent>1) {
            res.push(timeSpent+" seconds");
         } else {
            res.push(timeSpent+" second");
         }
      }
      tsstr = res.join(", ");
   }
   timespentObj.setAttribute("value",tsstr);
}
