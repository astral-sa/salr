// <script> This line added because my IDE has problems detecting JS ~ 0330 ~ duz

function SALR_vidClick(e)
{
	e.preventDefault();
	e.stopPropagation();

	var link = e.target;

	//if they click again hide the video
	var video = link.nextSibling.firstChild;
	if(video && video.className == 'salr_video') {
			link.parentNode.removeChild(link.nextSibling);
			return;
	}

	//figure out the video type
	var videoId, videoSrc, videoTLD;
	var videoIdSearch = link.href.match(/^http\:\/\/(www\.)?youtube\.com\/watch\?v=([-_0-9a-zA-Z]+)/);
	if (videoIdSearch)
	{
		videoId = videoIdSearch[2];
		videoSrc = "youtube";
	}
	else
	{
		var match = link.href.match(/^http\:\/\/video\.google\.c(om|a|o\.uk)\/videoplay\?docid=([-0-9]+)/);
		videoTLD = match[1];
		videoId = match[2];
		videoSrc = "google";
	}

	//create the embedded elements (p containing video for linebreaky goodness)
	var doc = e.originalTarget.ownerDocument;
	var p = doc.createElement("p");
	var embed = doc.createElement("EMBED");
		embed.setAttribute('width', 450);
		embed.setAttribute('height', 370);
		embed.setAttribute('type', "application/x-shockwave-flash");
		embed.setAttribute('class', 'salr_video');
		embed.setAttribute('id', videoId);
	switch (videoSrc)
	{
		case "google":
			embed.setAttribute('flashvars', '');
			embed.setAttribute('src', 'http://video.google.c' + videoTLD + '/googleplayer.swf?docId=' + videoId + '&hl=en');
			break;
		case "youtube":
			embed.setAttribute('quality',"high");
			embed.setAttribute('bgcolor',"#FFFFFF");
			embed.setAttribute('wmode', "transparent");
			embed.setAttribute('src', "http://www.youtube.com/v/" + videoId);
			break;
	}
	p.appendChild(embed);

	//inserts video after the link
	link.parentNode.insertBefore(p, link.nextSibling);
}

const SALR_CONTRACTID = "@evercrest.com/salastread/persist-object;1";
const SALR_CID = Components.ID("{f5d9093b-8210-4a26-89ba-4c987de04efc}");
const nsISupports = Components.interfaces.nsISupports;

function ReadFile(fn)
{
	var file = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
	try {
		file.initWithPath(fn);
	} catch (e) {
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
	var file = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(fn);
	if ( file.exists() == false ) {
		try {
			file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
		} catch (ex) {
			throw "file.create error ("+ex.name+") on "+fn;
		}
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
	// This property is superseded by .preferences, do not use for new code
	// this property has been left in for legacy compatability
	get pref() {
		return Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefBranch);
	},

	get xmlDoc()
	{
		if (this._xmlDoc != null)
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
		var oXmlSer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
						.createInstance(Components.interfaces.nsIDOMSerializer);
		var xmlstr = oXmlSer.serializeToString(this._forumListXml);
		SaveFile(this._flfn, xmlstr);
	},

	get gotForumList() { return this._gotForumList; },
	set gotForumList(value) { this._gotForumList = value; },

	_TimeManager: null,
	get TimeManager() { return this._TimeManager; },
	set TimeManager(value) {
		if (this._TimeManager == null) {
			this._TimeManager = value;
		}
	},

	SetXML: function(xmlstr)
	{
		var oDomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
							.createInstance(Components.interfaces.nsIDOMParser);
		try {
			this.xmlDoc = oDomParser.parseFromString(xmlstr, "text/xml");
		} catch (e) {
			throw e + "\n" + xmlstr;
		}
	},

	LoadForumListXML: function()
	{
		try {
			var pxml = ReadFile(this._flfn);
			if (typeof(pxml) != "undefined")
			{
				if (pxml) {
					var oDomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
										.createInstance(Components.interfaces.nsIDOMParser);
					try {
						this._forumListXml = oDomParser.parseFromString(pxml, "text/xml");
					} catch (e) {
						this._forumListXml = null;
					}
				} else 	{
					this._forumListXml = null;
				}
			} else {
				this._forumListXml = null;
			}
		} catch(e) {
			this._forumListXml = null;
		}
	},

	InitializeEmptySALRXML: function(merge)
	{
		if (!merge || this.xmlDoc==null) {
			this.SetXML("<?xml version=\"1.0\"?>\n<salastread>\n</salastread>");
		}
	},

	SaveXML: function()
	{
		this.SaveTimerValue();
	},


	ProfileInit: function(isWindows)
	{
		if (this._profileInitialized) {
			return;
		}
		this._profileInitialized = true;
		this._isWindows = isWindows;
		try {
			if ( this.getPreference('databaseStoragePath').indexOf("%profile%")==0 ) {
				this._dbfn = this.GetUserProfileDirectory(this.getPreference('databaseStoragePath').substring(9), this._isWindows );
			} else {
				this._dbfn = this.getPreference('databaseStoragePath');
			}

			if ( this.getPreference('forumListStoragePath').indexOf("%profile%")==0 ) {
				this._flfn = this.GetUserProfileDirectory( this.getPreference('forumListStoragePath').substring(9), this._isWindows );
			} else {
				this._flfn = this.getPreference('forumListStoragePath');
			}
			this.LoadForumListXML();

			// Get Timer Value
			try { this._TimerValue = this.getPreference("timeSpentOnForums"); } catch(xx) { }
			if ( ! this._TimerValue ) {
				this._TimerValue = 0;
			}
			this._TimerValueSaveAt = this._TimerValue + 60;
			this._TimerValueLoaded = true;
		} catch (e) {
			this._starterr = e + "\nLine: " + e.lineNumber;
		}
	},

	_profileInitialized: false,
	_gotForumList: false,
	_forumListXml: null,
	_flfn: null,
	_xmlDoc: null,

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

	IsDebugEnabled: function() {
		return this.IsDevelopmentRelease;
	},

	// XPCOM Glue stuff
	QueryInterface: function(iid)
	{
		if (!iid.equals(nsISupports)) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		return this;
	},

	get wrappedJSObject() { return this; },

	//
	// Here begins functions that do not need to be rewriten for 2.0
	//

	// Applies the given XPath and returns the first resultant node
	// @param:
	// @return:
	selectSingleNode: function(doc, context, xpath)
	{
		var nodeList = doc.evaluate(xpath, context, null, 9 /* XPathResult.FIRST_ORDERED_NODE_TYPE */, null);
		return nodeList.singleNodeValue;
	},

	// Applies the given XPath and returns all the nodes in it
	// @param:
	// @return:
	selectNodes: function(doc, context, xpath)
	{
		var nodes = doc.evaluate(xpath, context, null, 7 /* XPathResult.ORDERED_NODE_SNAPSHOT_TYPE */, null);
		var result = new Array(nodes.snapshotLength);
		for (var i=0; i<result.length; i++)
		{
			result[i] = nodes.snapshotItem(i);
		}
		return result;
	},

	get storedbFileName() { return this._dbfn; },

	get SALRversion() { return this.getPreference("currentVersion"); },

	// C&P from old code, needs to be audited
	GetUserProfileDirectory: function(fn,isWindows)
	{
		const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1", "nsIProperties");
		var path;
		try {
			path = (new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path;
		} catch (e) {
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
			if (isWindows) {
				 return "C:\\"+fn;
			} else {
				 return "~/"+fn;
			}
		}
	},

	//
	// Here begins new functions for the 2.0 rewrite
	//

	_needToExpireThreads: true,
	userDataCache: Array(),
	userIDCache: Array(),

	// Return a resource pointing to the proper preferences branch
	get preferences()
	{
		return Components.classes["@mozilla.org/preferences;1"].
		getService(Components.interfaces.nsIPrefService).
		getBranch("extensions.salastread.");
	},

	// Return a connection to the database
	// Create database if it doesn't exist yet
	// TODO: Error handling, Improving(?) file handling
	get database()
	{
		var fn = this.storedbFileName;
		var file = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(fn);
		if (file.exists() == false)
		{
			try
			{
				file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
			}
			catch (ex)
			{
				throw "file.create error ("+ex.name+") on "+fn;
			}
		}
		var storageService = Components.classes["@mozilla.org/storage/service;1"]
			.getService(Components.interfaces.mozIStorageService);
		var mDBConn = storageService.openDatabase(file);
		if (!mDBConn.tableExists("threaddata"))
		{
			mDBConn.executeSimpleSQL("CREATE TABLE `threaddata` (id INTEGER PRIMARY KEY, lastpostid INTEGER, lastviewdt INTEGER, op INTEGER, title VARCHAR(161), lastreplyct INTEGER, posted BOOLEAN, ignore BOOLEAN, star BOOLEAN, options INTEGER)");
			this.prepopulateDB("threaddata");
		}
		if (!mDBConn.tableExists("userdata"))
		{
			mDBConn.executeSimpleSQL("CREATE TABLE `userdata` (userid INTEGER PRIMARY KEY, username VARCHAR(50), mod BOOLEAN, admin BOOLEAN, color VARCHAR(8), background VARCHAR(8), status VARCHAR(8), notes TEXT, ignored BOOLEAN, hideavatar BOOLEAN)");
			this.prepopulateDB("userdata");
		}
		if (!mDBConn.tableExists("posticons"))
		{
			mDBConn.executeSimpleSQL("CREATE TABLE `posticons` (iconnumber INTEGER PRIMARY KEY, filename VARCHAR(50))");
			this.prepopulateDB("posticons");
		}
		return mDBConn;
	},

	// Returns the current unix timestamp in seconds
	get currentTimeStamp()
	{
		var rightNow = new Date();
		return Math.floor(rightNow.getTime()/1000);
	},

	// Returns an associative array of the ignored threads with the thread id as the key and the thread title as the value
	get ignoreList()
	{
		var threadid, threadtitle, ignoredThreads = new Array();
		var statement = this.database.createStatement("SELECT `id`, `title` FROM `threaddata` WHERE `ignore` = 1");
		while (statement.executeStep())
		{
			threadid = statement.getInt32(0);
			threadtitle = statement.getString(1);
			ignoredThreads[threadid] = threadtitle;
		}
		return ignoredThreads;
	},

	// Returns an associative array of the starred threads with the thread id as the key
	// and the thread title as the value
	get starList()
	{
		var threadid, threadtitle, starredThreads = new Array();
		var statement = this.database.createStatement("SELECT `id`, `title` FROM `threaddata` WHERE `star` = 1");
		while (statement.executeStep())
		{
			threadid = statement.getInt32(0);
			threadtitle = statement.getString(1);
			starredThreads[threadid] = threadtitle;
		}
		return starredThreads;
	},

	// Returns an associative array of thread icons with the filename as the key and the icon num as the value
	get iconList()
	{
		var iconnum, filename, threadIcons = new Array();
		var statement = this.database.createStatement("SELECT `iconnumber`, `filename` FROM `posticons`");
		while (statement.executeStep())
		{
			iconnum = statement.getInt32(0);
			filename = statement.getString(1);
			threadIcons[filename] = iconnum;
		}
		return threadIcons;
	},

	// Returns an associative array of the mods with their userid as the key and name as the value
	get modList()
	{
		var userid, username, mods = new Array();
		var statement = this.database.createStatement("SELECT `userid`, `username` FROM `userdata` WHERE `mod` = 1");
		while (statement.executeStep())
		{
			userid = statement.getInt32(0);
			username = statement.getString(1);
			mods[userid] = username;
		}
		return mods;
	},

	// Returns an associative array of the admins with their userid as the key and name as the value
	get adminList()
	{
		var userid, username, admins = new Array();
		var statement = this.database.createStatement("SELECT `userid`, `username` FROM `userdata` WHERE `admin` = 1");
		while (statement.executeStep())
		{
			userid = statement.getInt32(0);
			username = statement.getString(1);
			admins[userid] = username;
		}
		return admins;
	},

	// Return a string that contains CSS instructions for our settings
	get generateDynamicCSS()
	{
		var CSSFile = '';
		if (!this.getPreference('dontHighlightPosts'))
		{
			// These are for in thread coloring
			CSSFile += 'table.post tr.seen1 td { background-color:';
			CSSFile += this.getPreference('seenPostLight');
			CSSFile += ' !important; }\n';
			CSSFile += 'table.post tr.seen2 td { background-color:';
			CSSFile += this.getPreference('seenPostDark');
			CSSFile += ' !important; }\n';
		}
		if (!this.getPreference('dontHighlightThreads'))
		{
			CSSFile += 'tr.thread.seen td { background-color:';
			CSSFile += this.getPreference('readLight');
			CSSFile += ' !important; }\n';
			CSSFile += 'tr.thread.seen td.icon, tr.thread.seen td.author,';
			CSSFile += 'tr.thread.seen td.views, tr.thread.seen td.lastpost { background-color:';
			CSSFile += this.getPreference('readDark');
			CSSFile += ' !important; }\n';
			CSSFile += 'tr.thread.category0 td { background-color:';
			CSSFile += this.getPreference('readLight');
			CSSFile += ' !important; }\n';
			CSSFile += 'tr.thread.category0 td.icon, tr.thread.category0 td.author,';
			CSSFile += 'tr.thread.category0 td.views, tr.thread.category0 td.lastpost { background-color:';
			CSSFile += this.getPreference('readDark');
			CSSFile += ' !important; }\n';
			CSSFile += 'tr.thread.seen.newposts td { background-color:';
			CSSFile += this.getPreference('readWithNewLight');
			CSSFile += ' !important; }\n';
			CSSFile += 'tr.thread.seen.newposts td.icon, tr.thread.seen.newposts td.author,';
			CSSFile += 'tr.thread.seen.newposts td.views, tr.thread.seen.newposts td.lastpost { background-color:';
			CSSFile += this.getPreference('readWithNewDark');
			CSSFile += ' !important; }\n';
		}
		if (!this.getPreference('disableGradients'))
		{
			CSSFile += '#forum tr.thread.seen td, #forum tr.thread.category0 td, ';
			CSSFile += '#forum tr.thread.category1 td, #forum tr.thread.category2 td {';
			CSSFile += 'background-image:url("chrome://salastread/skin/gradient.png") !important;';
			CSSFile += 'background-repeat:repeat-x !important;';
			CSSFile += 'background-position:center left !important;}\n';
		}
		if (this.getPreference('showUnvisitIcon') && this.getPreference('showGoToLastIcon'))
		{
			CSSFile += 'td.title div.lastseen {';
			CSSFile += 'border:0 !important;';
			CSSFile += 'background:none !important;';
			CSSFile += '}\n';
		}
		if (this.getPreference('showUnvisitIcon'))
		{
			CSSFile += '#forum td.title div.lastseen a.x {';
			CSSFile += 'background:url(';
			CSSFile += this.getPreference("markThreadUnvisited");
			CSSFile += ') no-repeat center center !important;';
			CSSFile += 'text-indent:-9000px !important;';
			CSSFile += 'width:22px !important;';
			CSSFile += 'height:22px !important;';
			CSSFile += 'padding:0 !important;';
			CSSFile += '}\n';
		}
		if (this.getPreference('showGoToLastIcon'))
		{
			CSSFile += '#forum td.title div.lastseen a.count {';
			CSSFile += 'background:url(';
			CSSFile += this.getPreference("goToLastReadPost");
			CSSFile += ') no-repeat center center !important;';
			CSSFile += 'width:22px !important;';
			CSSFile += 'height:22px !important;';
			CSSFile += 'border:none !important;';
			CSSFile += 'padding:0 !important;';
			CSSFile += '}\n';
		} else if (!this.getPreference("disableNewReCount"))
		{
			CSSFile += '#forum td.title div.lastseen a.count {';
			CSSFile += 'height:12px !important;';
			CSSFile += '}\n';
		}
		if (this.getPreference('highlightQuotes'))
		{
			var selfColor = 0;
			var quotedColor = this.getPreference("highlightQuotePost");
			var selfDetails = this.isUsernameColored(this.getPreference('username'));

			// I may have given my posts a custom background
			if (selfDetails)
			{
				selfColor = selfDetails.background;
			}

			// But override it if I have a custom color just for my quotes
			if (quotedColor != 0)
			{
				selfColor = quotedColor;
			}

			// Only apply this class if something is actually going to be colored
			if (selfColor != 0)
			{
				CSSFile += 'div.bbc-block.salrQuoteOfSelf {';
				CSSFile += 'background:';
				CSSFile += selfColor;
				CSSFile += '};\n';
			}
		}
		return CSSFile;
	},

	insertDynamicCSS: function(doc, css)
	{
		var stylesheet = doc.createElement("style");
		stylesheet.type = "text/css";
		stylesheet.innerHTML = css;
		doc.getElementsByTagName("head")[0].appendChild(stylesheet);
	},

	// Retrieves all the data on a given thread id including any
	// @param: (int) thread id
	// @return: (array)
	getThreadDetails: function(threadid)
	{
		var results = new Array();
		var statement = this.database.createStatement("SELECT t.`title`, t.`posted`, t.`ignore`, t.`star`, t.`options`, u.`username`, u.`mod`, u.`admin`, u.`color`, u.`background`, u.`status` FROM `threaddata` AS t LEFT JOIN `userdata` AS u ON t.`op` = u.`userid` WHERE t.`id` = ?1");
		statement.bindInt32Parameter(0,threadid);
		if (statement.executeStep())
		{
			results['threadid'] = threadid;
			for (var i=0;i<statement.numEntries;i++)
			{
				results[statement.getColumnName(i)] = statement.getString(i);
				if (results[statement.getColumnName(i)] == "0" || results[statement.getColumnName(i)] == null)
				{
					results[statement.getColumnName(i)] = false;
				}
				if (results[statement.getColumnName(i)] == "1")
				{
					results[statement.getColumnName(i)] = true;
				}
			}
			/*
			results['lastpostid']
			results['lastviewdt']
			results['op']
			results['title']
			results['lastreplyct']
			results['posted']
			results['ignore']
			results['star']
			results['options']
			results['username']
			results['mod']
			results['admin']
			results['color']
			results['background']
			results['status']
			*/
			statement.reset();
			return results;
		}
		else
		{
			statement.reset();
			return false;
		}
	},

	// Returns the value at the given preference from the branch in the preference property
	// @param: (string) Preference name
	// @return: (boolean, string or int) Preference value or NULL if not found
	getPreference: function(prefName)
	{
		var prefValue, prefType = this.preferences.getPrefType(prefName);
		switch (prefType)
		{
			case this.preferences.PREF_BOOL:
				prefValue = this.preferences.getBoolPref(prefName);
				break;
			case this.preferences.PREF_INT:
				prefValue = this.preferences.getIntPref(prefName);
				break;
			case this.preferences.PREF_STRING:
				prefValue = this.preferences.getCharPref(prefName);
				break;
			case this.preferences.PREF_INVALID:
			default:
				prefValue = null;
		}
		return prefValue;
	},

	// Set the given preference to the given value in the branch in the preference property
	// @param: (string) Preference name, (boolean, string or int) Preference value
	// @return: (boolean) Success in updating preference
	setPreference: function(prefName, prefValue)
	{
		var success = true, prefType = this.preferences.getPrefType(prefName);
		switch (prefType)
		{
			case this.preferences.PREF_BOOL:
				prefValue = this.preferences.setBoolPref(prefName, prefValue);
				break;
			case this.preferences.PREF_INT:
				prefValue = this.preferences.setIntPref(prefName, prefValue);
				break;
			case this.preferences.PREF_STRING:
				prefValue = this.preferences.setCharPref(prefName, prefValue);
				break;
			case this.preferences.PREF_INVALID:
			default:
				success = false;
		}
		return success;
	},

	// Updates the OP UID in the database
	// @param: (int) Thread ID #, (int) User ID # of Original Poster
	// @return: nothing
	StoreOPData: function(threadid, userid)
	{
		var statement = this.database.createStatement("UPDATE `threaddata` SET `op` = ?1 WHERE `id` = ?2");
		statement.bindInt32Parameter(0,userid);
		statement.bindInt32Parameter(1,threadid);
		statement.execute();
	},

	// Retrieve the OP UID from the database
	// @param: (int) Thread ID #
	// @return: (int) User ID # of Original Poster; or (boolean) false if not found in database
	GetOPFromData: function(threadid)
	{
		var userid;
		var statement = this.database.createStatement("SELECT `op` FROM `threaddata` WHERE `id` = ?1");
		statement.bindInt32Parameter(0,threadid);
		if (statement.executeStep())
		{
			userid = statement.getInt32(0);
		}
		else
		{
			userid = false;
		}
		statement.reset();
		return userid;
	},

	// Returns the last version ran
	// @param: nothing
	// @return: (string) Version number, 0.0.0 if no last run version
	get LastRunVersion()
	{
		// Check to see if they have a value stored in the old location
		var prefType = this.pref.getPrefType("salastread.lastRunVersion");
		if (prefType != this.pref.PREF_INVALID)
		{
			this.LastRunVersion = this.pref.getCharPref("salastread.lastRunVersion");
			this.pref.deleteBranch("salastread.lastRunVersion");
		}
		prefType = this.preferences.getPrefType("lastRunVersion");
		if (prefType == this.preferences.PREF_INVALID)
		{
			var lrver = "0.0.0";
		}
		else
		{
			var lrver = this.getPreference("lastRunVersion");
		}
		return lrver;
	},

	// Sets the last version ran
	// @param: (string) Version number
	// @return: nothing
	set LastRunVersion(ver)
	{
		if (!this.setPreference("lastRunVersion", ver))
		{
			this.preferences.setCharPref("lastRunVersion", ver);
		}
	},

	// Saves the time spent on the forums so far and flags to save in another 60 seconds
	// @param: nothing
	// @return: nothing
	SaveTimerValue: function()
	{
		if (this._TimerValueLoaded)
		{
			// Check to see if they have a value stored in the old location
			var prefType = this.pref.getPrefType("salastread.int.timeSpentOnForums");
			if (prefType != this.pref.PREF_INVALID)
			{
				this._TimerValue = this.pref.getIntPref("salastread.int.timeSpentOnForums");
				this.pref.deleteBranch("salastread.int.timeSpentOnForums");
			}
			this.setPreference("timeSpentOnForums", this._TimerValue);
		}
		this._TimerValueSaveAt = this._TimerValue + 60;
	},

	// If the build value is 6 digits (a date), then it's a development build
	// @param: nothing
	// @return: (boolean) true if development build, false otherwise
	get IsDevelopmentRelease()
	{
		var isDev = false;
		var ver = this.getPreference("currentVersion");
		var vm = ver.match(/^(\d+)\.(\d+)\.(\d+)/);
		if (vm)
		{
			var build = vm[3];
			isDev = (build.length == 6);
		}
		return isDev;
	},

	// Returns the build number (third value in a.b.c)
	// @param: nothing
	// @return: (int) 6 digit build date
	get buildNumber()
	{
		var isDev = false;
		var ver = this.getPreference("currentVersion");
		var vm = ver.match(/^(\d+)\.(\d+)\.(\d+)/);
		if (vm)
		{
			var build = parseInt(vm[3], 10);
		}
		else
		{
			var build = "0";
		}
		return build;
	},

	// Fills the user data cache from the database
	// @param: nothing
	// @return: nothing
	populateUserDataCache: function()
	{
		var statement = this.database.createStatement("SELECT `userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar` FROM `userdata`");
		var userid;
		while (statement.executeStep())
		{
			userid = statement.getInt32(0);
			this.userDataCache[userid] = {};
			this.userDataCache[userid].userid = userid;
			this.userDataCache[userid].username = statement.getString(1);
			this.userDataCache[userid].mod = statement.getInt32(2);
			this.userDataCache[userid].admin = statement.getInt32(3);
			this.userDataCache[userid].color = statement.getString(4);
			this.userDataCache[userid].background = statement.getString(5);
			this.userDataCache[userid].status = statement.getInt32(6);
			this.userDataCache[userid].notes = statement.getString(7);
			this.userDataCache[userid].ignored = statement.getInt32(8);
			this.userDataCache[userid].hideavatar = statement.getInt32(9);
		}
		statement.reset();
	},

	// Gets a username from the DB
	// @param: (int) User ID
	// @return: (string) username or (null) if not found
	getUserName: function(userid)
	{
		var username;
		if (this.userDataCache[userid] != undefined)
		{
			username = this.userDataCache[userid].username;
		}
		else
		{
			username = null;
		}
		return username;
	},

	// Gets an id from the DB
	// @param: (string) Username
	// @return: (int) User ID or (null) if not found
	getUserId: function(username)
	{
		var userid;
		if (this.userIDCache[username] != undefined)
		{
			userid = this.userIDCache[username];
		}
		else
		{
			userid = null;
		}
		return userid;
	},

	// Updates a user's name in the DB
	// @param: (int) User ID, (string) Username
	// @return: nothing
	setUserName: function(userid, username)
	{
		this.userIDCache[username] = userid;
		if (this.userDataCache[userid].username != username)
		{
			this.userDataCache[userid].username = username;
			var statement = this.database.createStatement("UPDATE `userdata` SET `username` = ?1 WHERE `userid` = ?2");
			statement.bindStringParameter(0, username);
			statement.bindInt32Parameter(1, userid);
			statement.execute();
		}
	},

	// Checks to see if the DB already knows about a user
	// @param: (int) User ID
	// @return: (bool) if user is in DB
	userExists: function(userid)
	{
		return (this.userDataCache[userid] != undefined);
	},

	// Adds a user to the DB
	// @param: (int) User ID
	// @return: nothing
	addUser: function(userid, username)
	{
		if (!this.userExists(userid))
		{
			if (username == undefined)
			{
				username = null;
			}
			this.userDataCache[userid] = {};
			this.userDataCache[userid].userid = userid;
			this.userDataCache[userid].username = username;
			this.userDataCache[userid].mod = false;
			this.userDataCache[userid].admin = false;
			this.userDataCache[userid].color = 0;
			this.userDataCache[userid].background = 0;
			this.userDataCache[userid].status = 0;
			this.userDataCache[userid].notes = null;
			this.userDataCache[userid].ignored = false;
			this.userDataCache[userid].hideavatar = false;
			var statement = this.database.createStatement("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES (?1, ?2, 0, 0, 0, 0, 0, null, 0, 0)");
			statement.bindInt32Parameter(0, userid);
			statement.bindStringParameter(1, username);
			statement.execute();
			if (username != null)
			{
				this.userIDCache[username] = userid;
			}
		}
	},

	// Adds/updates a user as a mod
	// @param: (int) User ID, (string) Username
	// @return: nothing
	addMod: function(userid, username)
	{
		if (!this.isMod(userid))
		{
			var statement = this.database.createStatement("UPDATE `userdata` SET `username` = ?1, `mod` = 1 WHERE `userid` = ?2");
			statement.bindStringParameter(0,username);
			statement.bindInt32Parameter(1,userid);
			if (!statement.executeStep())
			{
				statement.reset();
				this.addUser(userid, username);
				this.addMod(userid, username);
			}
			this.userDataCache[userid].mod = true;
			statement.reset();
		}
	},

	// Remove a user as a mod
	// @param: (int) User ID
	// @return: nothing
	removeMod: function(userid)
	{
		if (this.isMod(userid))
		{
			this.userDataCache[userid].mod = false;
			var statement = this.database.createStatement("UPDATE `userdata` SET `mod` = 0 WHERE `userid` = ?1");
			statement.bindInt32Parameter(0, userid);
			statement.executeStep();
			statement.reset();
		}
	},

	// Adds/updates a user as an admin
	// @param: (int) User ID, (string) Username
	// @return: nothing
	addAdmin: function(userid, username)
	{
		if (!this.isAdmin(userid))
		{
			var statement = this.database.createStatement("UPDATE `userdata` SET `username` = ?1, `admin` = 1 WHERE `userid` = ?2");
			statement.bindStringParameter(0,username);
			statement.bindInt32Parameter(1,userid);
			if (!statement.executeStep())
			{
				statement.reset();
				this.addUser(userid, username);
				this.addAdmin(userid, username);
			}
			this.userDataCache[userid].admin = true;
			statement.reset();
		}
	},

	// Removed a user as a admin
	// @param: (int) User ID
	// @return: nothing
	removeAdmin: function(userid)
	{
		if (this.isAdmin(userid))
		{
			this.userDataCache[userid].admin = false;
			var statement = this.database.createStatement("UPDATE `userdata` SET `admin` = 0 WHERE `userid` = ?1");
			statement.bindInt32Parameter(0, userid);
			statement.executeStep();
			statement.reset();
		}
	},

	// Toggle whether a user's avatar is shown or not
	// @param: (int) User ID, (string) Username
	// @return: nothing
	toggleAvatarHidden: function(userid, username)
	{
		var statement;
		if (this.isAvatarHidden(userid))
		{
			statement = this.database.createStatement("UPDATE `userdata` SET `hideavatar` = 0 WHERE `userid` = ?1");
		}
		else
		{
			statement = this.database.createStatement("UPDATE `userdata` SET `hideavatar` = 1 WHERE `userid` = ?1");
		}
		statement.bindInt32Parameter(0, userid);
		if (!statement.executeStep())
		{
			statement.reset();
			this.addUser(userid, username);
			this.toggleAvatarHidden(userid, username);
		}
		this.userDataCache[userid].hideavatar = !this.userDataCache[userid].hideavatar;
		statement.reset();
	},

	// Checks if a user id is flagged as a mod
	// @param: (int) User ID
	// @return: (boolean) Mod or not
	isMod: function(userid)
	{
		return (this.userExists(userid) && this.userDataCache[userid].mod);
	},

	// Checks if a user id is flagged as an admin
	// @param: (int) User ID
	// @return: (boolean) Admin or not
	isAdmin: function(userid)
	{
		return (this.userExists(userid) && this.userDataCache[userid].admin);
	},

	// Checks if a user id is flagged to be ignored
	// @param: (int) User ID
	// @return: (boolean) Ignored or not
	isUserIgnored: function(userid)
	{
		return (this.userExists(userid) && this.userDataCache[userid].ignored);
	},

	// Checks if a user id is flagged to have their avatar hidden
	// @param: (int) User ID
	// @return: (boolean) Hidden or not
	isAvatarHidden: function(userid)
	{
		return (this.userExists(userid) && this.userDataCache[userid].hideavatar);
	},

	// Try to figure out the current forum we're in
	// @param: (document) The current page being viewed
	// @return: (int) Forum ID, or (bool) false if unable to determine
	getForumID: function(doc)
	{
		var fid = 0;

		while (true) // Not actually going to loop, I just want to be able to break out
		{
			// Look in the location bar
			var intitle = doc.location.href.match(/forumid=(\d+)/i);
			if (intitle)
			{
				fid = parseInt(intitle[1],10);
				if (!isNaN(fid)) break;
			}

			// Look in the link for the post button
			var postbutton = this.selectSingleNode(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'forumid=')]");
			if (postbutton)
			{
				var inpostbutton = postbutton.href.match(/forumid=(\d+)/i);
				if (inpostbutton)
				{
					fid = parseInt(inpostbutton[1],10);
					if (!isNaN(fid)) break;
				}
			}

			// Look in the hash added to urls
			var inhash = doc.location.hash.match(/forum(\d+)/i);
			if (inhash)
			{
				fid = parseInt(inhash[1],10);
				if (!isNaN(fid)) break;
			}

			break;
		}

		if (fid == 0 || isNaN(fid))
		{
			fid = false;
		}
		return fid;
	},

	// Try to figure out the current thread we're in
	// @param: (document) The current page being viewed
	// @return: (int) Thread ID, or (bool) false if unable to determine
	getThreadID: function(doc)
	{
		var tid = 0;

		while (true) // Not actually going to loop, I just want to be able to break out
		{
			// Look in the location bar
			var intitle = doc.location.href.match(/threadid=(\d+)/i);
			if (intitle)
			{
				tid = parseInt(intitle[1],10);
				if (!isNaN(tid)) break;
			}

			// Look in the ? Link in the first post
			var filterlink = this.selectSingleNode(doc, doc, "//TD[contains(@class,'postdate')]//A[contains(@href,'threadid=')]");
			if (filterlink)
			{
				var inlink = filterlink.href.match(/threadid=(\d+)/i);
				if (inlink)
				{
					tid = parseInt(inlink[1],10);
					if (!isNaN(tid)) break;
				}
			}

			// Look in the link for the reply button
			var replybutton = this.selectSingleNode(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'threadid=')]");
			if (replybutton)
			{
				var inreplybutton = replybutton.href.match(/threadid=(\d+)/i);
				if (inreplybutton)
				{
					tid = parseInt(inreplybutton[1],10);
					if (!isNaN(tid)) break;
				}
			}

			// Look in the hash added to urls
			var inhash = doc.location.hash.match(/thread(\d+)/i);
			if (inhash)
			{
				tid = parseInt(inhash[1],10);
				if (!isNaN(tid)) break;
			}

			break;
		}

		if (tid == 0 || isNaN(tid))
		{
			tid = false;
		}
		return tid;
	},

	// Fetches the total post count as of the last time the thread was read
	// @param: (int) Thread ID
	// @returns: (int) Post count
	getLastReadPostCount: function(threadid)
	{
		var lrcount;
		var statement = this.database.createStatement("SELECT `lastreplyct` FROM `threaddata` WHERE `id` = ?1");
		statement.bindInt32Parameter(0,threadid);
		if (statement.executeStep())
		{
			lrcount = statement.getInt32(0);
			if (lrcount < 0) // Incase it's null
			{
				lrcount = -1;
			}
		}
		else
		{
			lrcount = -1;
		}
		statement.reset();
		return lrcount;
	},

	// Puts the count of posts in a thread read into the database
	// @param: (int) Thread ID, (int) Total number of posts read, (bool) Force an Update
	// @return: (bool) did the call succeed?
	setLastReadPostCount: function(threadid, lrcount, forceUpdate)
	{
		var result = false;
		if (lrcount > this.getLastReadPostCount(threadid) || (forceUpdate != undefined && forceUpdate == true))
		{
			var statement = this.database.createStatement("UPDATE `threaddata` SET `lastreplyct` = ?1 WHERE `id` = ?2");
				statement.bindInt32Parameter(0,lrcount);
				statement.bindInt32Parameter(1,threadid);
			if (statement.executeStep())
			{
				var result = true;
			}
			statement.reset();
		}
		return result;
	},

	// checks to see if the userid has any custom coloring defined
	// @param: (int) User Id
	// @returns: (object) Object contained userid and username
	isUserIdColored: function(userid)
	{
		var user = false;
		if (this.userExists(userid))
		{
			user = {};
			user.userid = userid;
			user.username = this.userDataCache[userid].username;
			user.color = this.userDataCache[userid].color;
			user.background = this.userDataCache[userid].background;
		}
		return user;
	},

	// checks to see if the username has any custom coloring defined
	// @param: (string) Username
	// @returns: (object) Object contained userid and username
	isUsernameColored: function(username)
	{
		var user = false;
		var userid = this.getUserId(username);
		if (this.userExists(userid))
		{
			user = {};
			user.userid = userid;
			user.username = username;
			user.color = this.userDataCache[userid].color;
			user.background = this.userDataCache[userid].background;
		}
		return user;
	},

	// Fetches all users that have custom colors or a note defined
	// @param: nothing
	// @returns: array of user ids
	getCustomizedPosters : function()
	{
		var users = [];
		for each (userData in this.userDataCache)
		{
			if (userData.color != '0' || userData.background != '0' || (userData.notes != '' && userData.notes != null))
			{
				var user = {};
				user.userid = userData.userid;
				user.username = userData.username;
				users.push(user);
			}
		}
		return users;
	},

	// Fetches the user's color code from the database
	// @param: (int) User ID
	// @returns: (string) Hex Colorcode to color user, or (bool) false if not found
	getPosterColor: function(userid)
	{
		var usercolor = false;
		if(this.userExists(userid))
		{
			var statement = this.database.createStatement("SELECT `color` FROM `userdata` WHERE `userid` = ?1");
				statement.bindInt32Parameter(0,userid);
			if (statement.executeStep())
			{
				usercolor = statement.getString(0);
			}
			statement.reset();
		}

		return usercolor;
	},

	// Sets the foreground color for a user
	// @param: (int) User ID, (string) HTML Color code
	// @returns: nothing
	setPosterColor : function(userid, color)
	{
		if(this.userExists(userid))
		{
			var statement = this.database.createStatement("UPDATE `userdata` SET `color` = ?1 WHERE `userid` = ?2");
				statement.bindStringParameter(0, color);
				statement.bindInt32Parameter(1, userid);
				statement.execute();
		}
	},

	// Fetches the user's background color code from the database
	// @param: (int) User ID
	// @returns: (string) Hex Colorcode to color user, or (bool) false if not found
	getPosterBackground: function(userid)
	{
		var userbgcolor = false;
		if(this.userExists(userid))
		{
			var statement = this.database.createStatement("SELECT `background` FROM `userdata` WHERE `userid` = ?1");
				statement.bindInt32Parameter(0,userid);
			if (statement.executeStep())
			{
				userbgcolor = statement.getString(0);
			}
			statement.reset();
		}

		return userbgcolor;
	},

	// Sets the background color for a user
	// @param: (int) User ID, (string) HTML Color code
	// @returns: nothing
	setPosterBackground : function(userid, color)
	{
		if(this.userExists(userid))
		{
			var statement = this.database.createStatement("UPDATE `userdata` SET `background` = ?1 WHERE `userid` = ?2");
				statement.bindStringParameter(0, color);
				statement.bindInt32Parameter(1, userid);
				statement.execute();
		}
	},

	// Fetches the user's notes from the database
	// @param: (int) User ID
	// @returns: (string) Notes about the user, or (bool) false if not found
	getPosterNotes: function(userid)
	{
		var usernotes = false;
		if(this.userExists(userid))
		{
			var statement = this.database.createStatement("SELECT `notes` FROM `userdata` WHERE `userid` = ?1");
				statement.bindInt32Parameter(0,userid);
			if (statement.executeStep())
			{
				usernotes = statement.getString(0);
			}
			statement.reset();
		}
		return usernotes;
	},

	// Sets the notes for that user in the database
	// @param: (int) User ID, (string) Note
	// @return: nothing
	setPosterNotes: function(userid, note)
	{
		if(this.userExists(userid))
		{
				var statement = this.database.createStatement("UPDATE `userdata` SET `notes` = ?1 WHERE `userid` = ?2");
					statement.bindStringParameter(0, note);
					statement.bindInt32Parameter(1, userid);
					statement.execute();
					statement.reset();
		} else {
			this.addUser(userid);
			this.setPosterNotes(userid, note);
		}
	},

	// Get the Post ID of the last read post
	// @param: (int) Thread ID
	// @return: (int) ID of the last read post in the thread
	getLastPostID: function(threadid)
	{
		var lastread;
		var statement = this.database.createStatement("SELECT `lastpostid` FROM `threaddata` WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
		if (statement.executeStep())
		{
			lastread = statement.getString(0);
			if (lastread == null)
			{
				lastread = 0;
			}
		}
		else
		{
			lastread = 0;
		}
		statement.reset();
		return lastread;
	},

	// Sets the Post ID of the last read post
	// @param: (int) Thread ID, (int) Last Post ID, (bool) Force Update
	// @return: (bool) status of update success
	setLastPostID: function(threadid, lastpostid, forceUpdate)
	{
		var result = false;
		if (lastpostid > this.getLastPostID(threadid) || (forceUpdate != undefined && forceUpdate == true))
		{
			var statement = this.database.createStatement("UPDATE `threaddata` SET `lastpostid` = ?1 WHERE `id` = ?2");
				statement.bindStringParameter(0,lastpostid);
				statement.bindInt32Parameter(1,threadid);
			if (statement.executeStep())
			{
				var result = true;
			}
			statement.reset();
		}
		return result;
	},

	// Get the title of the selected thread
	// @param: (int) Thread ID
	// @return: (bool) status of thread title update
	getThreadTitle: function(threadid)
	{
		var title;
		var statement = this.database.createStatement("SELECT `title` FROM `threaddata` WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
		if (statement.executeStep())
		{
			title = statement.getString(0);
			if (title == null)
			{
				title = false;
			}
		}
		else
		{
			title = false;
		}
		statement.reset();
		return title;
	},

	// Stores the thread title in the database
	// @param: (int) Thread ID, (string) Thread Title
	// @return: (bool) update success
	setThreadTitle: function(threadid, title)
	{
		var statement = this.database.createStatement("UPDATE `threaddata` SET `title` = ?1 WHERE `id` = ?2");
			statement.bindStringParameter(0,title);
			statement.bindInt32Parameter(1,threadid);
		if (statement.executeStep())
		{
			var result = true;
		}
		else
		{
			var result = false;
		}
		statement.reset();
		return result;
	},

	// Check the database to see if thread was posted in
	// @param: (int) Thread ID
	// @return: (bool) If user posted in thread or not
	didIPostHere: function(threadid)
	{
		var posted;
		var statement = this.database.createStatement("SELECT `posted` FROM `threaddata` WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
		if (statement.executeStep())
		{
			posted = statement.getInt32(0);
			posted = (posted == true);
		}
		else
		{
			posted = false;
		}
		statement.reset();
		return posted;
	},

	// Flag a thread as being posted in
	// @param: (int) Thread ID
	// @return: nothing
	iPostedHere: function(threadid)
	{
		if (!this.threadIsInDB(threadid))
		{
			// This shouldn't happen, but it's here just incase
			var statement = this.database.createStatement("INSERT INTO `threaddata` (`id`, `posted`, `ignore`, `star`) VALUES (?1, 1, 0, 0)");
				statement.bindInt32Parameter(0,threadid);
				statement.execute();
				statement.reset();
		}
		else
		{
			var statement = this.database.createStatement("UPDATE `threaddata` SET `posted` = 1 WHERE `id` = ?1");
				statement.bindInt32Parameter(0,threadid);
				statement.execute();
				statement.reset();
		}
	},

	// Check to see if the thread is starred
	// @param: (int) Thread ID
	// @return: (bool) thread's star status
	isThreadStarred: function(threadid)
	{
		var starred = false;
		var statement = this.database.createStatement("SELECT `star` FROM `threaddata` WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
		if (statement.executeStep())
		{
			starred = statement.getInt32(0);
			starred = (starred == true);
		}
		statement.reset();
		return starred;
	},

	// Check to see if the thread is ignored
	// @param:
	// @return:
	isThreadIgnored: function(threadid)
	{
		var statement = this.database.createStatement("SELECT `ignore` FROM `threaddata` WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
		if (statement.executeStep())
		{
			var ignored = statement.getInt32(0);
			ignored = (ignored == true);
		}
		else
		{
			var ignored = false;
		}
		statement.reset();
		return ignored;
	},

	// Toggles a thread's starred status in the database
	// @param: (int) thread id, bool
	// @return: nothing
	toggleThreadStar: function(threadid)
	{
		var lastviewdt = this.currentTimeStamp;
		if (this.threadIsInDB(threadid))
		{
			var statement = this.database.createStatement("UPDATE `threaddata` SET `star` = not(`star`) WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
			statement.executeStep();
			statement.reset();
		}
		else
		{
			var statement = this.database.createStatement("INSERT INTO `threaddata` (`id`, `lastviewdt`, `posted`, `ignore`, `star`) VALUES (?1, ?2, 0, 0, 1)");
			statement.bindInt32Parameter(0,threadid);
			statement.bindStringParameter(1,lastviewdt);
			statement.execute();
			statement.reset();
		}
	},

	// Toggles a thread's ignored status in the database
	// @param: (int) thread id, bool
	// @return: nothing
	toggleThreadIgnore: function(threadid)
	{
		var lastviewdt = this.currentTimeStamp;
		if (this.threadIsInDB(threadid))
		{
	//		if(this.getLastReadPostCount(threadid)) {
				var statement = this.database.createStatement("UPDATE `threaddata` SET `ignore` = not(`ignore`) WHERE `id` = ?1");
					statement.bindInt32Parameter(0,threadid);
					statement.execute();
					statement.reset();
	//		}
	//		else
	//		{
	//			this.removeThread(threadid);
	//		}
		}
		else
		{
			var statement = this.database.createStatement("INSERT INTO `threaddata` (`id`, `lastviewdt`, `posted`, `ignore`, `star`) VALUES (?1, ?2, 0, 1, 0)");
			statement.bindInt32Parameter(0,threadid);
			statement.bindStringParameter(1,lastviewdt);
			statement.execute();
			statement.reset();
		}
	},

	// Removes a thread from the database
	// @param: (int) Thread ID
	// @return: (booler) true on success, false on failure
	removeThread: function(threadId)
	{
		var statement = this.database.createStatement("DELETE FROM `threaddata` WHERE `id` = ?1");
		statement.bindInt32Parameter(0,threadId);
		if (statement.executeStep())
		{
			var result = true;
		}
		else
		{
			var result = false;
		}
		statement.reset();
		return result;
	},

	// Adds a thread id # to the database and the current time stamp
	// @param:
	// @return:
	iAmReadingThis: function(threadid)
	{
		var lastviewdt = this.currentTimeStamp;
		if (this.threadIsInDB(threadid))
		{
			var statement = this.database.createStatement("UPDATE `threaddata` SET `lastviewdt` = ?1 WHERE `id` = ?2");
			statement.bindStringParameter(0,lastviewdt);
			statement.bindInt32Parameter(1,threadid);
			statement.execute();
			statement.reset();
		}
		else
		{
			var statement = this.database.createStatement("INSERT INTO `threaddata` (`id`, `lastviewdt`, `posted`, `ignore`, `star`) VALUES (?1, ?2, 0, 0, 0)");
			statement.bindInt32Parameter(0,threadid);
			statement.bindStringParameter(1,lastviewdt);
			statement.execute();
			statement.reset();
		}
	},

	// Checks if a thread id # is in the database
	// @param:
	// @return:
	threadIsInDB: function(threadid)
	{
		var statement = this.database.createStatement("SELECT `id` FROM `threaddata` WHERE `id` = ?1");
		statement.bindInt32Parameter(0,threadid);
		if (statement.executeStep())
		{
			var result = true;
		}
		else
		{
			var result = false;
		}
		statement.reset();
		return result;
	},

	// Adds a post icon # and filename to the database
	// @param: (int) Number used in URL, (string) Filename of icon
	// @return: nothing
	addIcon: function(iconNumber, iconFilename)
	{
		if (!this.checkIconNumberExist(iconNumber))
		{
			var statement = this.database.createStatement("INSERT INTO `posticons` (`iconnumber`, `filename`) VALUES (?1, ?2)");
			statement.bindInt32Parameter(0,iconNumber);
			statement.bindStringParameter(1,iconFilename);
			statement.execute();
			statement.reset();
		}
	},

	// Gets the icon number out of the database
	// @param:
	// @return:
	getIconNumber: function(iconFilename)
	{
		var statement = this.database.createStatement("SELECT `iconnumber` FROM `posticons` WHERE `filename` = ?1");
		statement.bindStringParameter(0,iconFilename);
		if (statement.executeStep())
		{
			var result = statement.getInt32(0);
		}
		else
		{
			var result = false;
		}
		statement.reset();
		return result;
	},

	checkIconNumberExist: function(iconNumber)
	{
		var statement = this.database.createStatement("SELECT `iconnumber` FROM `posticons` WHERE `iconnumber` = ?1");
		statement.bindInt32Parameter(0,iconNumber);
		if (statement.executeStep())
		{
			var result = statement.getInt32(0);
		}
		else
		{
			var result = false;
		}
		statement.reset();
		return result;
	},

	// Several little functions to test if we're in a special needs forum
	inFYAD: function(forumid)
	{
		return (forumid == 26 || forumid == 154 || forumid == 115);
	},
	inBYOB: function(forumid)
	{
		return (forumid == 174 || forumid == 176 || forumid == 194);
	},
	inDump: function(forumid)
	{
		return (forumid == 133 || forumid == 163);
	},
	inAskTell: function(forumid)
	{
		return (forumid == 158);
	},
	inGasChamber: function(forumid)
	{
		return (forumid == 25);
	},
	hasNoRatingBox: function(forumid)
	{
		return (forumid == 93 || forumid == 188 || forumid == 61 || forumid == 77 ||
		 forumid == 78 || forumid == 79 || forumid == 115 || forumid == 25);
	},

	// Colors a post based on deatails passed to it
	// @param: (html doc) document, (string) color to use for the post, (int) userid of poster
	// @return: nothing
	colorPost: function(doc, colorToUse, userid)
	{
		if (colorToUse == 0)
		{
			return;
		}
		CSSFile = 'table.salrPostBy'+userid+' td, table.salrPostBy'+userid+' tr.seen1 td, table.salrPostBy'+userid+' tr.seen2 td { background-color:';
		CSSFile += colorToUse;
		CSSFile += ' !important; }\n';
		this.insertDynamicCSS(doc, CSSFile);
	},

	// Colors a quote based on details passed to it
	// @param: (html doc) document, (string) color to use for the post, (int) userid of quoted
	// @return: nothing
	colorQuote: function(doc, colorToUse, userid)
	{
		if (colorToUse == 0)
		{
			return;
		}
		CSSFile = 'div.bbc-block.salrQuoteOf'+userid+' {';
		CSSFile += 'background:';
		CSSFile += colorToUse;
		CSSFile += '};\n';
		this.insertDynamicCSS(doc, CSSFile);
	},


	//gets the unread posts count for a thread using the built in forum data.
	//@param: document object, title box dom element
	//@return: int number of unread posts
	getThreadUnreadPostCount: function ( doc, titleBox )
	{
		var newPostsBox = this.selectSingleNode(doc,titleBox, "div[contains(@class,'newposts')]");
		var retNewPostCount = 0;

		if ( newPostsBox )
		{
			var countElement = this.selectSingleNode(doc,newPostsBox,"a/b");
			try
			{
				retNewPostCount = parseInt(countElement.innerHTML);
			} catch (e) { }
		}

		return retNewPostCount;
	},

	// Inserts the star
	// @param: doc, TD
	// @return: nothing
	insertStar: function(doc, titleBox)
	{
		try
		{
			starIcon = doc.createElement("img");
			starIcon.setAttribute("src", "chrome://salastread/skin/star.png");
			starIcon.style.cssFloat = "left";
			starIcon.style.marginRight = "3px";
			starIcon.style.marginLeft = "3px";
			starIcon.style.border = "none";
			titleBox.insertBefore(starIcon, titleBox.getElementsByTagName('a')[0]);
			starIcon.style.marginTop = ((titleBox.clientHeight - 21) / 2) + "px";
		} catch (e) { }
	},

	// Add the quick page jump paginator
	// @param:
	// @return:
	addPagination: function(doc)
	{
		var pageList = this.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
		pageList = pageList[pageList.length-1];
		var numPages = pageList.innerHTML.match(/\((\d+)\)/);
		var curPage = this.selectSingleNode(doc, doc, "//SPAN[contains(@class,'curpage')]");
		if (pageList.childNodes.length <= 1)
		{
			// There's only one page
			return;
		}
		numPages = parseInt(numPages[1], 10);
		curPage = parseInt(curPage.innerHTML, 10);
		var navDiv = doc.createElement("div");
		navDiv.className = "salastread_pagenavigator";
		var firstButtonImg = doc.createElement("img");
		firstButtonImg.title = "Go to First Page";
		firstButtonImg.src = "chrome://salastread/skin/nav-firstpage.png";
		var prevButtonImg = doc.createElement("img");
		prevButtonImg.title = "Go to Previous Page";
		prevButtonImg.src = "chrome://salastread/skin/nav-prevpage.png";
		if (curPage == 1)
		{
			firstButtonImg.className = "disab";
			navDiv.appendChild(firstButtonImg);
			prevButtonImg.className = "disab";
			navDiv.appendChild(prevButtonImg);
		}
		else
		{
			var firstButton = doc.createElement("a");
			firstButton.href = this.editPageNumIntoURI(doc, "pagenumber=1");
			firstButton.appendChild(firstButtonImg);
			navDiv.appendChild(firstButton);
			var prevButton = doc.createElement("a");
			prevButton.href = this.editPageNumIntoURI(doc, "pagenumber=" + (curPage-1));
			prevButton.appendChild(prevButtonImg);
			navDiv.appendChild(prevButton);
		}
		var pageSel = doc.createElement("select");
		pageSel.size = 1;
		for (var pp=1; pp<=numPages; pp++)
		{
			var topt = doc.createElement("option");
			topt.appendChild(doc.createTextNode(pp));
			topt.value = pp;
			if (pp==curPage) topt.selected = true;
			pageSel.appendChild(topt);
		}
		if (curPage == 1)
		{
			pageSel.onchange = function() { doc.location = doc.baseURI + "&pagenumber="+this.value; };
		}
		else
		{
			pageSel.onchange = function() {
				if (doc.location.pathname == "/showthread.php")
				{
					var threadid = doc.evaluate("//DIV[contains(@class,'pages')]//A[contains(@href,'threadid=')]", doc, null, 9, null).singleNodeValue.href.match(/threadid=(\d+)/i)[1];
					doc.location = doc.location.pathname+"?threadid="+threadid+"&pagenumber="+this.value;
				}
				else
				{
					doc.location = doc.baseURI.replace(/pagenumber=(\d+)/, "pagenumber="+this.value);
				}
			};
		}
		navDiv.appendChild(pageSel);
		var nextButtonImg = doc.createElement("img");
		nextButtonImg.title = "Go to Next Page";
		nextButtonImg.src = "chrome://salastread/skin/nav-nextpage.png";
		var lastButtonImg = doc.createElement("img");
		lastButtonImg.title = "Go to Last Page";
		lastButtonImg.src = "chrome://salastread/skin/nav-lastpage.png";
		if (curPage == numPages)
		{
			nextButtonImg.className = "disab";
			navDiv.appendChild(nextButtonImg);
			lastButtonImg.className = "disab";
			navDiv.appendChild(lastButtonImg);
		}
		else
		{
			var nextButton = doc.createElement("a");
			nextButton.href = this.editPageNumIntoURI(doc, "pagenumber=" + (curPage+1));
			nextButton.appendChild(nextButtonImg);
			navDiv.appendChild(nextButton);
			var lastButton = doc.createElement("a");
			lastButton.href = this.editPageNumIntoURI(doc, "pagenumber=" + numPages);
			lastButton.appendChild(lastButtonImg);
			navDiv.appendChild(lastButton);
		}
		if (doc.location.pathname == "/showthread.php" && this.getPreference("lastPostOnNavigator"))
		{
			var lastButtonImg = doc.createElement("img");
			lastButtonImg.title = "Go to First Unread Post";
			lastButtonImg.src = "chrome://salastread/skin/lastpost.png";
			var lastButton = doc.createElement("a");
			lastButton.href = this.editPageNumIntoURI(doc, "goto=newpost");
			lastButton.appendChild(lastButtonImg);
			navDiv.appendChild(lastButton);
		}
		doc.body.appendChild(navDiv);
	},

	// Helper function for addPagination()
	// @param:
	// @return:
	editPageNumIntoURI: function(doc, replacement)
	{
		var result;
		if (doc.baseURI.search(/pagenumber=(\d+)/) > -1) // Is the pagenumber already in the uri?
		{
			result = doc.baseURI.replace(/pagenumber=(\d+)/, replacement);
			// If we're in showthread, remove the anchor since it's page specific
			if (doc.location.pathname == "/showthread.php")
			{
				result = result.replace(/#.*/, '');
			}
		}
		else
		{
			if (doc.location.hash == "") // If no anchor, just add it to the end
			{
				result = doc.baseURI + "&" + replacement;
			}
			else
			{
				result = doc.location.pathname + doc.location.search + "&" + replacement + doc.location.hash;
				if (doc.location.pathname == "/showthread.php")
				{
					var perpage = this.selectSingleNode(doc, doc, "//DIV[contains(@class,'pages')]//A[contains(@href,'threadid=')]");
					var threadid = perpage.href.match(/threadid=(\d+)/i)[1];
					result = doc.location.pathname + "?threadid=" + threadid + "&" + replacement;
				}
			}
		}
		return result;
	},

	// Convert image/videos links in threads to inline images/videos
	// @param: post body (td), document body
	// @return: nothing
	convertSpecialLinks: function(postbody, doc)
	{
		var newImg, vidIdSearch, vidid, vidsrc, imgNum, imgLink;
		var linksInPost = this.selectNodes(doc, postbody, "descendant::A");
		var maxWidth = this.getPreference("maxWidthOfConvertedImages");
		var maxHeight = this.getPreference("maxHeightOfConvertedImages");
		for (var i in linksInPost)
		{
			var link = linksInPost[i];
			if (this.getPreference("convertTextToImage") &&
				(link.href.search(/\.(gif|jpg|jpeg|png)(#.*)?(%3C\/a%3E)?$/i) > -1))
			{
				// this doesn't actually work yet
				//if ((link.src.search(/imagesocket\.com/i) > -1) && (link.src.search(/content\.imagesocket\.com/i) == -1))
				//{
					//link.src = link.href.replace(/imagesocket/, 'content.imagesocket');
				//}
				if (link.href.search(/paintedover\.com/i) > -1 || // PaintedOver sucks, we can't embed them
					link.href.search(/xs\.to/i) > -1 || // xs.to sucks, we can't embed them
					link.href.search(/imagesocket\.com/i) > -1 || // ImageSocket sucks, we can't embed them
					link.href.search(/imgplace\.com/i) > -1 || // ImageSocket sucks, we can't embed them
					link.href.search(/echo\.cx\/.*\?/) > -1 || // Old school ImageShack links that go to a page
					link.href.search(/wiki(.*)Image/i) > -1 || // Wikipedia does funky stuff with their images too
					link.innerHTML == "") // Quotes have fake links for some reason
				{
					continue;
				}
				if (this.getPreference("dontTextToImageIfMayBeNws") &&
					link.parentNode.innerHTML.search(/(nsfw|nws|nms|t work safe|t safe for work)/i) > -1)
				{
					continue;
				}
				if (this.getPreference("dontTextToImageInSpoilers") &&
					(link.parentNode.className.search(/spoiler/i) > -1 ||
					link.textContent.search(/spoiler/i) > -1))
				{
					continue;
				}
				// Fix Imageshack links that went to a page instead of an image
				if ((link.href.search(/fi\.somethingawful\.com\/is\/img(\d+)\/(\d+)\//) > -1) ||
				 (link.href.search(/fi\.somethingawful\.com\/is\/.*\?loc=img(\d+)/) > -1))
				{
					imgNum = link.href.match(/img(\d+)/)[1];
					link.href = link.href.replace(/fi\.somethingawful\.com\/is/, 'img' + imgNum + '.imageshack.us');
					if (link.parentNode.nodeName == 'IMG')
					{
						link.parentNode.parentNode.replaceChild(link, link.parentNode);
					}
					continue;
				}
				if (link.href.search(/fi\.somethingawful\.com\/is\/.*\?image=/) > -1)
				{
					imgNum = link.getElementsByTagName('img');
					if (imgNum[0])
					{
						imgLink = link.getElementsByTagName('img')[0];
						imgNum = imgLink.src.match(/img(\d+)/)[1];
						link.href = link.href.replace(/fi\.somethingawful\.com\/is/, 'img' + imgNum + '.imageshack.us');
						if ((imgLink.src.search(/fi\.somethingawful\.com\/is\/img(\d+)\/(\d+)\//) > -1) ||
						 (imgLink.src.search(/fi\.somethingawful\.com\/is\/.*\?loc=img(\d+)/) > -1))
						{
							imgNum = imgLink.src.match(/img(\d+)/)[1];
							imgLink.src = imgLink.src.replace(/fi\.somethingawful\.com\/is/, 'img' + imgNum + '.imageshack.us');
						}
					}
					continue;
				}
				// Fix archived thumbnails
				if (link.href.search(/%3C\/a%3E/) > -1)
				{
					link.href = link.href.replace('%3C/a%3E', '');
				}
				if (this.getPreference("dontConvertQuotedImages"))
				{
					// Check if it's in a blockquote
					if (link.parentNode.parentNode.className.search(/bbc-block/i) > -1 ||
						link.parentNode.parentNode.parentNode.className.search(/bbc-block/i) > -1)
					{
						continue;
					}
				}

				newImg = doc.createElement("img");
				newImg.src = link.href;
				newImg.title = "Link converted by SALR";
				newImg.style.border = "1px dashed red";
				// Check if the link was a text link to an image and move the text
				if ((link.firstChild == link.lastChild &&
				 (link.firstChild.tagName && link.firstChild.tagName.search(/img/i) > -1)) ||
				 link.textContent.search(/http:/i) == 0)
				{
					link.textContent = '';
					link.parentNode.replaceChild(newImg, link);
				}
				else
				{
					link.previousSibling.textContent += link.textContent;
					link.textContent = '';
					link.parentNode.replaceChild(newImg, link);
				}
			}
			if (this.getPreference("enableVideoEmbedder") &&
				(link.href.search(/^http\:\/\/(www\.)?youtube\.com\/watch\?v=([-_0-9a-zA-Z]+)/i) > -1 ||
				 link.href.search(/^http\:\/\/video\.google\.c(om|a|o\.uk)\/videoplay\?docid=([-0-9]+)/i) > -1))
			{
				link.style.backgroundColor = this.getPreference("videoEmbedderBG");
				link.addEventListener('click', SALR_vidClick, false);
			}
		}
	},

	// Process images in posts, consolidated into one function for speed
	// @param: body of the post, document body
	// @return: nothing
	processImages: function(postbody, doc)
	{
		var thumbnailAllImages = this.getPreference("thumbnailAllImages");

		if(thumbnailAllImages)
		{
			var maxWidth = this.getPreference("maxWidthOfConvertedImages");
			var maxHeight = this.getPreference("maxHeightOfConvertedImages");

			if(maxHeight)
			{
				maxHeight += "px";
			}

			if(maxWidth)
			{
				maxWidth += "px";
			}
		}

		var images = this.selectNodes(doc, postbody, "//img");
		for(var i in images)
		{
			var image = images[i];

			// Scale all images in the post body to the user-specified size
			if(thumbnailAllImages && image.parentNode.isSameNode(postbody))
			{
				if(!image.src.match(/forumimages\.somethingawful\.com/i))
				{
					if(maxWidth)
					{
						image.style.maxWidth = maxWidth;
					}
					if(maxHeight)
					{
						image.style.maxHeight = maxHeight;
					}

					image.addEventListener("click",
						function()
						{
							if(maxWidth)
							{
								this.style.maxWidth = (this.style.maxWidth == maxWidth) ? "" : maxWidth;
							}
							if(maxHeight)
							{
								this.style.maxHeight = (this.style.maxHeight == maxHeight) ? "" : maxHeight;
							}
						}, false);
				}
			}

			// Set the mouseover text of emoticons to their code
			if (image.src.match(/\.somethingawful\.com\/forumsystem\/emoticons/i))
			{
				var newTitle = image.src.split(/emoticons\//)[1].split(/\./)[0].split(/\-/)[1];
				image.title = ":" + newTitle + ":";
			}
			else if (image.src.match(/\.somethingawful\.com\/images\/smilies/i))
			{
				var newTitle = image.src.split(/smilies\//)[1].split(/\./)[0];
				if (newTitle.search(/^emot\-/) > -1)
				{
					newTitle = newTitle.substr(5);
				}
				image.title = ":" + newTitle + ":";
			}
		}
	},

	// Takes a button and turns it into a quick button
	// @param: (html element) doc, (html element) button, (int) forumid
	// @return: (html element) quick button
	turnIntoQuickButton: function(doc, button, forumid)
	{
		var threadid = undefined, postid = undefined, hasQuote = 0;
		var action = button.href.match(/action=(\w+)/i)[1];
		switch (action)
		{
			case 'newreply':
				if (button.href.match(/threadid=(\d+)/i) != null)
				{
					action = 'reply';
					threadid = button.href.match(/threadid=(\d+)/i)[1];
					break;
				}
				else
				{
					action = 'quote';
				}
			case 'editpost':
				var postid = button.href.match(/postid=(\d+)/i)[1];
				hasQuote = 1;
				break;
			case 'newthread':
				break;
		}
		var oldsrc = button.firstChild.src;
		var oldalt = button.firstChild.alt;
		button.firstChild.style.width = "12px !important";
		button.firstChild.style.height = "20px !important";
		if (this.inBYOB(forumid))
		{
			button.firstChild.src = "chrome://salastread/skin/quickbutton-byob.gif";
		}
		else
		{
			button.firstChild.src = "chrome://salastread/skin/quickbutton.gif";
		}
		button.firstChild.alt = "Normal " + oldalt;
		button.firstChild.title = "Normal " + oldalt;
		var quickbutton = doc.createElement("img");
		quickbutton.src = oldsrc;
		quickbutton.alt = "Quick " + oldalt;
		quickbutton.title = "Quick " + oldalt;
		quickbutton.border = "0"
		quickbutton.style.cursor = "pointer";
		quickbutton.SALR_threadid = threadid;
		quickbutton.__salastread_threadid = threadid;
		if (action == 'newthread')
		{
			quickbutton.SALR_forumid = forumid;
		}
		else
		{
			quickbutton.SALR_forumid = undefined;
		}
/*		quickbutton.__salastread_postid = postid; // set if quote or edit
		//quickbutton.__salastread_postername = postername; // set if quote or edit?
		quickbutton.__salastread_hasQuote = hasQuote; // 1 if quote or edit
*/
		button.parentNode.insertBefore(quickbutton, button);
		return quickbutton;
	},

	expireThreads: function()
	{
		var expireLength = this.getPreference("expireMinAge") * 86400; // days * 24 * 60 * 60
		var rightNow = this.currentTimeStamp;
		var expireWhen = rightNow - expireLength;
		var statement = this.database.createStatement("DELETE FROM `threaddata` WHERE `lastviewdt` < ?1 AND `star` != 1 AND `ignore` != 1");
		statement.bindStringParameter(0,expireWhen);
		statement.execute();
	},

	prepopulateDB: function(dbtable)
	{
		switch (dbtable)
		{
			case "userdata":
				this.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('81482', 'duz', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
				this.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('33775', 'Tivac', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
				this.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('35205', 'RedKazan', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
				this.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('20065', 'biznatchio', 0, 0, '#4400bb', 0, 0, 'SALR Creator', 0, 0)");
				break;
		}
	},

	// Toggles the visibility of something
	// @param: element, (bool) display inline?
	// @return: nothing
	toggleVisibility: function(element,inline)
	{
		if (element.style.visibility == "hidden" && element.style.display == "none")
		{
			element.style.visibility = "visible";
			if (inline)
			{
				element.style.display = "inline";
			}
			else
			{
				element.style.display = "";
			}
		}
		else
		{
			element.style.visibility = "hidden";
			element.style.display = "none";
		}
	}

	// Don't forget the trailing comma when adding a new function/property
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
