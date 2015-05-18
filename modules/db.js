/*

	Everything to do with our database/caches/forumlist

*/

Cu.import("resource://gre/modules/Services.jsm");
let {Prefs} = require("prefs");
let {Utils} = require("utils");

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
	// TODO: Do we really need read and write flags for ReadFile?
	is.init(file, 0x01, 0x04, null);
	var sis = Components.classes["@mozilla.org/scriptableinputstream;1"]
				.createInstance(Components.interfaces.nsIScriptableInputStream);
	sis.init(is);
	return sis.read( sis.available() );
}

function SaveFile(fn, fdata)
{
	Utils.logToConsole("fn: " + fn);
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

let DB = exports.DB =
{
	needToShowChangeLog: false,
	init: function()
	{
		// Load relevant databases
		this.ProfileInit();

		// Check if we need some SQL patches
		if (this.LastRunVersion != this.SALRversion)
		{
			//this.needToShowChangeLog = !this.IsDevelopmentRelease;
			this.needToShowChangeLog = true;
			// Here we have to put special cases for specific dev build numbers that require SQL Patches
			var buildNum = parseInt(this.LastRunVersion.match(/^(\d+)\.(\d+)\.(\d+)/)[3], 10);
			this.checkForSQLPatches(buildNum);
		}

		// Fill up the cache
		DB.populateDataCaches();

		DB.LastRunVersion = DB.SALRversion;
	},

	_profileInitialized: false,
	_dbfn: null,
	_flfn: null,
	ProfileInit: function()
	{
		if (this._profileInitialized) {
			return;
		}
		this._profileInitialized = true;

		try
		{
			DB._dbfn = this.getFilePath(Prefs.getPref('databaseStoragePath'));
			DB._flfn = this.getFilePath(Prefs.getPref('forumListStoragePath'));
//Utils.logToConsole("SALR Initializing Profile:\ndb: " + DB._dbfn + "\nfl: " + DB._flfn);

			DB.LoadForumListXML();

		} catch (e) {
			this._starterr = e + "\nLine: " + e.lineNumber;
		}
	},

	getFilePath: function(fileName)
	{
		if (fileName.indexOf("%profile%") === 0)
		{
			fileName = fileName.substring(9);
			let path = Services.dirsvc.get('ProfD', Ci.nsIFile);
			if (fileName)
			{
				path.append(fileName);
				return path.path;
			}
			else
				return null;
		}
		else
			return fileName;
	},

	gettingForumList: false, // Will use this to defer
	gotForumList: false,
	_forumListXml: null,
	_xmlDoc: null,

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
		if (value != null)
		{
			this._forumListXml = value;
			let oXmlSer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
							.createInstance(Components.interfaces.nsIDOMSerializer);
			let xmlstr = oXmlSer.serializeToString(this._forumListXml);
			SaveFile(this._flfn, xmlstr);
		}
	},

	SetXML: function(xmlstr)
	{
		let oDomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
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
			let pxml = ReadFile(this._flfn);
			if (typeof(pxml) != "undefined")
			{
				if (pxml) {
					let oDomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
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

	get SALRversion() { return Prefs.getPref("currentVersion"); },

	// Returns the last version ran
	// @param: nothing
	// @return: (string) Version number, 0.0.0 if no last run version
	get LastRunVersion()
	{
		let branch = Components.classes["@mozilla.org/preferences;1"].
			getService(Components.interfaces.nsIPrefService).
			getBranch("extensions.salastread.");
		var lrver;
		var prefType = branch.getPrefType("lastRunVersion");
		if (prefType == branch.PREF_INVALID)
		{
			lrver = "0.0.0";
		}
		else
		{
			lrver = Prefs.getPref("lastRunVersion");
		}
		if (lrver == '')
		{
			lrver = "0.0.0";
		}
		return lrver;
	},

	// Sets the last version ran
	// @param: (string) Version number
	// @return: nothing
	set LastRunVersion(ver)
	{
		// No default pref - has special handling
		if (!Prefs.setPref("lastRunVersion", ver))
		{
			let branch = Components.classes["@mozilla.org/preferences;1"].
				getService(Components.interfaces.nsIPrefService).
				getBranch("extensions.salastread.");
			branch.setCharPref("lastRunVersion", ver);
		}
	},

	// If the build value is 6 digits (a date), then it's a development build
	// @param: nothing
	// @return: (boolean) true if development build, false otherwise
	get IsDevelopmentRelease()
	{
		var isDev = false;
		var ver = Prefs.getPref("currentVersion");
		var vm = ver.match(/^(\d+)\.(\d+)\.(\d+)/);
		if (vm)
		{
			var build = vm[3];
			isDev = (build.length == 6);
		}
		return isDev;
	},

//Unused
	// Returns the build number (third value in a.b.c)
	// @param: nothing
	// @return: (int) 6 digit build date
	get buildNumber()
	{
		var build = 0;
		var ver = Prefs.getPref("currentVersion");
		var vm = ver.match(/^(\d+)\.(\d+)\.(\d+)/);
		if (vm)
		{
			build = parseInt(vm[3], 10);
		}
		return build;
	},

	get storedbFileName() { return this._dbfn; },

	mDBConn: null,
	userDataCache: Array(),
	userIDCache: Array(),
	threadDataCache: Array(),
	iconDataCache: Array(),

	// Return a connection to the database
	// Create database if it doesn't exist yet
	// TODO: Error handling, Improving(?) file handling
	get database()
	{
		if (this.mDBConn != null)
		{
			return this.mDBConn;
		}
		// the connection hasn't been created yet so we'll connect
		var fn = this.storedbFileName;
		var file = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(fn);
		if (file.exists() == false)
		{
			try
			{
				file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);  // Woo! 420!
			}
			catch (ex)
			{
				throw "file.create error ("+ex.name+") on "+fn;
			}
		}
		var storageService = Components.classes["@mozilla.org/storage/service;1"]
			.getService(Components.interfaces.mozIStorageService);
		this.mDBConn = storageService.openDatabase(file);
		if (!this.mDBConn.tableExists("threaddata"))
		{
			this.mDBConn.executeSimpleSQL("CREATE TABLE `threaddata` (id INTEGER PRIMARY KEY, title VARCHAR(161), posted BOOLEAN, ignore BOOLEAN, star BOOLEAN, opview BOOLEAN)");
			this.prepopulateDB("threaddata");
		}
		if (!this.mDBConn.tableExists("userdata"))
		{
			this.mDBConn.executeSimpleSQL("CREATE TABLE `userdata` (userid INTEGER PRIMARY KEY, username VARCHAR(50), mod BOOLEAN, admin BOOLEAN, color VARCHAR(8), background VARCHAR(8), status VARCHAR(8), notes TEXT, ignored BOOLEAN, hideavatar BOOLEAN)");
			this.prepopulateDB("userdata");
		}
		if (!this.mDBConn.tableExists("posticons"))
		{
			this.mDBConn.executeSimpleSQL("CREATE TABLE `posticons` (iconnumber INTEGER PRIMARY KEY, filename VARCHAR(50))");
			this.prepopulateDB("posticons");
		}
		return this.mDBConn;
	},

	// Returns an array of the ignored threads with the thread id as the key and the thread title as the value
	get ignoreList()
	{
		if (this.threadDataCache.length == 0)
		{
			this.populateThreadDataCache();
		}
		var threads = [];
		for each (let threadData in this.threadDataCache)
		{
			if (threadData.ignore == 1)
			{
				threads[threadData.threadid] = threadData.title;
			}
		}
		return threads;
	},

	// Returns an array of the starred threads with the thread id as the key
	// and the thread title as the value
	get starList()
	{
		if (this.threadDataCache.length == 0)
		{
			this.populateThreadDataCache();
		}
		var threads = [];
		for each (let threadData in this.threadDataCache)
		{
			if (threadData.star == 1)
			{
				threads[threadData.threadid] = threadData.title;
			}
		}
		return threads;
	},

// Unused
	// Returns an associative array of thread icons with the filename as the key and the icon num as the value
	get iconList()
	{
		return this.iconDataCache;
	},

	// Calls everything needed to fill the data caches
	populateDataCaches: function()
	{
		try
		{
			this.populateUserDataCache();
		} catch (e) { }
		try
		{
			this.populateThreadDataCache();
		} catch (e) { }
		try
		{
			this.populateIconDataCache();
		} catch (e) { }
	},

	// Fills the user data cache from the database
	// @param: nothing
	// @return: nothing
	populateUserDataCache: function()
	{
		var statement = this.database.createStatement("SELECT `userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar` FROM `userdata`");
		var userid, username;
		while (statement.executeStep())
		{
			userid = statement.getInt32(0);
			username = statement.getString(1);
			this.userDataCache[userid] = {};
			this.userDataCache[userid].userid = userid;
			this.userDataCache[userid].username = username;
			this.userDataCache[userid].mod = statement.getInt32(2);
			this.userDataCache[userid].admin = statement.getInt32(3);
			this.userDataCache[userid].color = statement.getString(4);
			this.userDataCache[userid].background = statement.getString(5);
			this.userDataCache[userid].status = statement.getInt32(6);
			this.userDataCache[userid].notes = statement.getString(7);
			this.userDataCache[userid].ignored = statement.getInt32(8);
			this.userDataCache[userid].hideavatar = statement.getInt32(9);
			this.userIDCache[username] = userid;
		}
		statement.reset();
	},

	// Fills the thread data cache from the database
	// @param: nothing
	// @return: nothing
	populateThreadDataCache: function()
	{
		var statement = this.database.createStatement("SELECT `id`, `title`, `posted`, `ignore`, `star`, `opview` FROM `threaddata`");
		var threadid;
		while (statement.executeStep())
		{
			threadid = statement.getInt32(0);
			this.threadDataCache[threadid] = {};
			this.threadDataCache[threadid].threadid = threadid;
			this.threadDataCache[threadid].title = statement.getString(1);
			this.threadDataCache[threadid].posted = statement.getInt32(2);
			this.threadDataCache[threadid].ignore = statement.getInt32(3);
			this.threadDataCache[threadid].star = statement.getInt32(4);
			this.threadDataCache[threadid].opview = statement.getInt32(5);
		}
		statement.reset();
	},

	// Fills the icon data cache from the database
	// @param: nothing
	// @return: nothing
	populateIconDataCache: function()
	{
		var statement = this.database.createStatement("SELECT `iconnumber`, `filename` FROM `posticons`");
		var iconnumber, filename;
		while (statement.executeStep())
		{
			iconnumber = statement.getInt32(0);
			filename = statement.getString(1);
			this.iconDataCache[iconnumber] = filename;
			this.iconDataCache[filename] = iconnumber;
		}
		statement.reset();
	},

// Unused - if we use this later, add support for forums JSON getting
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

	// Checks to see if the DB already knows about a thread
	// @param: (int) Thread ID
	// @return: (bool) if thread is in DB
	threadExists: function(threadid)
	{
		return (this.threadDataCache[threadid] != undefined);
	},

	// Adds a thread to the DB and cache
	// @param: (int) User ID
	// @return: nothing
	addThread: function(threadid)
	{
		if (!this.threadExists(threadid))
		{
			this.threadDataCache[threadid] = {};
			this.threadDataCache[threadid].threadid = threadid;
			this.threadDataCache[threadid].title = '';
			this.threadDataCache[threadid].posted = 0;
			this.threadDataCache[threadid].ignore = 0;
			this.threadDataCache[threadid].star = 0;
			this.threadDataCache[threadid].opview = 0;
			var statement = this.database.createStatement("INSERT INTO `threaddata` (`id`, `title`, `posted`, `ignore`, `star`, `opview`) VALUES (?1, null, 0, 0, 0, 0)");
			statement.bindInt32Parameter(0, threadid);
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

	// Adds a user to the DB and cache
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
			//This is already below (and done more safely)
			//this.userIDCache[username] = userid;
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
		if (this.isMod(userid))
		{
			// We already know it's a mod
			// ...but we might have to update the username to reflect a name change.
			if (this.userDataCache[userid].username != username)
			{
				this.setUserName(userid, username);
			}
			return;
		}
		if (this.userExists(userid))
		{
			var statement = this.database.createStatement("UPDATE `userdata` SET `username` = ?1, `mod` = 1 WHERE `userid` = ?2");
			statement.bindStringParameter(0,username);
			statement.bindInt32Parameter(1,userid);
			statement.execute();
			this.userDataCache[userid].mod = true;
		}
		else
		{
			this.addUser(userid, username);
			this.addMod(userid, username);
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
		if (this.isAdmin(userid))
		{
			// We already know it's an admin
			// ...but we might have to update the username to reflect a name change.
			if (this.userDataCache[userid].username != username)
			{
				this.setUserName(userid, username);
			}
			return;
		}
		if (this.userExists(userid))
		{
			var statement = this.database.createStatement("UPDATE `userdata` SET `username` = ?1, `admin` = 1 WHERE `userid` = ?2");
			statement.bindStringParameter(0,username);
			statement.bindInt32Parameter(1,userid);
			statement.execute();
			this.userDataCache[userid].admin = true;
		}
		else
		{
			this.addUser(userid, username);
			this.addAdmin(userid, username);
		}
	},

	// Remove a user's admin flag
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

	// Super ignore a user
	addSuperIgnored: function (userid, username)
	{
		if (this.userExists(userid))
		{
			var statement = this.database.createStatement("UPDATE `userdata` SET `username` = ?1, `ignored` = 1 WHERE `userid` = ?2");
			statement.bindStringParameter(0,username);
			statement.bindInt32Parameter(1,userid);
			statement.execute();
			this.userDataCache[userid].ignored = true;
		}
		else
		{
			this.addUser(userid, username);
			this.addSuperIgnored(userid, username);
		}
	},

	// Un-super ignore a user
	removeSuperIgnored: function(userid)
	{
		if (this.isUserIgnored(userid))
		{
			this.userDataCache[userid].ignored = false;
			var statement = this.database.createStatement("UPDATE `userdata` SET `ignored` = 0 WHERE `userid` = ?1");
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
		if (this.userExists(userid))
		{
			var statement = this.database.createStatement("UPDATE `userdata` SET `hideavatar` = not(`hideavatar`) WHERE `userid` = ?1");
			statement.bindInt32Parameter(0, userid);
			statement.execute();
			this.userDataCache[userid].hideavatar = !this.userDataCache[userid].hideavatar;
		}
		else
		{
			this.addUser(userid, username);
			this.toggleAvatarHidden(userid, username);
		}
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
		var userid = this.getUserId(username);
		return this.isUserIdColored(userid);
	},

	// Fetches all users that have custom colors or a note defined
	// @param: nothing
	// @returns: array of user ids
	getCustomizedPosters: function()
	{
		var users = [];
		for each (let userData in this.userDataCache)
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
		return (this.userExists(userid) && this.userDataCache[userid].color);
	},

	// Sets the foreground color for a user
	// @param: (int) User ID, (string) HTML Color code
	// @returns: nothing
	setPosterColor: function(userid, color)
	{
		if (this.userExists(userid))
		{
			if (this.userDataCache[userid].color != color)
			{
				var statement = this.database.createStatement("UPDATE `userdata` SET `color` = ?1 WHERE `userid` = ?2");
				statement.bindStringParameter(0, color);
				statement.bindInt32Parameter(1, userid);
				statement.execute();
				this.userDataCache[userid].color = color;
			}
		}
		else
		{
			this.addUser(userid);
			this.setPosterColor(userid, color);
		}
	},

	// Fetches the user's background color code from the database
	// @param: (int) User ID
	// @returns: (string) Hex Colorcode to color user, or (bool) false if not found
	getPosterBackground: function(userid)
	{
		return (this.userExists(userid) && this.userDataCache[userid].background);
	},

	// Sets the background color for a user
	// @param: (int) User ID, (string) HTML Color code
	// @returns: nothing
	setPosterBackground: function(userid, color)
	{
		if (this.userExists(userid))
		{
			if (this.userDataCache[userid].background != color)
			{
				var statement = this.database.createStatement("UPDATE `userdata` SET `background` = ?1 WHERE `userid` = ?2");
				statement.bindStringParameter(0, color);
				statement.bindInt32Parameter(1, userid);
				statement.execute();
				this.userDataCache[userid].background = color;
			}
		}
		else
		{
			this.addUser(userid);
			this.setPosterBackground(userid, color);
		}
	},

	// Fetches the user's notes from the database
	// @param: (int) User ID
	// @returns: (string) Notes about the user, or (bool) false if not found
	getPosterNotes: function(userid)
	{
		return (this.userExists(userid) && this.userDataCache[userid].notes);
	},

	// Sets the notes for that user in the database
	// @param: (int) User ID, (string) Note
	// @return: nothing
	setPosterNotes: function(userid, note)
	{
		if (this.userExists(userid))
		{
			var statement = this.database.createStatement("UPDATE `userdata` SET `notes` = ?1 WHERE `userid` = ?2");
			statement.bindStringParameter(0, note);
			statement.bindInt32Parameter(1, userid);
			statement.execute();
			statement.reset();
			this.userDataCache[userid].notes = note;
		}
		else
		{
			this.addUser(userid);
			this.setPosterNotes(userid, note);
		}
	},

	// Get the title of the selected thread
	// @param: (int) Thread ID
	// @return: (bool) status of thread title update
	getThreadTitle: function(threadid)
	{
		var title = false;
		if (this.threadExists(threadid))
		{
			title = this.threadDataCache[threadid].title;
		}
		return title;
	},

	// Stores the thread title in the database
	// @param: (int) Thread ID, (string) Thread Title
	// @return: (bool) update success
	setThreadTitle: function(threadid, title)
	{
		var result = false;
		if (this.threadExists(threadid) && this.threadDataCache[threadid].title != title)
		{
			this.threadDataCache[threadid].title = title;
			var statement = this.database.createStatement("UPDATE `threaddata` SET `title` = ?1 WHERE `id` = ?2");
			statement.bindStringParameter(0,title);
			statement.bindInt32Parameter(1,threadid);
			result = statement.executeStep();
			statement.reset();
		}
		return result;
	},

	// Check the database to see if thread was posted in
	// @param: (int) Thread ID
	// @return: (bool) If user posted in thread or not
	didIPostHere: function(threadid)
	{
		return (this.threadExists(threadid) && this.threadDataCache[threadid].posted);
	},

	// Flag a thread as being posted in
	// @param: (int) Thread ID
	// @return: nothing
	iPostedHere: function(threadid)
	{
		if (this.didIPostHere(threadid))
		{
			// We already know we've posted here
			return;
		}
		if (this.threadExists(threadid))
		{
			var statement = this.database.createStatement("UPDATE `threaddata` SET `posted` = 1 WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
			statement.execute();
			this.threadDataCache[threadid].posted = true;
		}
		else
		{
			this.addThread(threadid);
			this.iPostedHere(threadid);
		}
	},

	// Check to see if the thread is starred
	// @param: (int) Thread ID
	// @return: (bool) thread's star status
	isThreadStarred: function(threadid)
	{
		return (this.threadExists(threadid) && this.threadDataCache[threadid].star);
	},

	// Check to see if the thread is ignored
	// @param: (int) Thread Id
	// @return: (bool) thread's ignore status
	isThreadIgnored: function(threadid)
	{
		return (this.threadExists(threadid) && this.threadDataCache[threadid].ignore);
	},

	isThreadOPView: function(threadid)
	{
		return (this.threadExists(threadid) && this.threadDataCache[threadid].opview);
	},

	toggleThreadOPView: function(threadid)
	{
		if (this.threadExists(threadid))
		{
			var statement = this.database.createStatement("UPDATE `threaddata` SET `opview` = not(`opview`) WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
			statement.execute();
			this.threadDataCache[threadid].opview = !this.threadDataCache[threadid].opview;
		}
		else
		{
			this.addThread(threadid);
			this.toggleThreadOPView(threadid);
		}
	},

	// Toggles a thread's starred status in the database
	// @param: (int) thread id, bool
	// @return: nothing
	toggleThreadStar: function(threadid)
	{
		if (this.threadExists(threadid))
		{
			var statement = this.database.createStatement("UPDATE `threaddata` SET `star` = not(`star`) WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
			statement.execute();
			this.threadDataCache[threadid].star = !this.threadDataCache[threadid].star;
		}
		else
		{
			this.addThread(threadid);
			this.toggleThreadStar(threadid);
		}
	},

	// Toggles a thread's ignored status in the database
	// @param: (int) thread id, bool
	// @return: nothing
	toggleThreadIgnore: function(threadid)
	{
		if (this.threadExists(threadid))
		{
			var statement = this.database.createStatement("UPDATE `threaddata` SET `ignore` = not(`ignore`) WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
			statement.execute();
			this.threadDataCache[threadid].ignore = !this.threadDataCache[threadid].ignore;
		}
		else
		{
			this.addThread(threadid);
			this.toggleThreadIgnore(threadid);
		}
	},

// Unused
	// Removes a thread from the database
	// @param: (int) Thread ID
	// @return: (booler) true on success, false on failure
	removeThread: function(threadId)
	{
		var result = false;
		if (this.threadExists(threadId))
		{
			this.threadDataCache.splice(threadId, 1);
			var statement = this.database.createStatement("DELETE FROM `threaddata` WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadId);
			result = statement.executeStep();
			statement.reset();
		}
		return result;
	},

	prepopulateDB: function(dbtable)
	{
		switch (dbtable)
		{
			case "userdata":
				this.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('53580', 'astral', 0, 0, '#003366', 0, 0, 'SALR 2.0 Developer', 0, 0)");
				this.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('81482', 'duz', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
				this.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('33775', 'Tivac', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
				this.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('35205', 'RedKazan', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
				this.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('20065', 'biznatchio', 0, 0, '#4400bb', 0, 0, 'SALR Creator', 0, 0)");
				break;
		}
	},

	// Use this function to apply any needed SQL schema updates and similar changes
	// @param: (int) Last run build number
	// @return: nothing
	checkForSQLPatches: function(build)
	{
		if (build == 0)
		{
			return;
		}
		var statement;
		if (build < 70414)
		{
			// Userdata schema changed, let's test to make sure it needs to be changed, just incase
			statement = this.database.createStatement("SELECT * FROM `userdata` WHERE 1=1");
			statement.executeStep();
			if (statement.getColumnName(4) != 'color')
			{
				statement.reset();
				this.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `color` VARCHAR(8)");
				this.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `background` VARCHAR(8)");
			}
			else
			{
				statement.reset();
			}
		}
		if (build < 70418)
		{
			// Not setting a default value makes things harder so let's fix that
			statement = this.database.executeSimpleSQL("UPDATE `threaddata` SET `star` = 0 WHERE `star` IS NULL");
			statement = this.database.executeSimpleSQL("UPDATE `threaddata` SET `ignore` = 0 WHERE `ignore` IS NULL");
			statement = this.database.executeSimpleSQL("UPDATE `threaddata` SET `posted` = 0 WHERE `posted` IS NULL");
			statement = this.database.executeSimpleSQL("UPDATE `userdata` SET `color` = 0 WHERE `color` IS NULL");
			statement = this.database.executeSimpleSQL("UPDATE `userdata` SET `background` = 0 WHERE `background` IS NULL");
		}
		if (build < 80122)
		{
			this.database.executeSimpleSQL("DELETE FROM `posticons`");
		}
		if (build < 80509)
		{
			try
			{
				statement = this.database.createStatement("SELECT * FROM `userdata` WHERE `ignored` = 0");
				statement.executeStep();
			}
			catch(e)
			{
				this.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `ignored` BOOLEAN DEFAULT 0");
				this.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `hideavatar` BOOLEAN DEFAULT 0");
			}
			finally
			{
				statement.reset();
			}
		}
		if (build < 80620)
		{
			// Userdata schema changed in a previous version and doesn't look like everyone got it
			statement = this.database.createStatement("SELECT * FROM `userdata` WHERE 1=1");
			statement.executeStep();
			try
			{
				var column8 = statement.getColumnName(8);
			}
			catch (e)
			{
				// It throws up an error if it doesn't exist
				if (column8 != 'ignored')
				{
					statement.reset();
					this.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `ignored` BOOLEAN DEFAULT 0");
				}
			}
			try
			{
				var column9 = statement.getColumnName(9);
			}
			catch (e)
			{
				// It throws up an error if it doesn't exist
				if (column9 != 'hideavatar')
				{
					statement.reset();
					this.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `hideavatar` BOOLEAN DEFAULT 0");
				}
			}
			statement.reset();
		}

		if (build < 150505)
		{
			// Check if we already did this:
			statement = this.database.createStatement("SELECT * FROM `threaddata` WHERE 1=1 LIMIT 1");
			statement.executeStep();
			if (statement.getColumnName(5) != 'opview')
			{
				try
				{
					statement.reset();
					// Clear out old data and change `options` to `opview`
					this.database.beginTransactionAs(this.database.TRANSACTION_IMMEDIATE);
					this.database.executeSimpleSQL("CREATE TABLE `threaddata_clean` (id INTEGER PRIMARY KEY, title VARCHAR(161), posted BOOLEAN, ignore BOOLEAN, star BOOLEAN, opview BOOLEAN)");
					this.database.executeSimpleSQL("INSERT INTO `threaddata_clean` SELECT `id`, `title`, `posted`, `ignore`, `star`, 0 FROM `threaddata` WHERE NOT (`posted`==0 AND `ignore`==0 AND `star`==0)");
					this.database.executeSimpleSQL("DROP TABLE `threaddata`");
					this.database.executeSimpleSQL("ALTER TABLE `threaddata_clean` RENAME TO `threaddata`");
					this.database.commitTransaction();
					// Keep DB tiny
					this.database.executeSimpleSQL("PRAGMA page_size = 1024");
					this.database.executeSimpleSQL("VACUUM");
				}
				catch(e)
				{
					this.database.rollbackTransaction();
				}
			}
		}

		// Always do inserts last so that any table altering takes affect first
		// ====================================================================

		if (build < 70531)
		{
			// Toss in coloring for biznatchio, Tivac and duz to see if it breaks anything
			this.prepopulateDB("userdata");
		}
		if (build < 71128 && build > 70531)
		{
			this.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('35205', 'RedKazan', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
		}
	},

};
DB.init();
