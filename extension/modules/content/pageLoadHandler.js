/**
 * @fileOverview Handles content page load/unload events.
 */

Cu.import("resource://gre/modules/Services.jsm");

let {PageUtils} = require("../pageUtils");
let {Prefs} = require("./prefsHelper");
let {Styles} = require("./stylesHelper");
// Used for optimization for page unload checking to detach quick windows:
let {QuickQuoteHelper} = require("./quickQuoteHelper");

let PageLoadHandler = exports.PageLoadHandler = {
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Core Funtions & Events /////////////////////////////////////////////////////////////////////////////////////////////


	init: function()
	{
		addEventListener("DOMContentLoaded", PageLoadHandler.onDOMLoad, true);
		addEventListener('beforeunload', PageLoadHandler.pageOnBeforeUnload, true);
		onShutdown.add(function(){
			removeEventListener("DOMContentLoaded", PageLoadHandler.onDOMLoad, true);
			removeEventListener('beforeunload', PageLoadHandler.pageOnBeforeUnload, true);
		});
	},

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
				return;

			/**
			 * Object mapping (key).php -> handler
			 * @type {Object}
			 */
			let handlers = {
				index: PageLoadHandler.handleIndex,
				showthread: PageLoadHandler.handleShowThread,
				usercp: PageLoadHandler.handleBookmarkedThreads,
				bookmarkthreads: PageLoadHandler.handleBookmarkedThreads,
				forumdisplay: PageLoadHandler.handleForumDisplay,
				newreply: PageLoadHandler.handleNewReply,
				editpost: PageLoadHandler.handleEditPost,
				misc: PageLoadHandler.handleMisc,
				query: PageLoadHandler.handleQuery,
				member: PageLoadHandler.handleProfileView,
				account: PageLoadHandler.handleAccount,
				supportmail: PageLoadHandler.handleSupport,
				stats: PageLoadHandler.handleStats,
				modqueue: PageLoadHandler.handleModQueue,
			};
			if (handlers.hasOwnProperty(pageName[1]))
			{
				pageHandler = handlers[pageName[1]];
			}

			// Don't try to format the page if it's not supported
			if (!pageHandler)
				return;

			// Append custom CSS files to the head
			if (Prefs.getPref("gestureEnable"))
				PageUtils.insertCSSAsLink(doc, "chrome://salastread/content/css/gestureStyling.css");
			if (Prefs.getPref("enablePageNavigator") || Prefs.getPref("enableForumNavigator"))
				PageUtils.insertCSSAsLink(doc, "chrome://salastread/content/css/pageNavigator.css");

			// Insert a text link to open the options menu
			if (Prefs.getPref('showTextConfigLink'))
				PageUtils.insertSALRConfigLink(doc);

			// Remove the page title prefix/postfix
			if (Prefs.getPref("removePageTitlePrefix"))
				doc.title = PageUtils.getCleanPageTitle(doc);

			// Call the proper handler for this type of page
			pageHandler(doc);

			Styles.handleBodyClassing(doc);

			sendAsyncMessage("salastread:TimerCountInc");

			doc.__salastread_processed = true;
		}
		catch(ex)
		{
			if (e.runSilent)
				throw ex;

			if (typeof(ex) !== "object")
				return;

			if (!Prefs.getPref('suppressErrors'))
			{
				let win = doc.defaultView;
				win.alert("SALastRead application err: " + ex);
				PageUtils.logToConsole("SALastRead application err: "+ex);
				PageUtils.logToConsole("Filename: " + ex.fileName);
				PageUtils.logToConsole("Line: " + ex.lineNumber);
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
		if (simpleURI || doc.location.host.search(/^(forum|archive)s?\.somethingawful\.com$/i) === -1 || Prefs.getPref("disabled"))
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
			sendAsyncMessage("salastread:TimerCountDec");

		// Check if this page was still attached to a Quick Quote window
		if (QuickQuoteHelper.pageWasAttached === true)
		{
			sendAsyncMessage("salastread:QuickQuoteCheckUnload", null);
			QuickQuoteHelper.pageWasAttached = false;
		}
	},


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Page Handlers ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	handleIndex: function(doc)
	{
		let {IndexHandler} = require("./indexHandler");
		return IndexHandler.handleIndex(doc);
	},

	handleBookmarkedThreads: function(doc)
	{
		let {BookmarkedThreadsHandler} = require("./bookmarkedThreadsHandler");
		return BookmarkedThreadsHandler.handleBookmarkedThreads(doc);
	},

	handleForumDisplay: function(doc)
	{
		let {ForumDisplayHandler} = require("./forumDisplayHandler");
		return ForumDisplayHandler.handleForumDisplay(doc);
	},

	handleShowThread: function(doc)
	{
		let {ShowThreadHandler} = require("./showthreadHandler");
		return ShowThreadHandler.handleShowThread(doc);	
	},

	handleNewReply: function(doc)
	{
		let {QuickQuoteHelper} = require("./quickQuoteHelper");
		return QuickQuoteHelper.handleNewReply(doc);	
	},

	handleEditPost: function(doc)
	{
		let {QuickQuoteHelper} = require("./quickQuoteHelper");
		return QuickQuoteHelper.handleEditPost(doc);	
	},

	handleMisc: function(doc)
	{
		let {MiscHandler} = require("./miscHandler");
		return MiscHandler.handleMisc(doc);	
	},

	handleQuery: function(doc)
	{
		let {SearchHandler} = require("./searchHandler");
		return SearchHandler.handleQuery(doc);
	},

	handleProfileView: function(doc)
	{
		let {ProfileViewHandler} = require("./profileViewHandler");
		return ProfileViewHandler.handleProfileView(doc);
	},

	handleAccount: function(doc)
	{
		let {AccountHandler} = require("./accountHandler");
		return AccountHandler.handleAccount(doc);
	},

	handleSupport: function(doc)
	{
		let {SupportHandler} = require("./supportHandler");
		return SupportHandler.handleSupport(doc);
	},


	// stubs:

	// We don't use this function to get the forum list anymore
	// since it would insert a bunch of unused forums.
	handleStats: function(doc)
	{
	},

	handleModQueue: function(doc)
	{
	},


};

PageLoadHandler.init();
