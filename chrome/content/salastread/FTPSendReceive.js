
// http://forums.mozillazine.org/viewtopic.php?t=387246
// http://www.polemian.org/curr/?resource=http://www.polemian.org/curr/resources/f23gh65ge1cd2
// http://72.14.203.104/search?q=cache:ETk4wCjR99wJ:www.koders.com/javascript/fidB374425A03D1BC3BE4CA80D403B220F725DBB59C.aspx+scriptableinputstream+nsichannel&hl=en&gl=us&ct=clnk&cd=1&client=firefox-a

function SALR_FTPTransferObject() {
   this.Components = Components;
}

SALR_FTPTransferObject.prototype = {
   Components: null,

   _getChannelForUrl: function(url) {
      var channel = this.Components.classes["@mozilla.org/network/io-service;1"]
            .getService(this.Components.interfaces.nsIIOService)
            .newChannel(url, null, null);
      return channel;
   },

   sendFileSync: function(url, localFile) { this.sendFile(url, localFile, function(){}); },

   sendFile: function(url, localFile, callback) {
      //callback(0); return;
      var source = this.Components.classes["@mozilla.org/file/local;1"]
            .createInstance(this.Components.interfaces.nsILocalFile);
      source.initWithPath(localFile);

      var fstream = this.Components.classes["@mozilla.org/network/file-input-stream;1"]
            .createInstance(this.Components.interfaces.nsIFileInputStream);
      fstream.init(source, 1, 0, 0);

      var buffer = this.Components.classes["@mozilla.org/network/buffered-input-stream;1"]
            .createInstance(this.Components.interfaces.nsIBufferedInputStream);
      buffer.init(fstream, 4096);

      var channel = this._getChannelForUrl(url)
            .QueryInterface(this.Components.interfaces.nsIUploadChannel);

      var listener = this._makeListener(callback);

      channel.setUploadStream(buffer, "", -1);
      channel.asyncOpen(listener, null);

      listener = null;
      channel = null;
      buffer = null;
      fstream = null;
      source = null;
   },

   _makeListener: function(callback) {
      return {
         onStartRequest: function(req, ctx) { },
         onStopRequest: function(req, ctx, status, msg) { callback(status); },
         onDataAvailable: function() { },
      };
   },

   _sl: null,

   reset: function() {
      this._sl = null;
   },

   getFile: function(url, localFile, callback) {
      var channel = this._getChannelForUrl(url);
      channel.loadFlags |= this.Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
      var that = this;
      this._sl = this.makeStreamListener(this, url, function(s,d) { that._writeToFile(s,d,localFile,callback); });
      this._sl.Components = this.Components;
      channel.asyncOpen(this._sl, null);
   },

   _writeToFile: function(status, data, localFile, callback) {
      this._sl = null;
      if (status==0) {
         var file = this.Components.classes["@mozilla.org/file/local;1"]
                       .createInstance(this.Components.interfaces.nsILocalFile);
         file.initWithPath(localFile);
         if (file.exists() == false) {
            file.create(this.Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
         }
         var outputStream = this.Components.classes["@mozilla.org/network/file-output-stream;1"]
                       .createInstance(this.Components.interfaces.nsIFileOutputStream);
         outputStream.init(file, 0x04 | 0x08 | 0x20, 420, 0);
         var result = outputStream.write(data, data.length);
         outputStream.close();
      }
      callback(status);
   },

   getFileSync: function(url, localFile) {
      var channel = this._getChannelForUrl(url);
      channel.loadFlags |= this.Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
      var instream = this.Components.classes["@mozilla.org/scriptableinputstream;1"]
                         .createInstance(this.Components.interfaces.nsIScriptableInputStream);
      instream.init(channel.open());

      var result = "";
      var avail;
      while ((avail = instream.available()) > 0)
         result += instream.read(avail);

      if (result == "") { throw "no data from remote file"; }
      this._writeToFile(0, result, localFile, function() { });
   },

   makeStreamListener: function(owner, url, callback)
   {
      var wrap = function(a,b) { callback(a,b); };
      var xCom = this.Components;
      return {
         owner: owner,
         data: "",
         url: url,
         callback: wrap,
         Components: xCom,

         onStartRequest: function(request, context) { },
         onStopRequest: function(request, context, status) {
            this.callback(status, this.data);
            this.owner._sl = null;
         },
         onDataAvailable: function(request, context, inStr, sourceOffset, count) {
            var sis = this.Components.classes["@mozilla.org/scriptableinputstream;1"]
                         .createInstance(this.Components.interfaces.nsIScriptableInputStream);
            sis.init(inStr);
            this.data += sis.read(count);
         }
      };
   },
};

/*
function SALR_StreamListener(owner, url, callback) {
   this.owner = owner;
   this.data = "";
   this.url = url;
   this.callback = callback;
   this.Components = Components;
}

SALR_StreamListener.prototype = {
   Components: null,

   onStartRequest: function(request, context) { },

   onStopRequest: function(request, context, status) {
      this.callback(status, this.data);
      this.owner._sl = null;
   },

   onDataAvailable: function(request, context, inStr, sourceOffset, count) {
      var sis = this.Components.classes["@mozilla.org/scriptableinputstream;1"]
                   .createInstance(this.Components.interfaces.nsIScriptableInputStream);
      sis.init(inStr);
      this.data += sis.read(count);
   }
};
*/
