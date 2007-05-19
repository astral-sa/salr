
const SALR_CONTRACTID = "@evercrest.com/salastread/persist-object;1";
const SALR_CID = Components.ID("{f5d9093b-8210-4a26-89ba-4c987de04efc}");
const nsISupports = Components.interfaces.nsISupports;

function GetUserProfileDirectory(fn,isWindows)
{
   const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1", "nsIProperties");
   var path;
   try {
      //var dirService = Components.classes["@mozilla.org/file/directory_service;1"].
      //                    createInstance(Components.interfaces.nsIProperties);
      //path = dirService.get("ProfD", Components.interfaces.nsIFile).path;
      path = (new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path;
   } catch (e) {
      //alert ("salastread error: Failure in GetUserProfileDirectory: "+e);
      throw e;
      return null;
   }
   if (path) {
      if (fn) {
         if (path.search(/\\/) != -1) {
            path = path + "\\";
         } else {
            path = path + "/";
         }
         path = path + fn;
      }
      return path;
   } else {
      //alert ("salastread error: Failed to GetUserProfileDirectory");
      if (isWindows) {
         return "C:\\"+fn;
      } else {
         return "~/"+fn;
      }
   }
}

function ReadFile(fn)
{
//   try {
//      netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
//   } catch (e) {
//      return null;
//   }
   var file = Components.classes["@mozilla.org/file/local;1"]
         .createInstance(Components.interfaces.nsILocalFile);
   try {
   file.initWithPath(fn);
   }
   catch (e) {
      throw e + "\n" + fn;
   }
   if (file.exists() == false) {
      return "";
   }
   var is = Components.classes["@mozilla.org/network/file-input-stream;1"]
         .createInstance(Components.interfaces.nsIFileInputStream);
   is.init(file, 0x01, 00004, null);
   var sis = Components.classes["@mozilla.org/scriptableinputstream;1"]
         .createInstance(Components.interfaces.nsIScriptableInputStream);
   sis.init(is);
   return sis.read( sis.available() );
}

function SaveFile(fn, fdata)
{
//   try {
//      netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
//   } catch (e) {
//      //alert("The SALastRead failed to save settings because permission was denied.");
//      return null;
//   }
   var file = Components.classes["@mozilla.org/file/local;1"]
         .createInstance(Components.interfaces.nsILocalFile);
   file.initWithPath(fn);
   if ( file.exists() == false ) {
      try {
         file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
      }
      catch (ex) {
         throw "file.create error ("+ex.name+") on "+fn;
      }
      //alert("The SALastRead extension is initializing a new settings file. You should only see this once, after you first install the extension.");
   }
   var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
         .createInstance(Components.interfaces.nsIFileOutputStream);
   outputStream.init(file, 0x04 | 0x08 | 0x20, 420, 0);
   var result = outputStream.write( fdata, fdata.length );
   outputStream.close();
}

// The PersistObject defintion itself
function salrPersistObject()
{
}

salrPersistObject.prototype = {
   get pref() { return Components.classes["@mozilla.org/preferences-service;1"].
                   getService(Components.interfaces.nsIPrefBranch); },

   get defaultcolor_readLight() { return "#ddeeff"; },
   get defaultcolor_readDark() { return "#bbccdd"; },
   get defaultcolor_readWithNewLight() { return "#e1f1e1"; },
   get defaultcolor_readWithNewDark() { return "#cfdfcf"; },
   get defaultcolor_unreadLight() { return "#f1f1f1"; },
   get defaultcolor_unreadDark() { return "#dfdfdf"; },
   get defaultcolor_unreadLightFYAD() { return "#ffccff"; },
   get defaultcolor_unreadDarkFYAD() { return "#ffcccc"; },
   get defaultcolor_postedInThreadRe() { return "#fcfd99"; },

   get defaultcolor_readLightHighlight() { return "#f5faff"; },
   get defaultcolor_readDarkHighlight() { return "#dbe9f8"; },
   get defaultcolor_readWithNewLightHighlight() { return "#f9fff9"; },
   get defaultcolor_readWithNewDarkHighlight() { return "#e1efe1"; },
   get defaultcolor_unreadLightHighlight() { return "#f1f1f1"; },
   get defaultcolor_unreadDarkHighlight() { return "#dfdfdf"; },
   //get defaultcolor_unreadLightFYADHighlight() { return "#ffccff"; },
   //get defaultcolor_unreadDarkFYADHighlight() { return "#ffcccc"; },
   get defaultcolor_postedInThreadReHighlight() { return "#ffffcc"; },

   get defaultcolor_seenPostLight() { return "#ddeeff"; },
   get defaultcolor_seenPostDark() { return "#bbccdd"; },
   get defaultcolor_seenPostLightFYAD() { return "#ddeeff"; },
   get defaultcolor_seenPostDarkFYAD() { return "#bbccdd"; },
   get defaultcolor_unseenPostLight() { return "#f1f1f1"; },
   get defaultcolor_unseenPostDark() { return "#dfdfdf"; },
   get defaultcolor_unseenPostLightFYAD() { return "#ffccff"; },
   get defaultcolor_unseenPostDarkFYAD() { return "#ffcccc"; },

   get defaulturl_goToLastReadPost() { return "chrome://salastread/content/go_to_first_unread_post.png"; },
   get defaulturl_markThreadUnvisited() { return "chrome://salastread/content/mark_thread_unvisited.png"; },

   get defaulttoggle_showUnvisitIcon() { return true; },
   get defaulttoggle_showGoToLastIcon() { return true; },
   get defaulttoggle_alwaysShowGoToLastIcon() { return false; },
   get defaulttoggle_reanchorThreadOnLoad() { return true; },
   get defaulttoggle_useQuickQuote() { return true; },
   get defaulttoggle_quickQuoteSubscribeDefault() { return false; },
   get defaulttoggle_quickQuoteSignatureDefault() { return false; },
   get defaulttoggle_quickQuoteDisableSmiliesDefault() { return false; },
   get defaulttoggle_quickQuoteLivePreview() { return false; },
   get defaulttoggle_showSAForumMenu() { return true; },
   get defaulttoggle_nestSAForumMenu() { return true; },
   get defaulttoggle_useSAForumMenuBackground() { return true; },
   get defaulttoggle_hideOtherSAMenus() { return true; },
   get defaulttoggle_quickQuoteImagesAsLinks() { return true; },
   get defaulttoggle_dontHighlightThreads() { return false; },
   get defaulttoggle_dontHighlightPosts() { return false; },
   get defaulttoggle_removePageTitlePrefix() { return true; },
   get defaulttoggle_quickQuoteSwapPostPreview() { return false; },
   get defaulttoggle_convertTextToImage() { return false; },
   get defaulttoggle_thumbnailQuotedImagesInThreads() { return false; },
   get defaulttoggle_shrinkTextToImages() { return true; },
   get defaulttoggle_removeTargetNewFromTorrentLinks() { return true; },
   get defaulttoggle_insertPostTargetLink() { return true; },
   get defaulttoggle_dontTextToImageIfMayBeNws() { return true; },
   get defaulttoggle_dontTextToImageInSpoilers() { return true; },
   get defaulttoggle_dontCheckKillSwitch() { return false; },
   get defaulttoggle_props() { return true; },
   get defaulttoggle_removeHeaderAndFooter() { return false; },
   get defaulttoggle_contextMenuOnBottom() { return true; },
   get defaulttoggle_hideSignature() { return false; },
   get defaulttoggle_hideTitle() { return false; },
   get defaulttoggle_suppressErrors() { return true; },
	   
   get defaulttoggle_insertPostLastMarkLink() { return true; },
   get defaulttoggle_disableGradients() { return false; },
   get defaulttoggle_resizeCustomTitleText() { return true; },
   get defaulttoggle_enablePageNavigator() { return true; },
   get defaulttoggle_thumbnailAllImages() { return true; },

   get defaulttoggle_showMenuPinHelper() { return true; },

   get defaulttoggle_enableDebugMarkup() { return false; },

   get defaultstring_threadIconOrder() { return "12"; },
   get defaultstring_databaseStoragePath() { return "%profile%salastread.sqlite"; },
   get defaultstring_persistStoragePath() { return "%profile%salastread.xml"; },
   get defaultstring_forumListStoragePath() { return "%profile%saforumlist.xml"; },
   get defaultstring_menuPinnedForums() { return "1,22,44"; },
   get defaultstring_quoteIntroText() { return "[who] came out of the closet to say:"; },

   get defaultstring_remoteSyncStorageUrl() { return "ftp://username:password@example.com/.salastread.syncdata"; },
   get defaulttoggle_useRemoteSyncStorage() { return false; },

   get defaultint_expireMinAge() { return 7; },

   get defaultint_gestureButton() { return 2; },
   get defaulttoggle_gestureEnable() { return true; },
   get defaulttoggle_scrollPostEnable() { return false; },

   SET_toggle_thumbnailAllImages: function(value) {
      if(!("@mozilla.org/content/style-sheet-service;1" in Components.classes))
         return;

      var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                 .getService(Components.interfaces.nsIStyleSheetService);
      var ios = Components.classes["@mozilla.org/network/io-service;1"]
                 .getService(Components.interfaces.nsIIOService);
      var uri = ios.newURI("chrome://salastread/content/thumbnail-images.css", null, null);
      if (value) {
         if(!sss.sheetRegistered(uri, sss.USER_SHEET)) {
            sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
         }
      } else {
         if(sss.sheetRegistered(uri, sss.USER_SHEET)) {
            sss.unregisterSheet(uri, sss.USER_SHEET);
         }
      }
   },

   //get expireMinAge() { return 7; },

   get storeFileName() { return this._fn; },

   get storedbFileName() { return this._dbfn; },

   get SALRversion() { return "1.15.1912"; },

   get xmlDoc()
   {
      if ( this._xmlDoc != null )
      {
         return this._xmlDoc;
      }
      return;
      // Does not return anything (undefined) if _xmlDoc is null
   },
   set xmlDoc(value) { this._xmlDoc = value; },

   get forumListXml() { return this._forumListXml; },
   set forumListXml(value) {
      this._forumListXml = value;
      var oXmlSer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].
                          createInstance(Components.interfaces.nsIDOMSerializer);
      var xmlstr = oXmlSer.serializeToString(this._forumListXml);
      //SaveFile(GetUserProfileDirectory("saforumlist.xml", this._isWindows), xmlstr);
      SaveFile(this._flfn, xmlstr);
   },

   get gotForumList() { return this._gotForumList; },
   set gotForumList(value) { this._gotForumList = value; },

   get LastRunVersion() {
      if ( this.pref.getPrefType("salastread.lastRunVersion") == this.pref.PREF_STRING )
      {
         return this.pref.getCharPref("salastread.lastRunVersion");
      }
      return "";
   },
   set LastRunVersion(ver) { this.pref.setCharPref("salastread.lastRunVersion", ver); },

   _TimeManager: null,
   get TimeManager() { return this._TimeManager; },
   set TimeManager(value) {
      if ( this._TimeManager == null ) {
         this._TimeManager = value;
      }
   },

   AttachShutdownObserver: function()
   {
      var that = this;
      var observer = {
         observe: function(subject,topic,data) {
            that.FirefoxShuttingDown(subject, topic, data);
            that._syncTransferObject = null;
         }
      };
      var observerService = Components.classes["@mozilla.org/observer-service;1"]
                               .getService(Components.interfaces.nsIObserverService);
      observerService.addObserver(observer, "quit-application", false);
      this._nextSyncTime = new Date();
   },

   FirefoxShuttingDown: function(subject, topic, data)
   {
      if ( this.toggle_useRemoteSyncStorage ) {
         var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                     .getService(Components.interfaces.nsIWindowWatcher);
         var res = ww.openWindow(ww.activeWindow,
                        "chrome://salastread/content/syncTransfer.xul", "_blank",
                        "centerscreen,chrome,dialog,modal,titlebar,minimizable=no,resizable=no,close=no", null);
      }
      //this.PerformRemoteSync(false, true, null);
   },

   SYNC_INTERVAL: (1000*60*30),      // 30 minutes
   SYNC_INTERVAL_VARY: (1000*60*5),  // +/- 5 minutes
   _nextSyncTime: null,
   _syncTransferObject: null,
   _syncWorking: false,
   _additionalSyncCallbacks: null,

   SetSyncTransferObject: function(o)
   {
      this._syncTransferObject = o;
      o.Components = Components;
   },

   PerformRemoteSync: function(force, syncCallback, trace)
   {
      var res = {bad:false, msg:"no result"};
      if (this._syncWorking) {
         this._additionalSyncCallbacks.push(syncCallback);
         return {bad:false, msg:"already syncing"};
      }
      if (!force) {
         var now = new Date();
         if ( now < this._nextSyncTime ) { return {bad:false, msg:"not time to sync yet"}; }
      }
      try
      {
         if (this.toggle_useRemoteSyncStorage) {
            this._DoAsynchronousSync(syncCallback, trace);
            res = {bad:false, msg:"syncing..."};
         } else {
            res = {bad:false, msg:"sync not enabled"};
         }
      }
      catch (err) {
         res = {bad:true, msg:"error: "+err};
      }
      this.GenerateNextSyncTime();
      return res;
   },

   GetSyncUrl: function()
   {
      return this.string_remoteSyncStorageUrl;
   },

/*
   _DoSynchronousSync: function(trace)
   {
      var sto = this._syncTransferObject;
      // Get the remote file
      if (trace) { trace("getting remote file..."); }
      try {
         sto.getFileSync( this.GetSyncUrl(), this._fn );
      } catch (err) { }
      // Merge it in
      if (trace) { trace("merging..."); }
      this.LoadXML(true);
      // Rewrite out the local file
      if (trace) { trace("saving..."); }
      this.SaveXML();
      // Upload it
      if (trace) { trace("uploading..."); }
      sto.sendFileSync( this.GetSyncUrl(), this._fn );
   },
*/

   _syncTrace: null,

   _DoAsynchronousSync: function(syncCallback, trace)
   {
      this._syncWorking = true;
      this._additionalSyncCallbacks = new Array();
      this._additionalSyncCallbacks.push(syncCallback);
      var that = this;
      var sto = this._syncTransferObject;
      this._syncTrace = trace;
      trace("Getting remote file...");
      sto.getFile(this.GetSyncUrl(), this._dbfn, function(status) { that._AsyncSync1(status); });
   },

   _AsyncComplete: function(status)
   {
      for (var i=0; i<this._additionalSyncCallbacks.length; i++) {
         try { this._additionalSyncCallbacks[i](status); } catch(err) { }
      }
      this._syncWorking = false;
      this._additionalSyncCallbacks = null;
      this._syncTrace = null;
   },

   _AsyncSync1: function(status)
   {
      var sto = this._syncTransferObject;
      var trace = this._syncTrace;
      sto.reset();
      if (status!=0) {
         trace("Failed to get remote file.");
         //this._AsyncComplete(1);
         //return;
      }
      trace("Merging data...");
      this.LoadXML(true);
      trace("Saving data...");
      this.SaveXML();
      trace("Uploading remote file...");
      var that = this;
      sto.sendFile(this.GetSyncUrl(), this._fn, function(istatus) { that._AsyncSync2(istatus); });
   },

   _AsyncSync2: function(istatus)
   {
      var sto = this._syncTransferObject;
      var trace = this._syncTrace;
      sto.reset();
      if (istatus!=0) {
         trace("Upload failed.");
         this._AsyncComplete(2);
         return;
      }
      trace("Complete.");
      this._AsyncComplete(0);
      return;
   },

   GenerateNextSyncTime: function()
   {
      var d = new Date();
      var nt = d.getTime();
      var varyTime = Math.floor( this.SYNC_INTERVAL_VARY * ((Math.random()-0.5)*2) );
      nt += this.SYNC_INTERVAL + varyTime;
      d.setTime(nt);
      this._nextSyncTime = d;
   },

   SetXML: function(xmlstr)
   {
      var oDomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"].
                          createInstance(Components.interfaces.nsIDOMParser);
      //var oDomParser = new DOMParser();
      try {
         this.xmlDoc = oDomParser.parseFromString(xmlstr, "text/xml");
      }
      catch (e) {
         throw e + "\n" + xmlstr;
      }
   },

   LoadForumListXML: function()
   {
      try{
      //var pxml = ReadFile(GetUserProfileDirectory("saforumlist.xml",this._isWindows));
      var pxml = ReadFile(this._flfn);
      if (typeof(pxml) != "undefined")
      {
         if (pxml)
         {
            var oDomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"].
                                createInstance(Components.interfaces.nsIDOMParser);
            try {
               this._forumListXml = oDomParser.parseFromString(pxml, "text/xml");
            }
            catch (e) {
               this._forumListXml = null;
            }
         }
         else
         {
            this._forumListXml = null;
         }
      }
      else
      {
         this._forumListXml = null;
      }
      } catch(e) { this._forumListXml = null; }
   },

   LoadXML: function(merge)
   {
      this.LoadThreadDataV2(merge);
   },

   LoadXMLLegacy: function()
   {
      var pxml = ReadFile(this.storeFileName);
      if (typeof(pxml) != "undefined")
      {
         if (pxml)
         {
            this.SetXML(pxml);
         }
         else
         {
            this.InitializeEmptySALRXML();
            this.SaveXML();
         }
      }
      else
      {
         this._starterr = "loadxml couldn't readfile";
         this.xmlDoc = null;
      }
   },

   InitializeEmptySALRXML: function(merge)
   {
      if (!merge || this.xmlDoc==null)
         this.SetXML("<?xml version=\"1.0\"?>\n<salastread>\n</salastread>");
   },

   SaveXML: function()
   {
/*
      var oXmlSer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].
                          createInstance(Components.interfaces.nsIDOMSerializer);
      //var oXmlSer = new XMLSerializer();
      var xmlstr = oXmlSer.serializeToString(this.xmlDoc);
      SaveFile(this.storeFileName, xmlstr);
*/

      this.SaveTimerValue();

      this.SaveThreadDataV2();
   },

   THREADDATA_FILE_HEADER_V2: "SALR Thread Data v2",

   LoadThreadDataV2: function(merge)
   {
      
      var fn = this.storedbFileName;
      var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(fn);
      if ( file.exists() == false ) {
         try {
            file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
         }
         catch (ex) {
            throw "file.create error ("+ex.name+") on "+fn;
         }
         //console.log("The SALastRead extension is initializing a new database. You should only see this once.");
      }
      var storageService = Components.classes["@mozilla.org/storage/service;1"]
                                     .getService(Components.interfaces.mozIStorageService);
      var mDBConn = storageService.openDatabase(file);
      
      if (!mDBConn.tableExists('threaddata'))
      {
        
        var processingdata = false;

        // Initialize the empty document...
        this.InitializeEmptySALRXML(merge);

        var fn = this.storeFileName; // + ".txt";
        var file = Components.classes["@mozilla.org/file/local;1"]
              .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(fn);
        if ( file.exists() == false ) {
           this.SaveXML();
          return;
        }

        // See: http://kb.mozillazine.org/File_IO
        var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                          .createInstance(Components.interfaces.nsIFileInputStream);
        istream.init(file, 0x01, 0444, 0);
        istream.QueryInterface(Components.interfaces.nsILineInputStream);

        var hasmore;
        do {
           var line = {};

           hasmore = istream.readLine(line);
           line = line.value;

           if ( line == this.THREADDATA_FILE_HEADER_V2 ) {
             processingdata = true;
           }
           else if ( processingdata ) {
              var newEl = this.xmlDoc.createElement("thread");
              var elOk = false;
              var elId = null;
              var elLpId = 0;
              var myattrs = line.split("&");
              for (var x=0; x<myattrs.length; x++) {
                 var adata = myattrs[x].split("=");
                 if (adata.length==2) {
                    var thisName = unescape(adata[0]);
                    var thisValue = unescape(adata[1]);
                    newEl.setAttribute(thisName, thisValue);
                    if (thisName=="ignore") {
                      if (thisValue=="true") {
                        thisValue="1";
                      }
                    }
                    if (thisName=="id") {
                      elOk = true;
                      elId = thisValue;
                    }
                    if (thisName=="lastpostid") {
                      elLpId = Number(thisValue);
                    }
                }
              }
              if (elOk) {
                var doAppend = true;
                if (merge) {
                    var curEl = this.selectSingleNode(this.xmlDoc, this.xmlDoc.documentElement, "thread[@id='"+elId+"']");
                    if (curEl) {
                      if ( Number(curEl.getAttribute("lastpostid")) > elLpId ) {
                          // In-memory data is newer than data from file, keep the in-memory data
                          doAppend = false;
                      } else {
                          // File data is newer than in-memory data, update the in-memory data
                          // TODO: merge in op/title data from curEl to newEl if it doesn't have it maybe?
                          curEl.parentNode.removeChild(curEl);
                          doAppend = true;
                      }
                    } else {
                      doAppend = true;
                    }
                }
                if (doAppend) {
                  this.xmlDoc.documentElement.appendChild(newEl);
                }
              }
          }

          // hasmore = false;
        } while (hasmore);

        istream.close();

        if (!processingdata) {
          // Couldn't recognize the data in the file. Try the legacy XML loader.
          this.LoadXMLLegacy();
        }

      } else {
        
        // Initialize the empty document...
        this.InitializeEmptySALRXML(merge);
        
        var statement = mDBConn.createStatement("SELECT * FROM `threaddata`");
        while (statement.executeStep()) {
          var newEl = this.xmlDoc.createElement("thread");
          var elOk = false;
          var elId = null;
          var elLpId = 0;
          for (var x=0; x<statement.columnCount; x++) {
            if (!statement.getIsNull(x)) {
              var thisName = statement.getColumnName(x);
              var thisValue = statement.getString(x);
              newEl.setAttribute(thisName, thisValue);
              if (thisName=="ignore") {
                if (thisValue=="true") {
                  thisValue="1";
                }
              }
              if (thisName=="id") {
                elOk = true;
                elId = thisValue;
              }
              if (thisName=="lastpostid") {
                elLpId = Number(thisValue);
              }
            }
          }
          if (elOk) {
            var doAppend = true;
            if (merge) {
              var curEl = this.selectSingleNode(this.xmlDoc, this.xmlDoc.documentElement, "thread[@id='"+elId+"']");
              if (curEl) {
                if ( Number(curEl.getAttribute("lastpostid")) > elLpId ) {
                  // In-memory data is newer than data from file, keep the in-memory data
                  doAppend = false;
                } else {
                  // File data is newer than in-memory data, update the in-memory data
                  // TODO: merge in op/title data from curEl to newEl if it doesn't have it maybe?
                  curEl.parentNode.removeChild(curEl);
                  doAppend = true;
                }
              } else {
                doAppend = true;
              }
            }
            if (doAppend) {
              this.xmlDoc.documentElement.appendChild(newEl);
            }
          }
        }
        statement.reset();
      }

   },

   selectSingleNode: function(doc, context, xpath)
   {
      var nodeList = doc.evaluate(xpath, context, null, 9 /* XPathResult.FIRST_ORDERED_NODE_TYPE */, null);
      return nodeList.singleNodeValue;
   },

   SaveThreadDataV2: function()
   {
      var fn = this.storedbFileName;
      var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(fn);
      if ( file.exists() == false ) {
         try {
            file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
         }
         catch (ex) {
            throw "file.create error ("+ex.name+") on "+fn;
         }
         //console.log("The SALastRead extension is initializing a new database. You should only see this once.");
      }
      var storageService = Components.classes["@mozilla.org/storage/service;1"]
                                     .getService(Components.interfaces.mozIStorageService);
      var mDBConn = storageService.openDatabase(file);
      
      if (!mDBConn.tableExists('threaddata'))
      {
        mDBConn.executeSimpleSQL("CREATE TABLE `threaddata` (id INTEGER PRIMARY KEY, lastpostdt INTEGER, lastpostid INTEGER, lastviewdt INTEGER, op INTEGER, title VARCHAR(161), lastreplyct INTEGER, posted BOOLEAN, ignore BOOLEAN, star BOOLEAN, options INTEGER);");
      }
      var nodes = this.xmlDoc.evaluate("/salastread/thread", this.xmlDoc, null, 7 /* XPathResult.ORDERED_NODE_SNAPSHOT_TYPE */, null);
      for (var x=0; x<nodes.snapshotLength; x++) {
         var thisLineDataArray = new Array();
        
         var thisNode = nodes.snapshotItem(x);
         var tnChildren = thisNode.attributes;
         for (var i=0; i<tnChildren.length; i++) {
           if ( tnChildren[i].nodeType == 2 ) {  // ATTRIBUTE_NODE
               var thisName = tnChildren.item(i).nodeName;
               var thisValue = tnChildren.item(i).nodeValue;
               thisLineDataArray[thisName] = thisValue;
            }
         }
         
         var statement = mDBConn.createStatement("SELECT `id` FROM `threaddata` WHERE `id` = ?1");
         statement.bindInt32Parameter(0,thisLineDataArray['id']);
         if (statement.executeStep()) {
           statement.reset();
           var sqlstatement = "UPDATE `threaddata` SET ";
           var i = 1;
           for (thisName in thisLineDataArray) {
             sqlstatement += (i>1?",":"") + "`" + thisName + "` = ?" + i++ + " ";
           }
           sqlstatement += "WHERE `id` = ?1";
           var statement = mDBConn.createStatement(sqlstatement);
           var i = 0;
           for (thisName in thisLineDataArray) {
             statement.bindStringParameter(i++, thisLineDataArray[thisName]);
           }
           statement.execute();
         } else {
           statement.reset();
           var sqlstatement = "INSERT INTO `threaddata` (";
           var i = 1;
           for (thisName in thisLineDataArray) {
             sqlstatement += (i++>1?",":"") + "`" + thisName + "` ";
           }
           sqlstatement += ") VALUES (";
           var i = 1;
           for (thisName in thisLineDataArray) {
             sqlstatement += (i>1?",":"") + " ?" + i++;
           }
           sqlstatement += ")";
           var statement = mDBConn.createStatement(sqlstatement);
           var i = 0;
           for (thisName in thisLineDataArray) {
             statement.bindStringParameter(i++, thisLineDataArray[thisName]);
           }
           statement.execute();
         }
      }

   },

   RemovePostDataSQL: function(threadid)
   {
      var fn = this.storedbFileName;
      var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(fn);
      if ( file.exists() == false ) {
         try {
            file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
         }
         catch (ex) {
            throw "file.create error ("+ex.name+") on "+fn;
         }
         //console.log("The SALastRead extension is initializing a new database. You should only see this once.");
      }
      var storageService = Components.classes["@mozilla.org/storage/service;1"]
                                     .getService(Components.interfaces.mozIStorageService);
      var mDBConn = storageService.openDatabase(file);
      
      if (!mDBConn.tableExists('threaddata'))
      {
        mDBConn.executeSimpleSQL("CREATE TABLE `threaddata` (id INTEGER PRIMARY KEY, lastpostdt INTEGER, lastpostid INTEGER, lastviewdt INTEGER, op INTEGER, title VARCHAR(161), lastreplyct INTEGER, posted BOOLEAN, ignore BOOLEAN, star BOOLEAN, options INTEGER);");
      }
      
      var statement = mDBConn.createStatement("SELECT `id` FROM `threaddata` WHERE `id` = ?1");
      statement.bindInt32Parameter(0,threadid);
      if (statement.executeStep()) {
        statement.reset();
        var statement = mDBConn.createStatement("DELETE FROM `threaddata` WHERE `id` = ?1");
        statement.bindInt32Parameter(0,threadid);
        statement.execute();
      }
   },
   
   SavePostDataSQL: function(threaddetails)
   {
      var fn = this.storedbFileName;
      var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(fn);
      if ( file.exists() == false ) {
         try {
            file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
         }
         catch (ex) {
            throw "file.create error ("+ex.name+") on "+fn;
         }
         //console.log("The SALastRead extension is initializing a new database. You should only see this once.");
      }
      var storageService = Components.classes["@mozilla.org/storage/service;1"]
                                     .getService(Components.interfaces.mozIStorageService);
      var mDBConn = storageService.openDatabase(file);
      
      if (!mDBConn.tableExists('threaddata'))
      {
        mDBConn.executeSimpleSQL("CREATE TABLE `threaddata` (id INTEGER PRIMARY KEY, lastpostdt INTEGER, lastpostid INTEGER, lastviewdt INTEGER, op INTEGER, title VARCHAR(161), lastreplyct INTEGER, posted BOOLEAN, ignore BOOLEAN, star BOOLEAN, options INTEGER);");
      }
      
      var statement = mDBConn.createStatement("SELECT `id` FROM `threaddata` WHERE `id` = ?1");
      statement.bindInt32Parameter(0,threaddetails['id']);
      if (statement.executeStep()) {
         statement.reset();
         var sqlstatement = "UPDATE `threaddata` SET ";
         var i = 1;
         for (thisName in threaddetails) {
           sqlstatement += (i>1?",":"") + "`" + thisName + "` = ?" + i++ + " ";
         }
         sqlstatement += "WHERE `id` = ?1";
         var statement = mDBConn.createStatement(sqlstatement);
         var i = 0;
         for (thisName in threaddetails) {
           statement.bindStringParameter(i++, threaddetails[thisName]);
         }
         statement.execute();
       } else {
           statement.reset();
           var sqlstatement = "INSERT INTO `threaddata` (";
           var i = 1;
           for (thisName in threaddetails) {
             sqlstatement += (i++>1?",":"") + "`" + thisName + "` ";
           }
           sqlstatement += ") VALUES (";
           var i = 1;
           for (thisName in threaddetails) {
             sqlstatement += (i>1?",":"") + " ?" + i++;
           }
           sqlstatement += ")";
           var statement = mDBConn.createStatement(sqlstatement);
           var i = 0;
           for (thisName in threaddetails) {
             statement.bindStringParameter(i++, threaddetails[thisName]);
           }
           statement.execute();
       }
      

   },

   CleanupXML: function()
   {
      var xdoc = this.xmlDoc;
      if (typeof(xdoc)=="undefined" || !xdoc)
         return;
      var expireDate = new Date( (new Date().getTime()) - (this.int_expireMinAge * (1000*60*60*24)) );
      var expireyear = new String( expireDate.getYear()+1900 );
      var expiremonth = new String( expireDate.getMonth()+1 );
      var expireday = new String( expireDate.getDate() );
      while (expireyear.length<4) expireyear = "0"+expireyear;
      while (expiremonth.length<2) expiremonth = "0"+expiremonth;
      while (expireday.length<2) expireday = "0"+expireday;
      var expiredt = expireyear + expiremonth + expireday + "0000";
      var curNode = this.xmlDoc.documentElement.firstChild;
      while (curNode) {
         var thisNode = curNode;
         curNode = curNode.nextSibling;
         if ( thisNode.nodeType == 1 ) {   // 1 = XML Element, 3 = Text Node
            var lastpostdt = thisNode.getAttribute("lastpostdt");
            if ( thisNode.getAttribute("lastviewdt") && thisNode.getAttribute("lastviewdt")>0 ) {
               lastpostdt = thisNode.getAttribute("lastviewdt");
            }
            if ( lastpostdt < expiredt ) {
               thisNode.parentNode.removeChild(thisNode);
            } else {
               thisNode.parentNode.insertBefore(xdoc.createTextNode("\n"), thisNode);
            }
         }
         else if ( thisNode.nodeType == 3 ) {
            thisNode.parentNode.removeChild(thisNode);
         }
      }
      xdoc.documentElement.appendChild(xdoc.createTextNode("\n"));
      this.SaveXML();
   },

   CleanupSQL: function(threaddetails)
   {
      var fn = this.storedbFileName;
      var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(fn);
      if ( file.exists() == false ) {
         try {
            file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
         }
         catch (ex) {
            throw "file.create error ("+ex.name+") on "+fn;
         }
         //console.log("The SALastRead extension is initializing a new database. You should only see this once.");
      }
      var storageService = Components.classes["@mozilla.org/storage/service;1"]
                                     .getService(Components.interfaces.mozIStorageService);
      var mDBConn = storageService.openDatabase(file);
      
      if (!mDBConn.tableExists('threaddata'))
      {
        mDBConn.executeSimpleSQL("CREATE TABLE `threaddata` (id INTEGER PRIMARY KEY, lastpostdt INTEGER, lastpostid INTEGER, lastviewdt INTEGER, op INTEGER, title VARCHAR(161), lastreplyct INTEGER, posted BOOLEAN, ignore BOOLEAN, star BOOLEAN, options INTEGER);");
      }

      var expireDate = new Date( (new Date().getTime()) - (this.int_expireMinAge * (1000*60*60*24)) );
      var expireyear = new String( expireDate.getYear()+1900 );
      var expiremonth = new String( expireDate.getMonth()+1 );
      var expireday = new String( expireDate.getDate() );
      while (expireyear.length<4) expireyear = "0"+expireyear;
      while (expiremonth.length<2) expiremonth = "0"+expiremonth;
      while (expireday.length<2) expireday = "0"+expireday;
      var expiredt = expireyear + expiremonth + expireday + "0000";
      
      var statement = mDBConn.createStatement("DELETE FROM `threaddata` WHERE `lastviewdt` <= ?1");
      statement.bindStringParameter(0,expiredt);
      statement.execute();
      var statement = mDBConn.createStatement("DELETE FROM `threaddata` WHERE `lastviewdt` IS NULL");
      statement.execute();
      
   },

   LoadPrefs: function()
   {
      this._LoadTypePrefs("color","char");
      this._LoadTypePrefs("url","char");
      this._LoadTypePrefs("toggle","bool");
      this._LoadTypePrefs("string","char");
      this._LoadTypePrefs("int","int");
   },

   SavePrefs: function()
   {
      this._SaveTypePrefs("color","char");
      this._SaveTypePrefs("url","char");
      this._SaveTypePrefs("toggle","bool");
      this._SaveTypePrefs("string","char");
      this._SaveTypePrefs("int","int");
   },

   ProfileInit: function(isWindows)
   {
      if (this._profileInitialized)
         return;
      this._profileInitialized = true;
      this._isWindows = isWindows;
      try {
         this.AttachShutdownObserver();
         this.LoadPrefs();
         if ( this.string_databaseStoragePath.indexOf("%profile%")==0 ) {
            this._dbfn = GetUserProfileDirectory( this.string_databaseStoragePath.substring(9), this._isWindows );
         } else {
            this._dbfn = this.string_databaseStoragePath;
         }
         if ( this.string_persistStoragePath.indexOf("%profile%")==0 ) {
            this._fn = GetUserProfileDirectory( this.string_persistStoragePath.substring(9), this._isWindows );
         } else {
            this._fn = this.string_persistStoragePath;
         }
         if ( this.string_forumListStoragePath.indexOf("%profile%")==0 ) {
            this._flfn = GetUserProfileDirectory( this.string_forumListStoragePath.substring(9), this._isWindows );
         } else {
            this._flfn = this.string_forumListStoragePath;
         }
         this.LoadXML();
         this.CleanupSQL();
         this.LoadForumListXML();

         // Get Timer Value
         try { this._TimerValue = this.pref.getIntPref("salastread.int.timeSpentOnForums"); } catch(xx) { }
         if ( ! this._TimerValue ) {
            this._TimerValue = 0;
         }
         this._TimerValueSaveAt = this._TimerValue + 60;
         this._TimerValueLoaded = true;

         // cachedThreadEntryList
         this._cachedThreadEntryList = new Array();
      }
      catch (e) {
         this._starterr = e + "\nLine: " + e.lineNumber;
      }
   },

   MAX_OPDATA_LENGTH: 400,
   _opData: null,

   StoreOPData: function(threadid, op)
   {
      var i;
      var storewhat;

      if ( this._opData == null )
         this._opData = new Array();

      for (i=0; i < this._opData.length; i++) {
         if ( this._opData[i].t == threadid ) {
            this._opData[i].o = op;
            return;
         }
      }

      while ( this._opData.length >= this.MAX_OPDATA_LENGTH ) {
         this._opData.pop();
      }

      this._opData.unshift( { t: threadid, o: op } );
   },

   GetOPFromData: function(threadid)
   {
      if ( this._opData == null )
         this._opData = new Array();

      for (i=0; i < this._opData.length; i++) {
         if ( this._opData[i].t == threadid ) {
            return this._opData[i].o;
         }
      }

      return null;
   },

   _killed: false,
   _killChecked: false,
   _killMessage: "",
   _updateURL: "",
   _profileInitialized: false,
   _gotForumList: false,
   _forumListXml: null,
   _fn: null,
   _flfn: null,
   _xmlDoc: null,

   _LoadTypePrefs: function(prefType,dataType)
   {
      var propname;
      for (propname in this)
      {
         if ( propname.indexOf("default"+prefType+"_")==0 )
         {
            this._LoadTypePrefsInt(prefType, dataType, propname);
         }
      }
   },

   _LoadTypePrefsInt: function(prefType,dataType,propname)
   {
      var prefName = propname.substring( 8 + prefType.length );
      var s = "SET_"+prefType+"_"+prefName;
      var realPrefName = "salastread."+prefType+"."+prefName;
      var initValue = this._ReadPrefOrDefault(
                                          realPrefName,
                                          this[propname],
                                          dataType);
      if (typeof(this[s])=="function") {
         var that = this;
         this[prefType+"_"+prefName] getter = function() {
                                     return that._ReadPrefOrDefault(
                                          realPrefName,
                                          that[propname],
                                          dataType);
         };
         this[prefType+"_"+prefName] setter = function(value) {
                                     that._SetPref(
                                          realPrefName,
                                          value,
                                          dataType);
                                     that[s](value);
         };
         this[s](initValue);
      } else {
         this[prefType+"_"+prefName] = initValue;
      }
   },

   _SetPref: function(prefName, value, dataType)
   {
      if (dataType=="char")
         this.pref.setCharPref(prefName, value);
      else if (dataType=="bool")
         this.pref.setBoolPref(prefName, value);
      else if (dataType=="int")
         this.pref.setIntPref(prefName, value);
   },

   _SaveTypePrefs: function(prefType,dataType) {
      var propname;
      for (propname in this)
      {
         if ( propname.indexOf(prefType+"_")==0 )
         {
            var prefName = propname.substring( 1 + prefType.length );
            prefName = "salastread."+prefType+"."+prefName;
            this._SetPref(prefName, this[propname], dataType);
         }
      }
   },
  
   _OLDSaveTypePrefs: function(prefType,dataType)
   {
      var propname;
      for (propname in this)
      {
         if ( propname.indexOf(prefType+"_")==0 )
         {
            var prefName = propname.substring( 1 + prefType.length );
            if (dataType=="char")
            {
               this.pref.setCharPref("salastread."+prefType+"."+prefName, this[propname]);
            }
            else if (dataType=="bool")
            {
               this.pref.setBoolPref("salastread."+prefType+"."+prefName, this[propname]);
            }
            else if (dataType=="int")
            {
               this.pref.setIntPref("salastread."+prefType+"."+prefName, this[propname]);
            }
         }
      }
   },

   _ReadPrefOrDefault: function(prefname, defaultvalue, preftype)
   {
      var typeval = this.pref.PREF_STRING;
      if (preftype == "bool")
      {
         typeval = this.pref.PREF_BOOL;
      }
      else if (preftype == "int")
      {
         typeval = this.pref.PREF_INT;
      }
      var setPref = true;
      var result = defaultvalue;
      if (this.pref.getPrefType(prefname)==typeval)
      {
         var prefval;
         if (typeval == this.pref.PREF_STRING)
         {
            prefval = this.pref.getCharPref(prefname);
            if (prefval != "")
            {
               result = prefval;
               setPref = false;
            }
         }
         else if (typeval == this.pref.PREF_BOOL)
         {
            prefval = this.pref.getBoolPref(prefname);
            if (typeof(prefval) != "undefined")
            {
               result = prefval;
               setPref = false;
            }
         }
         else if (typeval == this.pref.PREF_INT)
         {
            prefval = this.pref.getIntPref(prefname);
            if (typeof(prefval) != "undefined")
            {
               result = prefval;
               setPref = false;
            }
         }
      }
      if (setPref)
      {
         if (preftype == this.pref.PREF_STRING)
         {
            this.pref.setCharPref(prefname, result);
         }
         else if (preftype == this.pref.PREF_BOOL)
         {
            this.pref.setBoolPref(prefname, result);
         }
         else if (preftype == this.pref.PREF_INT)
         {
            this.pref.setIntPref(prefname, result);
         }
      }
      return result;
   },

   EscapeMenuURL: function(murl)
   {
      var res = murl.replace("&","&amp;");
      return res.replace(",","&comma;");
   },

   UnescapeMenuURL: function(murl)
   {
      var res = murl.replace("&comma;",",");
      return res.replace("&amp;","&");
   },

   _TimerValue: 0,
   _TimerValueSaveAt: 0,
   _TimerValueLoaded: false,
   _LastTimerPing: 0,

   PingTimer: function()
   {
      var nowtime = (new Date()).getTime();
      if ( this._LastTimerPing < nowtime-1000 ) {
         this._TimerValue++;
         this._LastTimerPing = nowtime;
         if ( this._TimerValue >= this._TimerValueSaveAt ) {
            this.SaveTimerValue();
         }
      }
   },

   SaveTimerValue: function()
   {
      if ( this._TimerValueLoaded ) {
         this.pref.setIntPref("salastread.int.timeSpentOnForums", this._TimerValue);
      }
      this._TimerValueSaveAt = this._TimerValue + 60;
   },

   IsDevelopmentRelease: function()
   {
      var ver = "1.15.1912";
      var vm = ver.match(/^(\d+)\.(\d+)\.(\d+)$/);
      if (vm) {
         var major = vm[1];
         var minor = vm[2];
         var build = vm[3];

         return (minor % 2 != 0);
      } else {
         return false;
      }
   },

   IsDebugEnabled: function()
   {
      return this.IsDevelopmentRelease();
   },

   // XPCOM Glue stuff
   QueryInterface: function(iid)
   {
      if (!iid.equals(nsISupports))
         throw Components.results.NS_ERROR_NO_INTERFACE;
      return this;
   },

   get wrappedJSObject() { return this; }
};

// Component registration
var PersistModule = new Object();

PersistModule.registerSelf = function(compMgr, fileSpec, location, type)
{
   compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
   compMgr.registerFactoryLocation(SALR_CID,
                                   "salrPersistObject",
                                   SALR_CONTRACTID,
                                   fileSpec,
                                   location,
                                   type);
}

PersistModule.getClassObject = function(compMgr, cid, iid)
{
   if (!cid.equals(SALR_CID))
      throw Components.results.NS_ERROR_NO_INTERFACE;
   if (!iid.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
   return PersistFactory;
}

PersistModule.CanUnload = function(compMgr)
{
   return true;
}

// Returns the singleton object when needed.
var PersistFactory = new Object();

PersistFactory.createInstance = function(outer, iid)
{
   if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
   if (!iid.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
   return PersistObject;
}

// XPCOM Registration Function -- called by Firefox
function NSGetModule(compMgr, fileSpec)
{
   return PersistModule;
}

// This creates the singleton object we use for settings persistence
var PersistObject = new salrPersistObject();
