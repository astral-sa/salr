/*

	Everything to do with our database/caches/forumlist

*/

Cu.import("resource://gre/modules/Services.jsm");
let {Prefs} = require("prefs");
let {Utils} = require("utils");
const {OS} = Cu.import("resource://gre/modules/osfile.jsm", {});

let DB = exports.DB =
{
	needToShowChangeLog: false,
	init: function()
	{
		// Load relevant databases
		DB.ProfileInit();

		// Check if we need some SQL patches
		if (DB.LastRunVersion != DB.SALRversion && DB.LastRunVersion !== "0.0.0")
		{
			//DB.needToShowChangeLog = !DB.IsDevelopmentRelease;
			DB.needToShowChangeLog = true;
			// 3.0+ patches:
			// Services.vc.compare("str1", "str2")

			// Check for pre-3.0 SQL patches
			let hasBuildNum = DB.LastRunVersion.match(/^1\.99\.(\d+)/);
			if (hasBuildNum && hasBuildNum[1])
			{
				DB.checkForSQLPatches(parseInt(hasBuildNum[1], 10));
			}
		}

		// Fill up the cache
		DB.populateDataCaches();

		DB.LastRunVersion = DB.SALRversion;
		DB.initChildListeners();
	},

	_profileInitialized: false,
	_dbfn: null,
	_flfn: null,
	ProfileInit: function()
	{
		if (DB._profileInitialized) {
			return;
		}
		DB._profileInitialized = true;

		try
		{
			DB._dbfn = DB.getFilePath(Prefs.getPref('databaseStoragePath'));
			DB._flfn = DB.getFilePath(Prefs.getPref('forumListStoragePath'));
//Utils.logToConsole("SALR Initializing Profile:\ndb: " + DB._dbfn + "\nfl: " + DB._flfn);

			DB.initForumListXML();

		} catch (e) {
			DB._starterr = e + "\nLine: " + e.lineNumber;
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

	/**
	 * Currently unused.
	 * TODO: implement this variable to prevent multiple pages from
	 *           attempting to process the forum list at the same time.
	 */
	gettingForumList: false,

	/**
	 * Whether we have already fetched the forum list this session.
	 * @type {boolean}
	 */
	gotForumList: false,

	/**
	 * DOM document tree with forum list information created from
	 * parsing the XML forum list.
	 */
	_forumListXMLDoc: null,

	/**
	 * Promise that resolves when any forum list XML is read from the disk.
	 * @type {Promise}
	 */
	_forumListPromise: null,

	/**
	 * Getter used by menu preferences pane only. New code should
	 * use GetForumListXMLDoc instead.
	 */
	get forumListXml() { return DB._forumListXMLDoc; },
	set forumListXml(value) {
		if (value != null)
		{
			DB._forumListXMLDoc = value;
			// Serialize the XML document and save it to disk.
			let oXmlSer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
							.createInstance(Components.interfaces.nsIDOMSerializer);
			let xmlstr = oXmlSer.serializeToString(DB._forumListXMLDoc);
			let promise = OS.File.writeAtomic(DB._flfn, xmlstr, { encoding: "utf-8", tmpPath: DB._flfn + ".tmp"});
			promise.catch(
				(error) =>
				{
					Utils.logToConsole("SALR DB: Error writing XML file - " + error);
				}
			);
		}
	},

	/**
	 * Promisified access to forum list XML for Menus
	 * @return {Promise} Resolves with the forum list XML Document.
	 */
	GetForumListXMLDoc: function()
	{
		// Return immediately if we already have it
		if (DB._forumListXMLDoc !== null)
			return Promise.resolve(DB._forumListXMLDoc);

		// We should have a promise from initializing already
		if (DB._forumListPromise)
			return DB._forumListPromise;

		// If we're here, something has gone very wrong
		return Promise.reject("No promises.");
	},

	/**
	 * Loads the forum list XML file if it exists.
	 */
	initForumListXML: function()
	{
		DB._forumListPromise = OS.File.read(DB._flfn, { encoding: "utf-8" }).then(
			(pxml) => {
				if (pxml)
				{
					// File exists and is not empty
					let oDomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
										.createInstance(Components.interfaces.nsIDOMParser);
					try {
						DB._forumListXMLDoc = oDomParser.parseFromString(pxml, "text/xml");
						if (DB._forumListXMLDoc.documentElement.nodeName === "parsererror")
						{
							DB._forumListXMLDoc = null;
							return Promise.reject("Error parsing XML document.");
						}
						else
						{
							// All is well!
							return DB._forumListXMLDoc;
						}
					} catch (ex) {
						DB._forumListXMLDoc = null;
						return Promise.reject("Exception parsing XML document: " + ex);
					}
				}
				else
				{
					// File exists, but is empty
					DB._forumListXMLDoc = null;
					return Promise.reject("Empty file.");
				}
			},
			(error) => {
				// File does not exist
				DB._forumListXMLDoc = null;
				throw error;
			}
		);
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
		if (lrver === '')
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

	// Deprecated
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
			isDev = (build.length === 6);
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

	get storedbFileName() { return DB._dbfn; },

	mDBConn: null,
	userDataCache: Array(),
	userIDCache: Array(),
	threadDataCache: Array(),
	iconDataCache: Array(),
	videoTitleCache: Array(),
	imgurWorkaroundCache: Array(),
	/**
	 * Cache of valid gif IDs we can convert to gifv.
	 * @type {Object}
	 */
	imgurGifCache: {},

	// Return a connection to the database
	// Create database if it doesn't exist yet
	// TODO: Error handling, Improving(?) file handling
	get database()
	{
		if (DB.mDBConn != null)
		{
			return DB.mDBConn;
		}
		// the connection hasn't been created yet so we'll connect
		var fn = DB.storedbFileName;
		var file = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(fn);
		if (file.exists() === false)
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
		DB.mDBConn = storageService.openDatabase(file);
		if (!DB.mDBConn.tableExists("threaddata"))
		{
			DB.mDBConn.executeSimpleSQL("CREATE TABLE `threaddata` (id INTEGER PRIMARY KEY, title VARCHAR(161), posted BOOLEAN, ignore BOOLEAN, star BOOLEAN, opview BOOLEAN)");
			DB.prepopulateDB("threaddata");
		}
		if (!DB.mDBConn.tableExists("userdata"))
		{
			DB.mDBConn.executeSimpleSQL("CREATE TABLE `userdata` (userid INTEGER PRIMARY KEY, username VARCHAR(50), mod BOOLEAN, admin BOOLEAN, color VARCHAR(8), background VARCHAR(8), status VARCHAR(8), notes TEXT, ignored BOOLEAN, hideavatar BOOLEAN)");
			DB.prepopulateDB("userdata");
		}
		if (!DB.mDBConn.tableExists("posticons"))
		{
			DB.mDBConn.executeSimpleSQL("CREATE TABLE `posticons` (iconnumber INTEGER PRIMARY KEY, filename VARCHAR(50))");
			DB.prepopulateDB("posticons");
		}
		return DB.mDBConn;
	},

	// Returns an array of the ignored threads with the thread id as the key and the thread title as the value
	get ignoreList()
	{
		if (DB.threadDataCache.length === 0)
		{
			DB.populateThreadDataCache();
		}
		let threads = [];
		for (let threadDataKey in DB.threadDataCache)
		{
			if (DB.threadDataCache.hasOwnProperty(threadDataKey))
			{
				let threadData = DB.threadDataCache[threadDataKey];
				if (threadData.ignore)
				{
					threads[threadData.threadid] = threadData.title;
				}
			}
		}
		return threads;
	},

	// Returns an array of the starred threads with the thread id as the key
	// and the thread title as the value
	get starList()
	{
		if (DB.threadDataCache.length === 0)
		{
			DB.populateThreadDataCache();
		}
		var threads = [];
		for (let threadDataKey in DB.threadDataCache)
		{
			if (DB.threadDataCache.hasOwnProperty(threadDataKey))
			{
				let threadData = DB.threadDataCache[threadDataKey];
				if (threadData.star)
				{
					threads[threadData.threadid] = threadData.title;
				}
			}
		}
		return threads;
	},

// Unused
	// Returns an associative array of thread icons with the filename as the key and the icon num as the value
	get iconList()
	{
		return DB.iconDataCache;
	},

	// Calls everything needed to fill the data caches
	populateDataCaches: function()
	{
		try
		{
			DB.populateUserDataCache();
		} catch (e) {
			// Do nothing for now
		}
		try
		{
			DB.populateThreadDataCache();
		} catch (e) {
			// Do nothing for now
		}
		try
		{
			DB.populateIconDataCache();
		} catch (e) {
			// Do nothing for now
		}
	},

	// Fills the user data cache from the database
	// @param: nothing
	// @return: nothing
	populateUserDataCache: function()
	{
		var statement = DB.database.createStatement("SELECT `userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar` FROM `userdata`");
		var userid, username;
		while (statement.executeStep())
		{
			userid = statement.getInt32(0);
			username = statement.getString(1);
			DB.userDataCache[userid] = {};
			DB.userDataCache[userid].userid = userid;
			DB.userDataCache[userid].username = username;
			DB.userDataCache[userid].mod = Boolean(statement.getInt32(2));
			DB.userDataCache[userid].admin = Boolean(statement.getInt32(3));
			DB.userDataCache[userid].color = statement.getString(4);
			DB.userDataCache[userid].background = statement.getString(5);
			DB.userDataCache[userid].status = statement.getInt32(6);
			DB.userDataCache[userid].notes = statement.getString(7);
			DB.userDataCache[userid].ignored = Boolean(statement.getInt32(8));
			DB.userDataCache[userid].hideavatar = Boolean(statement.getInt32(9));
			DB.userIDCache[username] = userid;
		}
		statement.reset();
	},

	// Fills the thread data cache from the database
	// @param: nothing
	// @return: nothing
	populateThreadDataCache: function()
	{
		var statement = DB.database.createStatement("SELECT `id`, `title`, `posted`, `ignore`, `star`, `opview` FROM `threaddata`");
		var threadid;
		while (statement.executeStep())
		{
			threadid = statement.getInt32(0);
			DB.threadDataCache[threadid] = {};
			DB.threadDataCache[threadid].threadid = threadid;
			DB.threadDataCache[threadid].title = statement.getString(1);
			DB.threadDataCache[threadid].posted = Boolean(statement.getInt32(2));
			DB.threadDataCache[threadid].ignore = Boolean(statement.getInt32(3));
			DB.threadDataCache[threadid].star = Boolean(statement.getInt32(4));
			DB.threadDataCache[threadid].opview = Boolean(statement.getInt32(5));
		}
		statement.reset();
	},

	// Fills the icon data cache from the database
	// @param: nothing
	// @return: nothing
	populateIconDataCache: function()
	{
		var statement = DB.database.createStatement("SELECT `iconnumber`, `filename` FROM `posticons`");
		var iconnumber, filename;
		while (statement.executeStep())
		{
			iconnumber = statement.getInt32(0);
			filename = statement.getString(1);
			DB.iconDataCache[iconnumber] = filename;
			DB.iconDataCache[filename] = iconnumber;
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
		if (DB.userDataCache[userid] != undefined)
		{
			username = DB.userDataCache[userid].username;
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
		if (DB.userIDCache[username] != undefined)
		{
			userid = DB.userIDCache[username];
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
		DB.userIDCache[username] = userid;
		if (DB.userDataCache[userid].username !== username)
		{
			DB.userDataCache[userid].username = username;
			var statement = DB.database.createStatement("UPDATE `userdata` SET `username` = ?1 WHERE `userid` = ?2");
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
		return (DB.threadDataCache[threadid] != undefined);
	},

	// Adds a thread to the DB and cache
	// @param: (int) User ID
	// @return: nothing
	addThread: function(threadid)
	{
		if (!DB.threadExists(threadid))
		{
			DB.threadDataCache[threadid] = {};
			DB.threadDataCache[threadid].threadid = threadid;
			DB.threadDataCache[threadid].title = '';
			DB.threadDataCache[threadid].posted = false;
			DB.threadDataCache[threadid].ignore = false;
			DB.threadDataCache[threadid].star = false;
			DB.threadDataCache[threadid].opview = false;
			var statement = DB.database.createStatement("INSERT INTO `threaddata` (`id`, `title`, `posted`, `ignore`, `star`, `opview`) VALUES (?1, null, 0, 0, 0, 0)");
			statement.bindInt32Parameter(0, threadid);
			statement.execute();
		}
	},

	// Checks to see if the DB already knows about a user
	// @param: (int) User ID
	// @return: (bool) if user is in DB
	userExists: function(userid)
	{
		return (DB.userDataCache[userid] != undefined);
	},

	// Adds a user to the DB and cache
	// @param: (int) User ID
	// @return: nothing
	addUser: function(userid, username)
	{
		if (!DB.userExists(userid))
		{
			if (username == undefined)
			{
				username = null;
			}
			DB.userDataCache[userid] = {};
			DB.userDataCache[userid].userid = userid;
			DB.userDataCache[userid].username = username;
			DB.userDataCache[userid].mod = false;
			DB.userDataCache[userid].admin = false;
			DB.userDataCache[userid].color = 0;
			DB.userDataCache[userid].background = 0;
			DB.userDataCache[userid].status = 0;
			DB.userDataCache[userid].notes = null;
			DB.userDataCache[userid].ignored = false;
			DB.userDataCache[userid].hideavatar = false;
			//This is already below (and done more safely)
			//DB.userIDCache[username] = userid;
			var statement = DB.database.createStatement("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES (?1, ?2, 0, 0, 0, 0, 0, null, 0, 0)");
			statement.bindInt32Parameter(0, userid);
			statement.bindStringParameter(1, username);
			statement.execute();
			if (username != null)
			{
				DB.userIDCache[username] = userid;
			}
		}
	},

	// Adds/updates a user as a mod
	// @param: (int) User ID, (string) Username
	// @return: nothing
	addMod: function(userid, username)
	{
		if (DB.isMod(userid))
		{
			// We already know it's a mod
			// ...but we might have to update the username to reflect a name change.
			if (DB.userDataCache[userid].username != username)
			{
				DB.setUserName(userid, username);
			}
			return;
		}
		if (DB.userExists(userid))
		{
			var statement = DB.database.createStatement("UPDATE `userdata` SET `username` = ?1, `mod` = 1 WHERE `userid` = ?2");
			statement.bindStringParameter(0,username);
			statement.bindInt32Parameter(1,userid);
			statement.execute();
			DB.userDataCache[userid].mod = true;
		}
		else
		{
			DB.addUser(userid, username);
			DB.addMod(userid, username);
		}
	},

	// Remove a user as a mod
	// @param: (int) User ID
	// @return: nothing
	removeMod: function(userid)
	{
		if (DB.isMod(userid))
		{
			DB.userDataCache[userid].mod = false;
			var statement = DB.database.createStatement("UPDATE `userdata` SET `mod` = 0 WHERE `userid` = ?1");
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
		if (DB.isAdmin(userid))
		{
			// We already know it's an admin
			// ...but we might have to update the username to reflect a name change.
			if (DB.userDataCache[userid].username != username)
			{
				DB.setUserName(userid, username);
			}
			return;
		}
		if (DB.userExists(userid))
		{
			var statement = DB.database.createStatement("UPDATE `userdata` SET `username` = ?1, `admin` = 1 WHERE `userid` = ?2");
			statement.bindStringParameter(0,username);
			statement.bindInt32Parameter(1,userid);
			statement.execute();
			DB.userDataCache[userid].admin = true;
		}
		else
		{
			DB.addUser(userid, username);
			DB.addAdmin(userid, username);
		}
	},

	// Remove a user's admin flag
	// @param: (int) User ID
	// @return: nothing
	removeAdmin: function(userid)
	{
		if (DB.isAdmin(userid))
		{
			DB.userDataCache[userid].admin = false;
			var statement = DB.database.createStatement("UPDATE `userdata` SET `admin` = 0 WHERE `userid` = ?1");
			statement.bindInt32Parameter(0, userid);
			statement.executeStep();
			statement.reset();
		}
	},

	// Super ignore a user
	addSuperIgnored: function (userid, username)
	{
		if (DB.userExists(userid))
		{
			var statement = DB.database.createStatement("UPDATE `userdata` SET `username` = ?1, `ignored` = 1 WHERE `userid` = ?2");
			statement.bindStringParameter(0,username);
			statement.bindInt32Parameter(1,userid);
			statement.execute();
			DB.userDataCache[userid].ignored = true;
		}
		else
		{
			DB.addUser(userid, username);
			DB.addSuperIgnored(userid, username);
		}
	},

	// Un-super ignore a user
	removeSuperIgnored: function(userid)
	{
		if (DB.isUserIgnored(userid))
		{
			DB.userDataCache[userid].ignored = false;
			var statement = DB.database.createStatement("UPDATE `userdata` SET `ignored` = 0 WHERE `userid` = ?1");
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
		if (DB.userExists(userid))
		{
			var statement = DB.database.createStatement("UPDATE `userdata` SET `hideavatar` = not(`hideavatar`) WHERE `userid` = ?1");
			statement.bindInt32Parameter(0, userid);
			statement.execute();
			DB.userDataCache[userid].hideavatar = !DB.userDataCache[userid].hideavatar;
		}
		else
		{
			DB.addUser(userid, username);
			DB.toggleAvatarHidden(userid, username);
		}
	},

	// Checks if a user id is flagged as a mod
	// @param: (int) User ID
	// @return: (boolean) Mod or not
	isMod: function(userid)
	{
		return (DB.userExists(userid) && DB.userDataCache[userid].mod);
	},

	// Checks if a user id is flagged as an admin
	// @param: (int) User ID
	// @return: (boolean) Admin or not
	isAdmin: function(userid)
	{
		return (DB.userExists(userid) && DB.userDataCache[userid].admin);
	},

	// Checks if a user id is flagged to be ignored
	// @param: (int) User ID
	// @return: (boolean) Ignored or not
	isUserIgnored: function(userid)
	{
		return (DB.userExists(userid) && DB.userDataCache[userid].ignored);
	},

	// Checks if a user id is flagged to have their avatar hidden
	// @param: (int) User ID
	// @return: (boolean) Hidden or not
	isAvatarHidden: function(userid)
	{
		return (DB.userExists(userid) && DB.userDataCache[userid].hideavatar);
	},
	
	// checks to see if the userid has any custom coloring defined
	// @param: (int) User Id
	// @returns: (object) Object contained userid and username
	isUserIdColored: function(userid)
	{
		var user = false;
		if (DB.userExists(userid))
		{
			user = {};
			user.userid = userid;
			user.username = DB.userDataCache[userid].username;
			user.color = DB.userDataCache[userid].color;
			user.background = DB.userDataCache[userid].background;
		}
		return user;
	},

	// checks to see if the username has any custom coloring defined
	// @param: (string) Username
	// @returns: (object) Object contained userid and username
	isUsernameColored: function(username)
	{
		var userid = DB.getUserId(username);
		return DB.isUserIdColored(userid);
	},

	// Fetches all users that have custom colors or a note defined
	// @param: nothing
	// @returns: array of user ids
	getCustomizedPosters: function()
	{
		var users = [];
		for (let userDataKey in DB.userDataCache)
		{
			if (DB.userDataCache.hasOwnProperty(userDataKey))
			{
				let userData = DB.userDataCache[userDataKey];
				if (userData.color !== '0' || userData.background !== '0' || (userData.notes !== '' && userData.notes !== null))
				{
					var user = {};
					user.userid = userData.userid;
					user.username = userData.username;
					users.push(user);
				}
			}
		}
		return users;
	},

	// Fetches the user's color code from the database
	// @param: (int) User ID
	// @returns: (string) Hex Colorcode to color user, or (bool) false if not found
	getPosterColor: function(userid)
	{
		return (DB.userExists(userid) && DB.userDataCache[userid].color);
	},

	// Sets the foreground color for a user
	// @param: (int) User ID, (string) HTML Color code
	// @returns: nothing
	setPosterColor: function(userid, color)
	{
		if (DB.userExists(userid))
		{
			if (DB.userDataCache[userid].color != color)
			{
				var statement = DB.database.createStatement("UPDATE `userdata` SET `color` = ?1 WHERE `userid` = ?2");
				statement.bindStringParameter(0, color);
				statement.bindInt32Parameter(1, userid);
				statement.execute();
				DB.userDataCache[userid].color = color;
			}
		}
		else
		{
			DB.addUser(userid);
			DB.setPosterColor(userid, color);
		}
	},

	// Fetches the user's background color code from the database
	// @param: (int) User ID
	// @returns: (string) Hex Colorcode to color user, or (bool) false if not found
	getPosterBackground: function(userid)
	{
		return (DB.userExists(userid) && DB.userDataCache[userid].background);
	},

	// Sets the background color for a user
	// @param: (int) User ID, (string) HTML Color code
	// @returns: nothing
	setPosterBackground: function(userid, color)
	{
		if (DB.userExists(userid))
		{
			if (DB.userDataCache[userid].background != color)
			{
				var statement = DB.database.createStatement("UPDATE `userdata` SET `background` = ?1 WHERE `userid` = ?2");
				statement.bindStringParameter(0, color);
				statement.bindInt32Parameter(1, userid);
				statement.execute();
				DB.userDataCache[userid].background = color;
			}
		}
		else
		{
			DB.addUser(userid);
			DB.setPosterBackground(userid, color);
		}
	},

	// Fetches the user's notes from the database
	// @param: (int) User ID
	// @returns: (string) Notes about the user, or (bool) false if not found
	getPosterNotes: function(userid)
	{
		return (DB.userExists(userid) && DB.userDataCache[userid].notes);
	},

	// Sets the notes for that user in the database
	// @param: (int) User ID, (string) Note
	// @return: nothing
	setPosterNotes: function(userid, note)
	{
		if (DB.userExists(userid))
		{
			var statement = DB.database.createStatement("UPDATE `userdata` SET `notes` = ?1 WHERE `userid` = ?2");
			statement.bindStringParameter(0, note);
			statement.bindInt32Parameter(1, userid);
			statement.execute();
			statement.reset();
			DB.userDataCache[userid].notes = note;
		}
		else
		{
			DB.addUser(userid);
			DB.setPosterNotes(userid, note);
		}
	},

	// Get the title of the selected thread
	// @param: (int) Thread ID
	// @return: (bool) status of thread title update
	getThreadTitle: function(threadid)
	{
		var title = false;
		if (DB.threadExists(threadid))
		{
			title = DB.threadDataCache[threadid].title;
		}
		return title;
	},

	// Stores the thread title in the database
	// @param: (int) Thread ID, (string) Thread Title
	// @return: (bool) update success
	setThreadTitle: function(threadid, title)
	{
		var result = false;
		if (DB.threadExists(threadid) && DB.threadDataCache[threadid].title != title)
		{
			DB.threadDataCache[threadid].title = title;
			var statement = DB.database.createStatement("UPDATE `threaddata` SET `title` = ?1 WHERE `id` = ?2");
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
		return (DB.threadExists(threadid) && DB.threadDataCache[threadid].posted);
	},

	// Flag a thread as being posted in
	// @param: (int) Thread ID
	// @return: nothing
	iPostedHere: function(threadid)
	{
		if (DB.didIPostHere(threadid))
		{
			// We already know we've posted here
			return;
		}
		if (DB.threadExists(threadid))
		{
			var statement = DB.database.createStatement("UPDATE `threaddata` SET `posted` = 1 WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
			statement.execute();
			DB.threadDataCache[threadid].posted = true;
		}
		else
		{
			DB.addThread(threadid);
			DB.iPostedHere(threadid);
		}
	},

	// Check to see if the thread is starred
	// @param: (int) Thread ID
	// @return: (bool) thread's star status
	isThreadStarred: function(threadid)
	{
		return (DB.threadExists(threadid) && DB.threadDataCache[threadid].star);
	},

	// Check to see if the thread is ignored
	// @param: (int) Thread Id
	// @return: (bool) thread's ignore status
	isThreadIgnored: function(threadid)
	{
		return (DB.threadExists(threadid) && DB.threadDataCache[threadid].ignore);
	},

	isThreadOPView: function(threadid)
	{
		return (DB.threadExists(threadid) && DB.threadDataCache[threadid].opview);
	},

	toggleThreadOPView: function(threadid)
	{
		if (DB.threadExists(threadid))
		{
			var statement = DB.database.createStatement("UPDATE `threaddata` SET `opview` = not(`opview`) WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
			statement.execute();
			DB.threadDataCache[threadid].opview = !DB.threadDataCache[threadid].opview;
		}
		else
		{
			DB.addThread(threadid);
			DB.toggleThreadOPView(threadid);
		}
	},

	// Toggles a thread's starred status in the database
	// @param: (int) thread id, bool
	// @return: nothing
	toggleThreadStar: function(threadid)
	{
		if (DB.threadExists(threadid))
		{
			var statement = DB.database.createStatement("UPDATE `threaddata` SET `star` = not(`star`) WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
			statement.execute();
			DB.threadDataCache[threadid].star = !DB.threadDataCache[threadid].star;
		}
		else
		{
			DB.addThread(threadid);
			DB.toggleThreadStar(threadid);
		}
	},

	// Toggles a thread's ignored status in the database
	// @param: (int) thread id, bool
	// @return: nothing
	toggleThreadIgnore: function(threadid)
	{
		if (DB.threadExists(threadid))
		{
			var statement = DB.database.createStatement("UPDATE `threaddata` SET `ignore` = not(`ignore`) WHERE `id` = ?1");
			statement.bindInt32Parameter(0,threadid);
			statement.execute();
			DB.threadDataCache[threadid].ignore = !DB.threadDataCache[threadid].ignore;
		}
		else
		{
			DB.addThread(threadid);
			DB.toggleThreadIgnore(threadid);
		}
	},

// Unused
	// Removes a thread from the database
	// @param: (int) Thread ID
	// @return: (booler) true on success, false on failure
	removeThread: function(threadId)
	{
		var result = false;
		if (DB.threadExists(threadId))
		{
			DB.threadDataCache.splice(threadId, 1);
			var statement = DB.database.createStatement("DELETE FROM `threaddata` WHERE `id` = ?1");
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
				DB.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('53580', 'astral', 0, 0, '#003366', 0, 0, 'SALR Developer', 0, 0)");
				DB.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('81482', 'duz', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
				DB.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('33775', 'Tivac', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
				DB.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('35205', 'RedKazan', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
				DB.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('20065', 'biznatchio', 0, 0, '#4400bb', 0, 0, 'SALR Creator', 0, 0)");
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
			statement = DB.database.createStatement("SELECT * FROM `userdata` WHERE 1=1");
			statement.executeStep();
			if (statement.getColumnName(4) != 'color')
			{
				statement.reset();
				DB.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `color` VARCHAR(8)");
				DB.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `background` VARCHAR(8)");
			}
			else
			{
				statement.reset();
			}
		}
		if (build < 70418)
		{
			// Not setting a default value makes things harder so let's fix that
			statement = DB.database.executeSimpleSQL("UPDATE `threaddata` SET `star` = 0 WHERE `star` IS NULL");
			statement = DB.database.executeSimpleSQL("UPDATE `threaddata` SET `ignore` = 0 WHERE `ignore` IS NULL");
			statement = DB.database.executeSimpleSQL("UPDATE `threaddata` SET `posted` = 0 WHERE `posted` IS NULL");
			statement = DB.database.executeSimpleSQL("UPDATE `userdata` SET `color` = 0 WHERE `color` IS NULL");
			statement = DB.database.executeSimpleSQL("UPDATE `userdata` SET `background` = 0 WHERE `background` IS NULL");
		}
		if (build < 80122)
		{
			DB.database.executeSimpleSQL("DELETE FROM `posticons`");
		}
		if (build < 80509)
		{
			try
			{
				statement = DB.database.createStatement("SELECT * FROM `userdata` WHERE `ignored` = 0");
				statement.executeStep();
			}
			catch(e)
			{
				DB.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `ignored` BOOLEAN DEFAULT 0");
				DB.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `hideavatar` BOOLEAN DEFAULT 0");
			}
			finally
			{
				statement.reset();
			}
		}
		if (build < 80620)
		{
			// Userdata schema changed in a previous version and doesn't look like everyone got it
			statement = DB.database.createStatement("SELECT * FROM `userdata` WHERE 1=1");
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
					DB.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `ignored` BOOLEAN DEFAULT 0");
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
					DB.database.executeSimpleSQL("ALTER TABLE `userdata` ADD `hideavatar` BOOLEAN DEFAULT 0");
				}
			}
			statement.reset();
		}

		if (build < 150505)
		{
			// Check if we already did this:
			statement = DB.database.createStatement("SELECT * FROM `threaddata` WHERE 1=1 LIMIT 1");
			statement.executeStep();
			if (statement.getColumnName(5) != 'opview')
			{
				try
				{
					statement.reset();
					// Clear out old data and change `options` to `opview`
					DB.database.beginTransactionAs(DB.database.TRANSACTION_IMMEDIATE);
					DB.database.executeSimpleSQL("CREATE TABLE `threaddata_clean` (id INTEGER PRIMARY KEY, title VARCHAR(161), posted BOOLEAN, ignore BOOLEAN, star BOOLEAN, opview BOOLEAN)");
					DB.database.executeSimpleSQL("INSERT INTO `threaddata_clean` SELECT `id`, `title`, `posted`, `ignore`, `star`, 0 FROM `threaddata` WHERE NOT (`posted`==0 AND `ignore`==0 AND `star`==0)");
					DB.database.executeSimpleSQL("DROP TABLE `threaddata`");
					DB.database.executeSimpleSQL("ALTER TABLE `threaddata_clean` RENAME TO `threaddata`");
					DB.database.commitTransaction();
					// Keep DB tiny
					DB.database.executeSimpleSQL("PRAGMA page_size = 1024");
					DB.database.executeSimpleSQL("VACUUM");
				}
				catch(e)
				{
					DB.database.rollbackTransaction();
				}
			}
		}

		// Always do inserts last so that any table altering takes affect first
		// ====================================================================

		if (build < 70531)
		{
			// Toss in coloring for biznatchio, Tivac and duz to see if it breaks anything
			DB.prepopulateDB("userdata");
		}
		if (build < 71128 && build > 70531)
		{
			DB.database.executeSimpleSQL("INSERT INTO `userdata` (`userid`, `username`, `mod`, `admin`, `color`, `background`, `status`, `notes`, `ignored`, `hideavatar`) VALUES ('35205', 'RedKazan', 0, 0, '#4400bb', 0, 0, 'SALR 2.0 Developer', 0, 0)");
		}
	},

	initChildListeners: function()
	{
		Utils.addFrameMessageListener("salastread:ForumListUpdate", forumListUpdate);
		Utils.addFrameMessageListener("salastread:SetThreadTitle", setThreadTitleWrapper);
		Utils.addFrameMessageListener("salastread:DoWeHaveForumList", () => DB.gotForumList);
		Utils.addFrameMessageListener("salastread:GetUserId", DB.getUserId);
		Utils.addFrameMessageListener("salastread:SetUserName", setUserNameWrapper);
		Utils.addFrameMessageListener("salastread:ToggleAvatarHidden", toggleAvatarHiddenWrapper);
		Utils.addFrameMessageListener("salastread:IsUserIgnored", DB.isUserIgnored);
		Utils.addFrameMessageListener("salastread:IsAvatarHidden", DB.isAvatarHidden);
		Utils.addFrameMessageListener("salastread:IsUserIdColored", DB.isUserIdColored);
		Utils.addFrameMessageListener("salastread:IsUsernameColored", DB.isUsernameColored);
		Utils.addFrameMessageListener("salastread:IsMod", DB.isMod);
		Utils.addFrameMessageListener("salastread:IsAdmin", DB.isAdmin);
		Utils.addFrameMessageListener("salastread:AddMod", addModWrapper);
		Utils.addFrameMessageListener("salastread:AddAdmin", addAdminWrapper);
		Utils.addFrameMessageListener("salastread:RemoveMod", DB.removeMod);
		Utils.addFrameMessageListener("salastread:RemoveAdmin", DB.removeAdmin);
		Utils.addFrameMessageListener("salastread:GetPosterNotes", DB.getPosterNotes);
		Utils.addFrameMessageListener("salastread:DidIPostHere", DB.didIPostHere);
		Utils.addFrameMessageListener("salastread:IPostedHere", DB.iPostedHere);
		Utils.addFrameMessageListener("salastread:IsThreadIgnored", DB.isThreadIgnored);
		Utils.addFrameMessageListener("salastread:IsThreadStarred", DB.isThreadStarred);
		// Temporary wrappers to request transaction for forumdisplay
		// will be removed upon conversion to SQLite.jsm
		Utils.addFrameMessageListener("salastread:RequestTransactionState", () => DB.database.transactionInProgress);
		Utils.addFrameMessageListener("salastread:BeginTransaction", () => DB.database.beginTransactionAs(DB.database.TRANSACTION_DEFERRED));
		Utils.addFrameMessageListener("salastread:CommitTransaction", () => DB.database.commitTransaction());
		// YT Title Listeners
		Utils.addFrameMessageListener("salastread:GetVideoTitleCacheInfo", (vidId) => DB.videoTitleCache[vidId]);
		Utils.addFrameMessageListener("salastread:SetVideoTitleCacheInfo", ({vidId, newTitle}) => {
			DB.videoTitleCache[vidId] = newTitle;
		});
		// Imgur Workaround Listeners
		Utils.addFrameMessageListener("salastread:GetImgurWorkaroundInfo", (imgurId) => DB.imgurWorkaroundCache[imgurId]);
		Utils.addFrameMessageListener("salastread:SetImgurWorkaroundTrue", (imgurId) => {
			DB.imgurWorkaroundCache[imgurId] = true;
		});
		Utils.addFrameMessageListener("salastread:SetImgurWorkaroundFalse", (imgurId) => {
			DB.imgurWorkaroundCache[imgurId] = false;
		});
		// gif conversion listeners
		Utils.addFrameMessageListener("salastread:GetImgurGifInfo", (imgurId) => DB.imgurGifCache[imgurId]);
		Utils.addFrameMessageListener("salastread:SetImgurGifInfo", ({imgurId, success}) => {
			DB.imgurGifCache[imgurId] = success;
		});
	},

};
DB.init();

function forumListUpdate(xmlstr)
{
	let oDomParser = Cc["@mozilla.org/xmlextras/domparser;1"]
						.createInstance(Ci.nsIDOMParser);
	let forumsDoc = oDomParser.parseFromString(xmlstr, "text/xml");

	DB.forumListXml = forumsDoc;
	DB.gotForumList = true;
}

function setThreadTitleWrapper({threadid, title})
{
	return DB.setThreadTitle(threadid, title);
}

function setUserNameWrapper({userid, username})
{
	return DB.setUserName(userid, username);
}

function toggleAvatarHiddenWrapper({userid, username})
{
	return DB.toggleAvatarHidden(userid, username);
}

function addModWrapper({userid, username})
{
	return DB.addMod(userid, username);
}

function addAdminWrapper({userid, username})
{
	return DB.addAdmin(userid, username);
}
