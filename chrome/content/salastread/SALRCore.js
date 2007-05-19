
function SALRCoreClass(w,d)
{
   this._window = w;
   this._document = d;
   this._plugins = new Array(0);

   this._windowLoadDelegate = SALR_MethodDelegate(this, "WindowLoadEvent");
   this._window.addEventListener('load', this._windowLoadDelegate, true);

   this._windowBeforeUnloadDelegate = SALR_MethodDelegate(this, "WindowBeforeUnloadEvent");
   this._window.addEventListener('beforeunload', this._windowBeforeUnloadDelegate, true);

   this._windowUnloadDelegate = SALR_MethodDelegate(this, "WindowUnloadEvent");
   this._window.addEventListener('unload', this._windowUnloadDelegate, true);

}

SALRCoreClass.prototype = {
   _window: null,
   _document: null,
   _plugins: null,

   // Page Type Constants
   PAGETYPE_NONE: 0,
   PAGETYPE_CUSTOM: 1,
   PAGETYPE_FORUM: 2,
   PAGETYPE_THREAD: 3,

   _windowLoadDelegate: null,
   _windowBeforeUnloadDelegate: null,
   _windowUnloadDelegate: null,
   _documentDOMContentLoadedDelegate: null,
   _SALRContentMenuPopupShowingDelegate: null,

   DocGEID: function(i)
   {
      return this._document.getElementById(i);
   },

   WindowLoadEvent: function(e)
   {
      var doc = e.originalTarget;
      var location = doc.location;
      try {
         this._window.removeEventListener('load', this._windowLoadDelegate, true);
         this._windowLoadDelegate = null;

         this._documentDOMContentLoadedDelegate = SALR_MethodDelegate(this, "DocumentDOMContentLoadedEvent");
         this.DocGEID("appcontent").addEventListener("DOMContentLoaded", this._documentDOMContentLoadedDelegate, false);
         this._SALRContentMenuPopupShowingDelegate = SALR_MethodDelegate(this, "SALRContentMenuPopupShowingEvent");
         this.DocGEID("contentAreaContextMenu").addEventListener("popupshowing", this._SALRContentMenuPopupShowingDelegate, false);
      }
      catch (ex) {
      }
   },

   WindowBeforeUnloadEvent: function(e)
   {
   },

   WindowUnloadEvent: function(e)
   {
   },

   DocumentDOMContentLoadedEvent: function(e)
   {
      var doc = e.originalTarget;
      var location = doc.location;
      try {
         if ( location && location.href && typeof(doc.__salr_processed)!="object" ) {
            for (var pinum=0; pinum<this._plugins.length; pinum++) {
               var pi = this._plugins[pinum];
               var res = this.PluginOptionalCallWithDefault(pi, "CheckForHandling", SALRCore.PAGETYPE_NONE, doc);
               if ( res != SALRCore.PAGETYPE_NONE ) {
                  doc.__salr_processed = pi;
                  this.PluginOptionalCall(pi, "GeneralPreHandler", doc);
                  switch (res) {
                     case SALRCore.PAGETYPE_CUSTOM:
                        this.PluginOptionalCall(pi, "GeneralCustomHandler", doc);
                        break;
                     case SALRCore.PAGETYPE_FORUM:
                        this.ProcessForumDocument(pi, doc);
                        break;
                     case SALRCore.PAGETYPE_THREAD:
                        this.ProcessThreadDocument(pi, doc);
                        break;
                  }
                  this.PluginOptionalCall(pi, "GeneralPostHandler", doc);
               }
//               if (res==true) {
//                  doc.__salr_processed = pi;
//                  this.PluginOptionalCall(pi, "HandleDOMContentLoad", doc);
//                  break;
//               }
            }
         }
      }
      catch (ex) {
      }
   },

   ProcessForumDocument: function(pi, doc)
   {
   },

   ProcessThreadDocument: function(pi, doc)
   {
   },

   SALRContentMenuPopupShowingEvent: function(e)
   {
   },

   DebugMessage: function(msg)
   {
      var c = this.DebugMessage.caller;
      var cn = "[unknown function]";
      for ( var xf in this ) {
         if ( this[xf] == c ) {
            cn = this.ClassName +"."+ xf;
         }
      }
      this._window.alert("SALR Debug Message\n"+cn+":\n"+msg);
   },

   RegisterPlugin: function(plugin)
   {
      this._plugins.push(plugin);
      this.PluginOptionalCall(plugin, "RegisterCore");
   },

   _PluginSuccess: false,

   PluginCall: function(pobj, mname)
   {
      return this.__PluginCallInternal(pobj, mname, null, true, 2, arguments);
   },

   PluginOptionalCall: function(pobj, mname)
   {
      return this.__PluginCallInternal(pobj, mname, null, false, 2, arguments);
   },

   PluginOptionalCallWithDefault: function(pobj, name, def)
   {
      return this.__PluginCallInternal(pobj, mname, def, false, 3, arguments);
   },

   __PluginCallInternal: function(pobj, mname, def, throwonfail, argcountskip, arg)
   {
      if ( typeof(pobj)=="object" && typeof(pobj[mname])=="function" ) {
         this._PluginSuccess = true;
         return SALR_CallFunctionWithArgs(pobj, mname, argcountskip, arg);
      } else {
         this._PluginSuccess = false;
         if (throwonfail) {
            throw "Plugin call failed.";
         }
         return def;
      }
   },

   xPluginOptionalCall: function(pobj, mname)
   {
      if ( typeof(pobj)=="object" && typeof(pobj[mname])=="function" ) {
         this._PluginSuccess = true;
         return SALR_CallFunctionWithArgs(pobj, mname, 2, arguments);
      } else {
         this._PluginSuccess = false;
         return null;
      }
   },

   xPluginOptionalCallWithDefault: function(pobj, mname, def)
   {
      if ( typeof(pobj)=="object" && typeof(pobj[mname])=="function" ) {
         this._PluginSuccess = true;
         return SALR_CallFunctionWithArgs(pobj, mname, 3, arguments);
      } else {
         this._PluginSuccess = false;
         return def;
      }
   },

   ClassName: "SALRCoreClass"
};

///////////////////////////////////////////////////////////////////////////////////////////

function SALR_SAForumsPluginClass()
{
}

SALR_SAForumsPluginClass.prototype = {
   _CoreObject: null,

   RegisterCore: function(c) {
      this._CoreObject = c;
   },

   CheckForHandling: function(doc) {
      if ( doc.location && doc.location.href && doc.location.href.match(/^http:\/\/forums?.somethingawful.com\//i) ) {
         var hr = doc.location.href;
         if ( hr.indexOf("forumdisplay.php")!=-1 ) {
            return SALRCore.PAGETYPE_FORUM;
         }
         else if ( hr.indexOf("showthread.php")!=-1 ) {
            return SALRCore.PAGETYPE_THREAD;
         }
         return SALRCore.PAGETYPE_CUSTOM;
      } else {
         return SALRCore.PAGETYPE_NONE;
      }
   },

   GeneralPreHandler: function(doc) {
   },

   GeneralPostHandler: function(doc) {
   },

   HandleDOMContentLoad: function(doc) {
      //alert( this.ClassName + " test="+doc);
   },

   PluginDisplayName: "SomethingAwful Forums Handler",
   ClassName: "SALR_SAForumsPluginClass"
};

///////////////////////////////////////////////////////////////////////////////////////////

var SALRCore = new SALRCoreClass(window, document);
SALRCore.RegisterPlugin( new SALR_SAForumsPluginClass() );
