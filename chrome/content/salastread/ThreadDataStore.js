
function LocalFileThreadDataStore(fn)
{
   this._fileName = fn;
   this._lastMergeTime = new Date(0, 0, 0);
   this._memStore = {};
}

LocalFileThreadDataStore.prototype =
{
   _fileName: null,
   _lastMergeTime: null,
   // How often, in milliseconds, should the file be re-read and merged into the data in memory.
   _mergeInterval: (45*60*1000),
   _memStore: null,
   _inSync: false,

   _ReadV1File: function()
   {
      try {
         var file = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
         file.initWithPath(this._fileName);
         if (file.exists()==false)
            return {};
         var is = Components.classes["@mozilla.org/network/file-input-stream;1"]
               .createInstance(Components.interfaces.nsIFileInputStream);
         is.init(file, 0x01, 00004, null);
         var sis = Components.classes["@mozilla.org/scriptableinputstream;1"]
               .createInstance(Components.interfaces.nsIScriptableInputStream);
         sis.init(is);
         var data = sis.read(sis.available());

         if (typeof(data)!="undefined" && data.length>0) {
            var oDomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
                  .createInstance(Components.interfaces.nsIDOMParser);
            try {
               var result = {};
               var xmlDoc = oDomParser.parseFromString(xmlstr, "text/xml");
               for (var i=0; i<xmlDoc.documentElement.childNodes.length; i++) {
                  var thisNode = xmlDoc.documentElement.childNodes[i];
                  if ( thisNode.nodeName == "thread" ) {
                     var thisData = {};
                     var thisDataOk = false;
                     for (var x=0; x<thisNode.attributes.length; x++) {
                        thisData[ thisNode.attributes[x].nodeName ] = thisNode.attributes[x].nodeValue;
                        if ( thisNode.attributes[x].nodeName == "id" )
                           thisDataOk = true;
                     }
                     if (thisDataOk)
                        result[thisData["id"]] = thisData;
                  }
               }
               return result;
            }
            catch (e) {
               return {};
            }
         }
      }
      catch (e) {
         return {};
      }
      return {};
   },

   THREADDATA_FILE_HEADER_V2: "SALR Thread Data v2",

   _ReadV2File: function(hasmore, istream)
   {
      var result = {};
      while (hasmore) {
         var line = {};
         hasmore = istream.readLine(line);
         line = line.value;

         var lineOk = false;
         var lineData = {};
         var myattrs = line.split("&");
         for (var x=0; x<myattrs.length; x++) {
            var adata = myattrs[x].split("=");
            if (adata.length==2) {
               var thisName = unescape(adata[0]);
               var thisValue = unescape(adata[1]);
               lineData[thisName] = thisValue;
               if ( thisName=="id" )
                  lineOk = true;
            }
         }
         result[lineData["id"]] = lineData;
      }
      istream.close();
      return result;
   },

   _ReadFromFile: function()
   {
      try {
         var file = Components.classes["@mozilla.org/file/local;1"]
               .createInstance(Components.interfaces.nsILocalFile);
         file.initWithPath( this._fileName );
         if (file.exists()==false)
            return {};

         var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
               .createInstance(Components.interfaces.nsIFileInputStream);
         istream.init(file, 0x01, 0444, 0);
         istream.QueryInterface(Components.interfaces.nsILineInputStream);
        
         var line = {}; 
         var hasmore = istream.readLine(line);
         line = line.value;

         if ( line == this.THREADDATA_FILE_HEADER_V2 )
            return this._ReadV2File(hasmore, istream);
         else {
            istream.close();
            istream = null;
            file = null;
            return this._ReadV1File();
         }
      }
      catch (e) {
         return {};
      }
      return {};
   },

   _SaveToFile: function()
   {
      var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(this._fileName);
      if (file.exists()==false)
         file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
      var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
            .createInstance(Components.interfaces.nsIFileOutputStream);
      outputStream.init(file, 0x04 | 0x08 | 0x20, 420, 0);

      var fileHeader = this.THREADDATA_FILE_HEADER_V2 + "\n";
      outputStream.write(fileHeader, fileHeader.length);
      for (var mid in this._memStore) {
         if ( this._memStore[mid].PersistToStore() ) {
            var thisLineDataArray = new Array();
            for (var mattr in this._memStore[mid]) {
               thisLineDataArray.push( escape(mattr) + "=" + escape(this._memStore[mid][mattr]) );
            }
            var thisLineData = thisLineDataArray.join("&") + "\n";
            outputStream.write(thisLineData, thisLineData.length);
         }
      }
      outputStream.close();
   },

   _CheckForMergeIn: function()
   {
      if ( this._lastMergeTime.valueOf() >= (new Date().valueOf())-this._mergeInterval )
         return;

      var fdata = this._ReadFromFile();
      for ( var fid in fdata ) {
         var fvalue = fdata[fid]
         if ( typeof(this._memStore[fid]) != "undefined" ) {
            this._memStore[fid].SyncData(fvalue);
         } else {
            this._memStore[fid] = new ThreadDataObject(this, fid, fvalue);
         }
      }
   },

   SetUnsync: function(tid)
   {
      this._inSync = false;
   },

   Sync: function()
   {
      this._lastMergeTime = new Date(0, 0, 0);
      this._CheckForMergeIn();

      if ( !this._inSync ) {
         this._SaveToFile();
      }
      this._inSync = true;
   },

   GetThreadDataObject: function(forumid, threadid)
   {
      this._CheckForMergeIn();

      var tid = forumid + "::" + threadid;
      if (forumid=="com.somethingawful.forums") {
         tid = threadid;
      }

      if ( typeof(this._memStore[tid])=="undefined" ) {
         this._memStore[tid] = new ThreadDataObject(this, tid, null);
      }
      return this._memStore[tid];
   },

   ClassName: "ThreadDataStore"
};

// ====================================================================================

function ThreadDataObject(owner, id, dataobj)
{
}

ThreadDataObject.prototype =
{
   PersistToStore: function()
   {
      return false;
   },

   SyncData: function(dataobj)
   {
   },

   ClassName: "ThreadDataObject"
};
