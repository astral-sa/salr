
var persistObject;

function winError() {
   alert("Error");
   window.close();
}

function startTransfer() {
   persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
      .createInstance(Components.interfaces.nsISupports);
   persistObject = persistObject.wrappedJSObject;

   var res = persistObject.PerformRemoteSync(true,
      function(s) { syncCallback(true, "Done.", s); },
      function(a) { syncCallback(false, a, 0); });
   if (res.bad) {
      alert("Sync error:\n"+res.msg);
      window.close();
   }
   //syncCallback(false, res, 0);
}

function syncCallback(done, statusString, statusCode) {
   if (done) {
      if (statusCode==0)
      {
         //alert("h");
         //try {
         //Components.classes["@mozilla.org/js/jsd/debugger-service;1"]
         //   .getService(Components.interfaces.jsdIDebuggerService).GC();
         //} catch(err) { alert("err:"+err); }
         setTimeout(cbX, 10);
      }
      return;
   }
   document.getElementById("stat").setAttribute("value", statusString);
}

function cbX() {
   openDialog("chrome://salastread/content/closer.xul", "_blank");
   window.close();
}
