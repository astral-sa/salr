/**
 * @fileOverview Handles content page load/unload events.
 *                   Note: File in transition - some old overlay relics still present.
 */

Components.utils.import("resource://gre/modules/Services.jsm");

let PageLoadHandler = exports.PageLoadHandler = {
	// relics;
	Prefs: require("prefs").Prefs,
	PageUtils: require("pageUtils").PageUtils,
	Styles: require("styles").Styles,
	Timer: require("timer").Timer,

	ShowThreadHandler: require("showthreadHandler").ShowThreadHandler,
	MiscHandler: require("miscHandler").MiscHandler,
	ProfileViewHandler: require("profileViewHandler").ProfileViewHandler,
	SupportHandler: require("supportHandler").SupportHandler,
	ForumDisplayHandler: require("forumDisplayHandler").ForumDisplayHandler,
	BookmarkedThreadsHandler: require("bookmarkedThreadsHandler").BookmarkedThreadsHandler,
	SearchHandler: require("searchHandler").SearchHandler,
	IndexHandler: require("indexHandler").IndexHandler,
	AccountHandler: require("accountHandler").AccountHandler,
	QuickQuoteHelper: require("quickQuoteHelper").QuickQuoteHelper,

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Core Funtions & Events /////////////////////////////////////////////////////////////////////////////////////////////


	onDOMLoad: function(e)
	{
		var doc = e.originalTarget; // document

		// Bail if we need to
		if (!PageLoadHandler.isValidDocumentForHandling(doc))
			return;

		// Find the proper page handler
		try
		{
			var pageHandler;
			var pageName = doc.location.pathname.match(/^\/(\w+)\.php/i);
			if (!pageName)
			{
				// Search results are the only non-.php page we handle
				if (doc.location.pathname !== '/f/search/result')
					return;
				pageHandler = PageLoadHandler.SearchHandler.handleSearch;
			}

			/**
			 * Object mapping (key).php -> handler
			 * @type {Object}
			 */
			let handlers = {
				index: PageLoadHandler.IndexHandler.handleIndex,
				usercp: PageLoadHandler.BookmarkedThreadsHandler.handleBookmarkedThreads,
				bookmarkthreads: PageLoadHandler.BookmarkedThreadsHandler.handleBookmarkedThreads,
				account: PageLoadHandler.AccountHandler.handleAccount,
				forumdisplay: PageLoadHandler.ForumDisplayHandler.handleForumDisplay,
				showthread: PageLoadHandler.ShowThreadHandler.handleShowThread,
				newreply: PageLoadHandler.QuickQuoteHelper.handleNewReply,
				editpost: PageLoadHandler.QuickQuoteHelper.handleEditPost,
				supportmail: PageLoadHandler.SupportHandler.handleSupport,
				stats: PageLoadHandler.handleStats,
				misc: PageLoadHandler.MiscHandler.handleMisc,
				member: PageLoadHandler.ProfileViewHandler.handleProfileView,
				search: PageLoadHandler.SearchHandler.handleOldSearch,
				modqueue: PageLoadHandler.handleModQueue,
				query: PageLoadHandler.SearchHandler.handleQuery
			};
			if (handlers.hasOwnProperty(pageName[1]))
			{
				pageHandler = handlers[pageName[1]];
			}

			// Don't try to format the page if it's not supported
			if (!pageHandler)
				return;

			// Append custom CSS files to the head
			if (PageLoadHandler.Prefs.getPref("gestureEnable"))
				PageLoadHandler.PageUtils.insertCSSAsLink(doc, "chrome://salastread/content/css/gestureStyling.css");
			if (PageLoadHandler.Prefs.getPref("enablePageNavigator") || PageLoadHandler.Prefs.getPref("enableForumNavigator"))
				PageLoadHandler.PageUtils.insertCSSAsLink(doc, "chrome://salastread/content/css/pageNavigator.css");

			// Insert a text link to open the options menu
			if (PageLoadHandler.Prefs.getPref('showTextConfigLink'))
				PageLoadHandler.PageUtils.insertSALRConfigLink(doc);

			// Remove the page title prefix/postfix
			if (PageLoadHandler.Prefs.getPref("removePageTitlePrefix"))
				doc.title = PageLoadHandler.PageUtils.getCleanPageTitle(doc);

			// Call the proper handler for this type of page
			pageHandler(doc);

			PageLoadHandler.Styles.handleBodyClassing(doc);

	// Is this necessary anymore?
			var screl;
			var head = doc.getElementsByTagName('head')[0];
			if (head)
			{
				// XXX: The unload prevents FF 1.5 from using Quick Back Button.
				//      SALR needs to work with it, but this works to prevent trouble in the meantime.
				screl = doc.createElement("SCRIPT");
				screl.setAttribute("language","javascript");
				screl.setAttribute("src","chrome://salastread/content/pageunload.js");
				head.appendChild(screl);
			}
	// 

			PageLoadHandler.Timer.incrementPageCount();
			doc.__salastread_processed = true;
		}
		catch(ex)
		{
			if (e.runSilent)
				throw ex;

			if (typeof(ex) !== "object")
				return;

			if (!PageLoadHandler.DB || !PageLoadHandler.Prefs.getPref('suppressErrors'))
			{
				let win = doc.defaultView;
				win.alert("SALastRead application err: " + ex);
				PageLoadHandler.PageUtils.logToConsole("SALastRead application err: "+ex);
				PageLoadHandler.PageUtils.logToConsole("SALastRead application err: "+ex);
				PageLoadHandler.PageUtils.logToConsole("Filename: " + ex.fileName);
				PageLoadHandler.PageUtils.logToConsole("Line: " + ex.lineNumber);
			}
		}
	},

	/**
	 * Helper function for DOM loads.
	 * @param  {Element} doc Document element to examine.
	 * @return {boolean} Whether we should handle the document.
	 */
	isValidDocumentForHandling: function(doc)
	{
		if(!doc.location)
			return false;

		let simpleURI = false;
		// nsSimpleURIs don't have a .host, so check this
		try
		{
			doc.location.host;
		}
		catch (ex)
		{
			simpleURI = true;
		}

		// Bail if we need to
		if (simpleURI || doc.location.host.search(/^(forum|archive)s?\.somethingawful\.com$/i) === -1 || PageLoadHandler.Prefs.getPref("disabled"))
		{
			return false;
		}
		if (doc.__salastread_processed)
		{
			return false;
		}
		return true;
	},

	/**
	 * Decrements our timer page count and detaches Quick Quote if necessary.
	 * @param {Event} e The unload event.
	 */
	pageOnBeforeUnload: function(e)
	{
		if (e.originalTarget.__salastread_processed)
		{
			PageLoadHandler.Timer.decrementPageCount();
			PageLoadHandler.Timer.SaveTimerValue();
		}
		if (PageLoadHandler.QuickQuoteHelper.quickWindowParams.doc && e.originalTarget == PageLoadHandler.QuickQuoteHelper.quickWindowParams.doc)
		{
			if (PageLoadHandler.QuickQuoteHelper.quickQuoteSubmitting)
			{
				return true;
			}

			if (PageLoadHandler.QuickQuoteHelper.quickquotewin && !PageLoadHandler.QuickQuoteHelper.quickquotewin.closed)
			{
				PageLoadHandler.QuickQuoteHelper.quickquotewin.detachFromDocument();
			}
			return true;
		}
	},


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Page Handlers ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// (stubs)

	handleStats: function(doc)
	{
		/* We don't use this function anymore since it would insert a bunch of unused forums.
		if (doc.getElementsByName('t_forumid'))
		{
			// The forum list is here so let's update it
			PageLoadHandler.grabForumList(doc);
		}
		*/
	},

	handleModQueue: function(doc)
	{
	},


};
