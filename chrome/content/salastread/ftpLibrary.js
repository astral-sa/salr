/* 
HELPFUL LINKS

http://forums.mozillazine.org/viewtopic.php?t=387246
http://www.polemian.org/curr/?resource=http://www.polemian.org/curr/resources/f23gh65ge1cd2
http://72.14.203.104/search?q=cache:ETk4wCjR99wJ:www.koders.com/javascript/fidB374425A03D1BC3BE4CA80D403B220F725DBB59C.aspx+scriptableinputstream+nsichannel&hl=en&gl=us&ct=clnk&cd=1&client=firefox-a

*/

function FTPTransferObject() {
	this.Components = Components;
}

FTPTransferObject.prototype = {
	
	Components: null,

	// what is a channel?
	// @params: (string) URL of some remote file
	// @return: (channel) a channel, whatever that is
	_getChannelForUrl: function(url) {
		var channel = this.Components.classes["@mozilla.org/network/io-service;1"]
						.getService(this.Components.interfaces.nsIIOService)
						.newChannel(url, null, null);
		return channel;
	},

	// (?)
	// @params: (string) URL of remote file, (string) path to local file
	// @return: nothing
	sendFileSync: function(url, localFile) { 
		this.sendFile(url, localFile, function(){}); 
	},

	// sends a file
	// @params: (URI) url of remote storage, (string) local file path, (function) callback function
	// @return: nothing
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
		buffer 	= null;
		fstream = null;
		source 	= null;
	},

	// Creates a listener object from a callback function
	// @params: (function) callback function
	// @return: (object) listener object
	_makeListener: function(callback) {
		return {
			onStartRequest: function(req, ctx) { },
			onStopRequest: function(req, ctx, status, msg) { callback(status); },
			onDataAvailable: function() { },
		};
	},

	// Streamlistener variable to keep tabs
	_sl: null,

	// resets streamlistener variable to null
	// @params: nothing
	// @return: nothing
	reset: function() {
		this._sl = null;
	},

	// gets a remote file
	// @params: (URI) url of remote file, (string) local file path, (function) callback
	// @return: nothing
	getFile: function(url, localFile, callback) {
		Components.utils.reportError(url + " : " + localFile);
	
		var channel = this._getChannelForUrl(url);
			channel.loadFlags |= this.Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
		var that = this;
		this._sl = this.makeStreamListener(this, url, function(s, d) { that._writeToFile(s, d, localFile, callback); });
		this._sl.Components = this.Components;
		channel.asyncOpen(this._sl, null);
	},

	// Writes downloaded bytes to a local file
	// @params: (int) status of the connection, (?) data in some form, (string) local file path, (function) callback
	// @return: nothing
	_writeToFile: function(status, data, localFile, callback) {
		this._sl = null;
		if (status == 0) {
			var file = this.Components.classes["@mozilla.org/file/local;1"]
						.createInstance(this.Components.interfaces.nsILocalFile);
			file.initWithPath(localFile);
			
			if (file.exists() == false) {
				file.create(this.Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
			}
			
			var outputStream = this.Components.classes["@mozilla.org/network/safe-file-output-stream;1"]
								.createInstance(this.Components.interfaces.nsIFileOutputStream);
			outputStream.init(file, 0x04 | 0x08 | 0x20, 420, 0);
			
			var result = outputStream.write(data, data.length);
			
			if (outputStream instanceof this.Components.interfaces.nsISafeOutputStream) {
				outputStream.finish();
			} else {
				outputStream.close();
			}
		}
		callback(status);
	},
	
	// no idea
	// @params: (string) URL of remote file to sync to, (string) local file to sync to
	getFileSync: function(url, localFile) {
		var channel = this._getChannelForUrl(url);
		channel.loadFlags |= this.Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
		var instream = this.Components.classes["@mozilla.org/scriptableinputstream;1"]
						.createInstance(this.Components.interfaces.nsIScriptableInputStream);
		instream.init(channel.open());

		var result = "";
		var avail;
		while ((avail = instream.available()) > 0) {
			result += instream.read(avail);
		}

		if (result == "") { 
			throw "no data from remote file"; 
		}
		
		this._writeToFile(0, result, localFile, function() { });
	},

	// makes a stream listener (durrr)
	// @params: (object) owner, (string) url, (function) callback
	// @return: (object) stream listener
	makeStreamListener: function(owner, url, callback) {
		var wrap = function(a,b) { callback(a,b); };
		var xCom = this.Components;
		return {
			owner : owner,
			data : "",
			url : url,
			callback : wrap,
			Components : xCom,

			onStartRequest: function(request, context) { },
			
			onStopRequest: function(request, context, status) {
				this.callback(status, this.data);
				this.owner._sl = null;
			},
			
			onDataAvailable: function(request, context, inStr, sourceOffset, count) {
				Components.utils.reportError(count);
				
				var bis = this.Components.classes["@mozilla.org/binaryinputstream;1"]
							.createInstance(this.Components.interfaces.nsIBinaryInputStream);
				bis.setInputStream(inStr);
				var input = null;
				bis.readBytes(count, input);
				
				this.data += input;
			}
		};
	},
};