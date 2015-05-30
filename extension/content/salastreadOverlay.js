Components.utils.import("resource://gre/modules/Services.jsm");
function salr_require(module)
{
  let result = {};
  result.wrappedJSObject = result;
  Services.obs.notifyObservers(result, "salr-require", module);
  return result.exports;
}
// gSALR will (hopefully) be our only global object per window
var gSALR = {
	// requiring modules here to avoid scope pollution for now
	DB: salr_require("db").DB,
	Prefs: salr_require("prefs").Prefs,
	PageUtils: salr_require("pageUtils").PageUtils,
	ShowThreadHandler: salr_require("showthreadHandler").ShowThreadHandler,
	Navigation: salr_require("navigation").Navigation,
	Styles: salr_require("styles").Styles,
	Timer: salr_require("timer").Timer,
	Notifications: salr_require("notifications").Notifications,
	MiscHandler: salr_require("miscHandler").MiscHandler,
	ProfileViewHandler: salr_require("profileViewHandler").ProfileViewHandler,
	SupportHandler: salr_require("supportHandler").SupportHandler,
	ForumDisplayHandler: salr_require("forumDisplayHandler").ForumDisplayHandler,
	BookmarkedThreadsHandler: salr_require("bookmarkedThreadsHandler").BookmarkedThreadsHandler,
	SearchHandler: salr_require("searchHandler").SearchHandler,
	IndexHandler: salr_require("indexHandler").IndexHandler,
	AccountHandler: salr_require("accountHandler").AccountHandler,

	// keeps track of how many SA timer-tracked pages are open
	timerPageCount: 0,

	intervalId: null,
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Core Funtions & Events /////////////////////////////////////////////////////////////////////////////////////////////


	onDOMLoad: function(e)
	{
		var appcontent = document.getElementById("appcontent"); // browser
		var doc = e.originalTarget; // document

		if(!appcontent || !doc.location) return;

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
		if (simpleURI || doc.location.host.search(/^(forum|archive)s?\.somethingawful\.com$/i) === -1 || gSALR.Prefs.getPref("disabled"))
		{
			return;
		}
		if (doc.__salastread_processed)
		{
			return;
		}

		// Set a listener on the context menu
		if (gSALR.Prefs.getPref("enableContextMenu") && gSALR.Prefs.getPref("disabled") === false)
			document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", gSALR.contextMenuShowing, false);

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
						pageHandler = gSALR.IndexHandler.handleIndex;
						break;

					case "usercp":
					case "bookmarkthreads":
						pageHandler = gSALR.BookmarkedThreadsHandler.handleBookmarkedThreads;
						break;

					case "account":
						pageHandler = gSALR.AccountHandler.handleAccount;
						break;

					case "forumdisplay":
						pageHandler = gSALR.ForumDisplayHandler.handleForumDisplay;
						break;

					case "showthread":
						pageHandler = gSALR.ShowThreadHandler.handleShowThread;
						break;

					case "newreply":
						pageHandler = gSALR.handleNewReply;
						break;

					case "editpost":
						pageHandler = gSALR.handleEditPost;
						break;

					case "supportmail":
						pageHandler = gSALR.SupportHandler.handleSupport;
						break;

					case "stats":
						pageHandler = gSALR.handleStats;
						break;

					case "misc":
						pageHandler = gSALR.MiscHandler.handleMisc;
						break;
						
					case "member":
						pageHandler = gSALR.ProfileViewHandler.handleProfileView;
						break;

					case "search":
						pageHandler = gSALR.SearchHandler.handleOldSearch;
						break;

					case "modqueue":
						pageHandler = gSALR.handleModQueue;
						break;

					case "query":
						pageHandler = gSALR.SearchHandler.handleQuery;
						break;
				}
			}
			else
			{
				// Search results
				if (doc.location.pathname === '/f/search/result')
					pageHandler = gSALR.SearchHandler.handleSearch;
			}

			// Don't try to format the page if it's not supported
			if (pageHandler)
			{
				// Append custom CSS files to the head
				if (gSALR.Prefs.getPref("gestureEnable"))
					gSALR.PageUtils.insertCSSAsLink(doc, "chrome://salastread/content/css/gestureStyling.css");
				if (gSALR.Prefs.getPref("enablePageNavigator") || gSALR.Prefs.getPref("enableForumNavigator"))
					gSALR.PageUtils.insertCSSAsLink(doc, "chrome://salastread/content/css/pageNavigator.css");

				// Insert a text link to open the options menu
				if (gSALR.Prefs.getPref('showTextConfigLink'))
					gSALR.PageUtils.insertSALRConfigLink(doc);

				// Remove the page title prefix/postfix
				if (gSALR.Prefs.getPref("removePageTitlePrefix"))
					doc.title = gSALR.PageUtils.getCleanPageTitle(doc);

				// Call the proper handler for this type of page
				pageHandler(doc);

				gSALR.handleBodyClassing(doc);

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

				gSALR.timerPageCount++;
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

					if (!gSALR.DB || !gSALR.Prefs.getPref('suppressErrors'))
					{
						//window.console.log("SALastRead application err: "+errstr);
						window.alert("SALastRead application err: "+ex);
						window.console.log("SALastRead application err: "+ex);
						window.console.log("Filename: " + ex.fileName);
						window.console.log("Line: " + ex.lineNumber);
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
			gSALR.timerPageCount--;
			gSALR.Timer.SaveTimerValue();
		}
		if (gSALR.quickWindowParams.doc && e.originalTarget == gSALR.quickWindowParams.doc)
		{
			if (gSALR.quickQuoteSubmitting)
			{
				return true;
			}

			if (gSALR.quickquotewin && !gSALR.quickquotewin.closed)
			{
				gSALR.quickquotewin.detachFromDocument();
			}
			return true;
		}
	},


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Page Handlers ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	handleEditPost: function(doc)
	{
		var submitbtn = gSALR.PageUtils.selectNodes(doc, doc.body, "//INPUT[@type='submit'][@value='Save Changes']")[0];
		var tarea = gSALR.PageUtils.selectNodes(doc, doc.body, "//TEXTAREA[@name='message']")[0];
		if (submitbtn && tarea) {
			submitbtn.addEventListener("click", function() { gSALR.parsePLTagsInEdit(tarea); }, true);
			submitbtn.style.backgroundColor = gSALR.Prefs.getPref('postedInThreadRe');
		}
	},

	handleNewReply: function(doc)
	{
		var threadlink = gSALR.PageUtils.selectSingleNode(doc, doc.body, "DIV[contains(@id, 'container')]//div[@class='breadcrumbs']//A[contains(@href,'showthread.php')][contains(@href,'threadid=')]");
		if (threadlink)
		{
			var tlmatch = threadlink.href.match( /threadid=(\d+)/ );
			if (tlmatch)
			{
				var threadid = tlmatch[1];
				if (gSALR.needRegReplyFill)
				{
					var msgEl = gSALR.PageUtils.selectSingleNode(doc, doc.body, "//TEXTAREA[@name='message']");
					if (msgEl)
					{
						msgEl.value = gSALR.savedQuickReply;
					}
					gSALR.needRegReplyFill = false;
				}
				var postbtn = gSALR.PageUtils.selectSingleNode(doc, doc.body, "//FORM[@name='vbform']//INPUT[@name='submit']");
				if (postbtn)
				{
					postbtn.addEventListener("click", function() { gSALR.DB.iPostedHere(threadid); }, true);
					postbtn.style.backgroundColor = gSALR.Prefs.getPref('postedInThreadRe');
				}
			}
		}
		else
		{
			if (gSALR.savedQuickReply!="")
			{
				// TODO: Check if the stuff immediately below is broken.
				var forgeCheck = gSALR.PageUtils.selectSingleNode(doc, doc.body, "TABLE/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[2]/TD[1]/FONT[contains(text(),'have been forged')]");
				if (forgeCheck)
				{
					gSALR.DB.__cachedFormKey = "";
					var reqMsg = doc.createElement("P");
					reqMsg.style.fontFamily = "Verdana, Arial, Helvetica";
					reqMsg.style.fontSize = "80%";
					reqMsg.style.backgroundColor = "#fcfd99";
					reqMsg.style.border = "1px solid black";
					reqMsg.style.padding = "2px 2px 2px 2px";
					reqMsg.appendChild(
						doc.createTextNode("Message from SA Last Read: Quick Reply appears to have worked incorrectly. To open your reply in a regular forum reply page, click ")
					);
					var regReplyLink = doc.createElement("A");
					// TODO: This likely will need to be changed to an addeventlistener
					regReplyLink.onclick = function() { gSALR.needRegReplyFill = true; };
					regReplyLink.href = "http://forums.somethingawful.com/newreply.php?s=&action=newreply&threadid=" +
					gSALR.savedQuickReplyThreadId;
					regReplyLink.textContent = "here.";
					reqMsg.appendChild(regReplyLink);
					forgeCheck.parentNode.insertBefore(reqMsg, forgeCheck);
				}
				else
				{
					gSALR.savedQuickReply = "";
					gSALR.savedQuickReplyThreadId = "";
				}
			}
		}
	},

	handleStats: function(doc)
	{
		if (doc.getElementsByName('t_forumid'))
		{
			// The forum list is here so let's update it
			//gSALR.grabForumList(doc);
		}
	},

	handleModQueue: function(doc)
	{
	},


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Utility Functions ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	timerTick: function()
	{
		if (gSALR.timerPageCount > 0)
		{
			gSALR.Timer.PingTimer();
		}
	},


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CSS & Formatting Functions //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	// This function should be removed if SALR ever allows more detailed color settings (backgrounds, font colors, etc)
	handleBodyClassing: function(doc)
	{
		var phmatch = doc.location.href.match( /\/([^\/]*)\.php/ );
		if (phmatch)
		{
			var addclass = " somethingawfulforum_"+phmatch[1]+"_php";
			var docbody = doc.body;
			if (docbody)
				docbody.className += addclass;

		}
	},


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Context Menu Functions //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	showContextMenuItems: function(showunread)
	{
		var cacm = document.getElementById("contentAreaContextMenu");
		var mopt = document.getElementById("salastread-context-menu");
		var moptsep = document.getElementById("salastread-context-menuseparator");

		if(gSALR.Prefs.getPref('contextMenuOnBottom') )
		{
			cacm.appendChild(moptsep);
			cacm.appendChild(mopt);
		}
		else
		{
			cacm.insertBefore(moptsep, cacm.firstChild);
			cacm.insertBefore(mopt, moptsep);
		}

		mopt.setAttribute('hidden', false);
		moptsep.setAttribute('hidden', false);
		document.getElementById("salastread-context-ignorethread").setAttribute('hidden', false);
		document.getElementById("salastread-context-starthread").setAttribute('hidden', false);
		if (showunread)
			document.getElementById("salastread-context-unreadthread").setAttribute('hidden', false);
	},

	hideContextMenuItems: function()
	{
		document.getElementById("salastread-context-menu").setAttribute('hidden', true);
		document.getElementById("salastread-context-menuseparator").setAttribute('hidden', true);
		document.getElementById("salastread-context-ignorethread").setAttribute('hidden', true);
		document.getElementById("salastread-context-starthread").setAttribute('hidden', true);
		document.getElementById("salastread-context-unreadthread").setAttribute('hidden', true);
	},

	contextMenuShowing: function(e)
	{
		if (e.originalTarget == document.getElementById("contentAreaContextMenu"))
		{
			gSALR.hideContextMenuItems();
			try
			{
				var doc = document.getElementById("content").mCurrentBrowser.contentDocument;
				if (doc.__salastread_processed === true)
				{
					if (gSALR.Prefs.getPref("enableContextMenu"))
						gSALR.contextVis();
				}
			}
			catch (ex) {}
		}
	},

	contextVis: function()
	{
		var target = gContextMenu.target;
		var threadid = null;

		while (target)
		{
			if (target.className)
			{
				var tidmatch = target.className.match(/salastread_thread_(\d+)/);
				if (tidmatch)
				{
					threadid = tidmatch[1];
					document.getElementById("salastread-context-ignorethread").data = threadid;
					document.getElementById("salastread-context-ignorethread").target = target;
					document.getElementById("salastread-context-ignorethread").setAttribute('label','Ignore This Thread (' + threadid + ')');
					document.getElementById("salastread-context-starthread").data = threadid;
					document.getElementById("salastread-context-starthread").target = target;
					document.getElementById("salastread-context-starthread").setAttribute('label',(gSALR.DB.isThreadStarred(threadid) ? 'Unstar' : 'Star') + ' This Thread (' + threadid + ')');
					document.getElementById("salastread-context-unreadthread").data = threadid;
					document.getElementById("salastread-context-unreadthread").target = target;
					document.getElementById("salastread-context-unreadthread").setAttribute('label','Mark This Thread Unread (' + threadid + ')');
					var pageName = target.ownerDocument.location.pathname.match(/^\/(\w+)\.php/i);
					if (pageName)
					{
						switch(pageName[1])
						{
							case "showthread":
								gSALR.showContextMenuItems(true);
								break;
							default:
								gSALR.showContextMenuItems(false);
						}
					}
				}
			}
			target = target.parentNode;
		}
	},

	starThread: function()
	{
		var threadid = document.getElementById("salastread-context-starthread").data;
		var target = document.getElementById("salastread-context-starthread").target;
		if (threadid)
		{
			var threadTitle;
			 // Snag the title we saved earlier
			if (target.ownerDocument.location.href.search(/showthread.php/i) == -1)
			{
				threadTitle = target.__salastread_threadtitle;
			}
			else
				threadTitle = gSALR.PageUtils.getCleanPageTitle(target.ownerDocument);

			var starStatus = gSALR.DB.isThreadStarred(threadid);
			gSALR.DB.toggleThreadStar(threadid);

			if (starStatus === false) // we just starred it
				gSALR.DB.setThreadTitle(threadid, threadTitle);
		}
	},

	ignoreThread: function()
	{
		let threadid = document.getElementById("salastread-context-ignorethread").data;
		let target = document.getElementById("salastread-context-ignorethread").target;
		if (threadid)
		{
			let threadTitle;
			 // Snag the title we saved earlier
			if (target.ownerDocument.location.href.search(/showthread.php/i) === -1)
			{
				threadTitle = target.__salastread_threadtitle;
			}
			else
				threadTitle = gSALR.PageUtils.getCleanPageTitle(target.ownerDocument);

			try
			{
				// e10s note: this will change if we're in a frame script
				let factory = Components.classes["@mozilla.org/prompter;1"]
									.getService(Components.interfaces.nsIPromptFactory);
				let prompt = factory.getPrompt(window.gBrowser.contentWindow, Components.interfaces.nsIPrompt);
				let bag = prompt.QueryInterface(Components.interfaces.nsIWritablePropertyBag2);
				bag.setPropertyAsBool("allowTabModal", true);
				let result = prompt.confirm.apply(null, ["SALR", "Are you sure you want to ignore thread #"+threadid+"?"]);
				if (result)
				{
					// Actually use ignoreStatus
					let ignoreStatus = gSALR.DB.isThreadIgnored(threadid);
					if (ignoreStatus === false)
					{
						gSALR.DB.toggleThreadIgnore(threadid);
						gSALR.DB.setThreadTitle(threadid, threadTitle);
						// todo: detect by if there is a "forum" node, to cover bookmark page and control panel
						if (target.ownerDocument.location.href.search(/showthread.php/i) === -1)
						{
							target.parentNode.removeChild(target);
						}
					}
				}
			}
			catch(e) { } // Prevent exception if user closes the tab
		}
	},

	unreadThread: function()
	{
		let threadid = document.getElementById("salastread-context-unreadthread").data;
		//let target = document.getElementById("salastread-context-unreadthread").target;
		if (threadid)
		{
			let xhr = new XMLHttpRequest();
			let xhrparams = "json=1&action=resetseen&threadid="+threadid;
			xhr.open("POST", "http://forums.somethingawful.com/showthread.php", true);
			// Ensure this load flag is set to prevent issues with third-party cookies being disabled
			xhr.channel.loadFlags |= Components.interfaces.nsIChannel.LOAD_DOCUMENT_URI;
			xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhr.setRequestHeader("Content-length", xhrparams.length);
			xhr.setRequestHeader("Connection", "close");
			xhr.onreadystatechange = function()
			{
				if (xhr.readyState == 4 && xhr.status == 200)
				{
					let result;
					if (xhr.responseText.match(/threadid/))
						result = "SALR:\n Thread #" + threadid + " marked as unread.";
					else
						result = "SALR:\n Something went wrong marking thread #" + threadid + "\n as unread! Please try again.";
					try
					{
						// e10s note: this will change if we're in a frame script
						let factory = Components.classes["@mozilla.org/prompter;1"]
											.getService(Components.interfaces.nsIPromptFactory);
						let prompt = factory.getPrompt(window.gBrowser.contentWindow, Components.interfaces.nsIPrompt);
						let bag = prompt.QueryInterface(Components.interfaces.nsIWritablePropertyBag2);
						bag.setPropertyAsBool("allowTabModal", true);
						prompt.alert.apply(null, ["SALR Alert", result]);
					}
					catch(e) { }
				}
			};
			xhr.send(xhrparams);
		}
	},


	// Quick Quote things

	quickquotewin: null,

	quickWindowParams: {
		quicktype: null,
		threadid: null,
		forumid: null,
		postid: null,
		doc: null,
	},

	quickButtonClicked: function(evt, forumid, threadid)
	{
		var quickbutton = evt.originalTarget;
		var doc = evt.originalTarget.ownerDocument;

		//var forumid = gSALR.PageUtils.getForumId(doc); // Make into event param
		//var threadid = gSALR.PageUtils.getThreadId(doc); // Ditto
		var postid;
		var quicktype = quickbutton.nextSibling.href.match(/action=(\w+)/i)[1];
		switch (quicktype)
		{
			case 'newreply':
				if (quickbutton.nextSibling.href.match(/threadid=(\d+)/i) != null)
				{
					quicktype = 'reply';
					break;
				}
				else
				{
					quicktype = 'quote';
				}
				/* falls through */
			case 'editpost':
				postid = quickbutton.nextSibling.href.match(/postid=(\d+)/i)[1];
				break;
			case 'newthread':
				break;
		}

//alert("Clicked: quicktype: " + quicktype + " threadid " + threadid + " forumid " + forumid + " postid " + postid);

		// Do we already have a window?
		if (gSALR.DB.__quickquotewindowObject && !gSALR.DB.__quickquotewindowObject.closed)
		{
			gSALR.quickquotewin = gSALR.DB.__quickquotewindowObject;
		}

		if (gSALR.quickquotewin && !gSALR.quickquotewin.closed)
		{
			try
			{
				// Clicked an edit button
				if (quicktype == 'editpost')
				{
					// There is already a quick window open. Is it an edit window?
					if (gSALR.quickWindowParams.quicktype == 'editpost')
					{
						// Is it the same post?
						if (gSALR.quickWindowParams.postid && gSALR.quickWindowParams.postid == postid)
						{
							// Attempt to reattach
							if (gSALR.quickquotewin.isDetached)
							{
								gSALR.quickWindowParams.doc = doc;
								gSALR.quickquotewin.reattach();
							}
						}
						else
						{
							if (window.confirm("You already have a quick edit window open, but it was attached to a different post.\nDo you want to change which post you're editing?"))
							{
								gSALR.quickWindowParams.quicktype = quicktype;
								gSALR.quickWindowParams.threadid = threadid;
								gSALR.quickWindowParams.forumid = forumid;
								gSALR.quickWindowParams.postid = postid;
								gSALR.quickWindowParams.doc = doc;
								gSALR.quickquotewin.reattach();
								gSALR.quickquotewin.importData();
							}
						}
					}
					else
					{
						if (window.confirm("You already have a quick window open. Press 'OK' to convert it to a quick edit window for this post, \nor press 'Cancel' to append this post to your quick window."))
						{
							gSALR.quickWindowParams.quicktype = quicktype;
							gSALR.quickWindowParams.threadid = threadid;
							gSALR.quickWindowParams.forumid = forumid;
							gSALR.quickWindowParams.postid = postid;
							gSALR.quickWindowParams.doc = doc;
							gSALR.quickquotewin.reattach();
							gSALR.quickquotewin.importData();
						}
						else
						{
							if (gSALR.quickquotewin.isDetached)
							{
								gSALR.quickWindowParams.doc = doc;
								gSALR.quickquotewin.reattach();
							}
							gSALR.quickquotewin.addQuoteFromPost(postid);
						}
					}
				}
				// Clicked a 'quote' button
				else if (quicktype == 'quote')
				{
					// Always add quotes when quote is clicked
					if (gSALR.quickquotewin.isDetached)
					{
						gSALR.quickWindowParams.doc = doc;
						gSALR.quickquotewin.reattach();
					}
					gSALR.quickquotewin.addQuoteFromPost(postid);
				}
				// Clicked a 'reply' button
				else if (quicktype == 'reply')
				{
					// Check if we need to reattach, otherwise offer to convert
					if (gSALR.quickWindowParams.quicktype && gSALR.quickWindowParams.quicktype == 'reply' && gSALR.quickWindowParams.threadid && gSALR.quickWindowParams.threadid == threadid)
					{
						if (gSALR.quickquotewin.isDetached)
						{
							gSALR.quickWindowParams.doc = doc;
							gSALR.quickquotewin.reattach();
						}
					}
					else
					{
						if (window.confirm("You already have a quick window open. Press 'OK' to convert it \nto a quick reply window for this thread, or press 'Cancel' to leave it alone."))
						{
							gSALR.quickWindowParams.quicktype = quicktype;
							gSALR.quickWindowParams.threadid = threadid;
							gSALR.quickWindowParams.forumid = forumid;
							gSALR.quickWindowParams.postid = postid;
							gSALR.quickWindowParams.doc = doc;
							gSALR.quickquotewin.reattach();
							gSALR.quickquotewin.importData();
						}				
					}
				}
				// Clicked anything else
				else
				{
					if (window.confirm("You already have a quick window open. Press 'OK' to convert it \nto a quick " + quicktype + " window, or press 'Cancel' to leave it alone."))
					{
						gSALR.quickWindowParams.quicktype = quicktype;
						gSALR.quickWindowParams.threadid = threadid;
						gSALR.quickWindowParams.forumid = forumid;
						gSALR.quickWindowParams.postid = postid;
						gSALR.quickWindowParams.doc = doc;
						gSALR.quickquotewin.reattach();
						gSALR.quickquotewin.importData();
					}
				}
				gSALR.quickquotewin.focus();
			}
			catch(ex)
			{
				//alert("Error communicating with the quick window: " + ex);
				gSALR.quickquotewin = window.open("chrome://salastread/content/quickquote.xul", "quickquote", "chrome, resizable=yes, width=800, height=400");
			}
		}
		else
		{
			// Set parameters
			gSALR.quickWindowParams.quicktype = quicktype;
			gSALR.quickWindowParams.threadid = threadid;
			gSALR.quickWindowParams.forumid = forumid;
			gSALR.quickWindowParams.postid = postid;
			gSALR.quickWindowParams.doc = doc;
			gSALR.quickquotewin = window.open("chrome://salastread/content/quickquote.xul", "quickquote", "chrome, resizable=yes, width=800, height=400");
		}

		if (gSALR.quickquotewin)
		{
			gSALR.DB.__quickquotewindowObject = gSALR.quickquotewin;
		}
		return false;
	},


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// (Old) Globals ////////////////////////////////////////////////////////////////////////////////////////////////////////////


	needRegReplyFill: false,
	quickQuoteSubmitting: false,
	savedQuickReply: "",
	savedQuickReplyThreadId: "",


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Quick Quote/Post/Edit/Whatever Functions ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	// Quick quote / edit post util functions
	convertPLTag: function(message)
	{
		return message.replace(/\[PL=(.*?)\](.*?)\[\/PL\]/g,"[URL=http://forums.somethingawful.com/showthread.php?s=&postid=$1#post$1]$2[/URL]");
	},

	parsePLTagsInEdit: function(tarea)
	{
	   var xtxt = tarea.value;
	   tarea.value = gSALR.convertPLTag(xtxt);
	},

	quickQuoteSubmit: function(message, parseurl, subscribe, disablesmilies, signature, subtype, formkey, attachfile, form_cookie)
	{
		try
		{
			message = gSALR.convertPLTag(message);
			gSALR.savedQuickReply = message;
			gSALR.savedQuickReplyThreadId = gSALR.quickWindowParams.threadid;

			var doc = gSALR.quickWindowParams.doc;
			var newform = doc.createElement("FORM");
				newform.style.display = "none";
				newform.action = "http://forums.somethingawful.com/newreply.php";

			newform.method = "post";
			newform.enctype = "multipart/form-data";
			gSALR.PageUtils.addHiddenFormInput(doc,newform,"s","");

			if (gSALR.quickWindowParams.quicktype == "newthread")
			{
				newform.action = "http://forums.somethingawful.com/newthread.php";
				gSALR.PageUtils.addHiddenFormInput(doc, newform,"action", "postthread");
				gSALR.PageUtils.addHiddenFormInput(doc, newform, "forumid",  gSALR.quickWindowParams.forumid);
				gSALR.PageUtils.addHiddenFormInput(doc, newform, "iconid", gSALR.quickquotewin.document.getElementById('posticonbutton').iconid);
				gSALR.PageUtils.addHiddenFormInput(doc, newform, "subject", gSALR.quickquotewin.document.getElementById('subject').value);
			}
			else if (gSALR.quickWindowParams.quicktype == "editpost")
			{
				newform.action = "http://forums.somethingawful.com/editpost.php";
				gSALR.PageUtils.addHiddenFormInput(doc, newform,"action", "updatepost");
				gSALR.PageUtils.addHiddenFormInput(doc, newform, "postid", gSALR.quickWindowParams.postid);
			}
			else if (gSALR.quickWindowParams.quicktype == "quote" || gSALR.quickWindowParams.quicktype == "reply")
			{
				gSALR.PageUtils.addHiddenFormInput(doc, newform,"action", "postreply");
				gSALR.PageUtils.addHiddenFormInput(doc, newform,"threadid", gSALR.quickWindowParams.threadid);
			}

			gSALR.PageUtils.addHiddenFormInput(doc, newform,"parseurl", parseurl ? "yes" : "");
			gSALR.PageUtils.addHiddenFormInput(doc, newform,"bookmark", subscribe ? "yes" : "");
			gSALR.PageUtils.addHiddenFormInput(doc, newform,"disablesmilies", disablesmilies ? "yes" : "");
			gSALR.PageUtils.addHiddenFormInput(doc, newform,"signature", signature ? "yes" : "");
			gSALR.PageUtils.addHiddenFormInput(doc, newform,"message", message);
			gSALR.PageUtils.addHiddenFormInput(doc, newform,"MAX_FILE_SIZE", "2097152");
			gSALR.PageUtils.addHiddenFormInput(doc, newform,"formkey", formkey);

			if (form_cookie != "")
			{
				gSALR.PageUtils.addHiddenFormInput(doc, newform,"form_cookie", form_cookie);
			}
			if (attachfile != "")
			{
				gSALR.quickQuoteAddFile(doc, newform,"attachment", attachfile);
			}
			newform.__submit = newform.submit;

			if (gSALR.quickWindowParams.quicktype != "newthread")
			{
				if (subtype=="submit")
				{
					gSALR.PageUtils.addHiddenFormInput(doc,newform,"submit","Submit Reply");
					gSALR.DB.iPostedHere(gSALR.quickWindowParams.threadid);
				}
				else
				{
					gSALR.PageUtils.addHiddenFormInput(doc,newform,"preview","Preview Reply");
				}
			}
			else
			{
				gSALR.PageUtils.addHiddenFormInput(doc,newform,"preview","Preview Post");
			}
			doc.body.appendChild(newform);
			gSALR.quickQuoteSubmitting = true;
			newform.__submit();
			gSALR.quickquotewin.close();
		}
		catch(e)
		{
			alert("err: " + e);
		}
	},

	quickQuoteAddFile: function(doc,form,name,value)
	{
	   var newel = doc.createElement("INPUT");
	   newel.type = "file";
	   newel.name = name;
	   newel.value = value;
	   form.appendChild(newel);
	},

	releaseQuickQuoteVars: function()
	{
		gSALR.quickWindowParams.quicktype = null;
		gSALR.quickWindowParams.threadid = null;
		gSALR.quickWindowParams.forumid = null;
		gSALR.quickWindowParams.postid = null;
		gSALR.quickWindowParams.doc = null;
		gSALR.quickQuoteSubmitting = false;
		gSALR.quickquotewin = null;
	},


};
