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

		if(!doc.location)
			return;

		// nsSimpleURIs don't have a .host, so check this
		try
		{
			doc.location.host;
			var simpleURI = false;
		}
		catch (ex)
		{
			var simpleURI = true;
		}

		// Bail if we need to
		if (simpleURI || doc.location.host.search(/^(forum|archive)s?\.somethingawful\.com$/i) === -1 || PageLoadHandler.Prefs.getPref("disabled"))
		{
			return;
		}
		if (doc.__salastread_processed)
		{
			return;
		}

		// Find the proper page handler
		try
		{
			var pageHandler;
			var pageName = doc.location.pathname.match(/^\/(\w+)\.php/i);
			if (pageName)
			{
				switch(pageName[1])
				{
					case "index":
						pageHandler = PageLoadHandler.IndexHandler.handleIndex;
						break;

					case "usercp":
					case "bookmarkthreads":
						pageHandler = PageLoadHandler.BookmarkedThreadsHandler.handleBookmarkedThreads;
						break;

					case "account":
						pageHandler = PageLoadHandler.AccountHandler.handleAccount;
						break;

					case "forumdisplay":
						pageHandler = PageLoadHandler.ForumDisplayHandler.handleForumDisplay;
						break;

					case "showthread":
						pageHandler = PageLoadHandler.ShowThreadHandler.handleShowThread;
						break;

					case "newreply":
						pageHandler = PageLoadHandler.QuickQuoteHelper.handleNewReply;
						break;

					case "editpost":
						pageHandler = PageLoadHandler.QuickQuoteHelper.handleEditPost;
						break;

					case "supportmail":
						pageHandler = PageLoadHandler.SupportHandler.handleSupport;
						break;

					case "stats":
						pageHandler = PageLoadHandler.handleStats;
						break;

					case "misc":
						pageHandler = PageLoadHandler.MiscHandler.handleMisc;
						break;
						
					case "member":
						pageHandler = PageLoadHandler.ProfileViewHandler.handleProfileView;
						break;

					case "search":
						pageHandler = PageLoadHandler.SearchHandler.handleOldSearch;
						break;

					case "modqueue":
						pageHandler = PageLoadHandler.handleModQueue;
						break;

					case "query":
						pageHandler = PageLoadHandler.SearchHandler.handleQuery;
						break;
				}
			}
			else
			{
				// Search results
				if (doc.location.pathname === '/f/search/result')
					pageHandler = PageLoadHandler.SearchHandler.handleSearch;
			}

			// Don't try to format the page if it's not supported
			if (pageHandler)
			{
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

				PageLoadHandler.Timer.timerPageCount++;
			}

			doc.__salastread_processed = true;
		}
		catch(ex)
		{
			if(!e.runSilent)
			{
				if (typeof(ex) == "object")
				{
					var errstr = "";
					for ( var tn in ex )
					{
						errstr += tn + ": " + ex[tn] + "\n";
					}

					if (!PageLoadHandler.DB || !PageLoadHandler.Prefs.getPref('suppressErrors'))
					{
						//window.console.log("SALastRead application err: "+errstr);
						PageLoadHandler.PageUtils.logToConsole("SALastRead application err: "+ex);
						PageLoadHandler.PageUtils.logToConsole("SALastRead application err: "+ex);
						PageLoadHandler.PageUtils.logToConsole("Filename: " + ex.fileName);
						PageLoadHandler.PageUtils.logToConsole("Line: " + ex.lineNumber);
					}
				}
			}
			else
			{
				throw ex;
			}
		}
	},

	pageOnBeforeUnload: function(e)
	{
		if (e.originalTarget.__salastread_processed)
		{
			PageLoadHandler.Timer.timerPageCount--;
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
		if (doc.getElementsByName('t_forumid'))
		{
			// The forum list is here so let's update it
			//PageLoadHandler.grabForumList(doc);
		}
	},

	handleModQueue: function(doc)
	{
	},


};
