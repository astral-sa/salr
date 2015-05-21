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
	PostHandler: salr_require("postHandler").PostHandler,
	Navigation: salr_require("navigation").Navigation,
	Styles: salr_require("styles").Styles,
	Timer: salr_require("timer").Timer,
	Notifications: salr_require("notifications").Notifications,

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
		if (simpleURI || doc.location.host.search(/^(forum|archive)s?\.somethingawful\.com$/i) == -1 || gSALR.Prefs.getPref("disabled"))
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
						pageHandler = gSALR.handleIndex;
						break;

					case "usercp":
					case "bookmarkthreads":
						pageHandler = gSALR.handleSubscriptions;
						break;

					case "account":
						pageHandler = gSALR.handleAccount;
						break;

					case "forumdisplay":
						pageHandler = gSALR.handleForumDisplay;
						break;

					case "showthread":
						pageHandler = gSALR.handleShowThread;
						break;

					case "newreply":
						pageHandler = gSALR.handleNewReply;
						break;

					case "editpost":
						pageHandler = gSALR.handleEditPost;
						break;

					case "supportmail":
						pageHandler = gSALR.handleSupport;
						break;

					case "stats":
						pageHandler = gSALR.handleStats;
						break;

					case "misc":
						pageHandler = gSALR.handleMisc;
						break;
						
					case "member":
						pageHandler = gSALR.handleProfileView;
						break;

					case "search":
						pageHandler = gSALR.handleOldSearch;
						break;

					case "modqueue":
						pageHandler = gSALR.handleModQueue;
						break;
				}
			}
			else
			{
				// Search results
				if (doc.location.pathname == '/f/search/result')
					pageHandler = gSALR.handleSearch;
			}

			// Don't try to format the page if it's not supported
			if (pageHandler)
			{
				// Append custom CSS files to the head
				if (gSALR.Prefs.getPref("gestureEnable"))
					gSALR.PageUtils.insertCSSAsLink(doc, "chrome://salastread/content/css/gestureStyling.css");
				if (gSALR.Prefs.getPref("removeHeaderAndFooter"))
					gSALR.PageUtils.insertCSSAsLink(doc, "chrome://salastread/content/css/removeHeaderAndFooter.css");
				if (gSALR.Prefs.getPref("enablePageNavigator") || gSALR.Prefs.getPref("enableForumNavigator"))
					gSALR.PageUtils.insertCSSAsLink(doc, "chrome://salastread/content/css/pageNavigator.css");

				// Insert a text link to open the options menu
				if (gSALR.Prefs.getPref('showTextConfigLink'))
					gSALR.insertSALRConfigLink(doc);

				// Remove the page title prefix/postfix
				if (gSALR.Prefs.getPref("removePageTitlePrefix"))
					doc.title = gSALR.getPageTitle(doc);

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

					if (!DB || !gSALR.Prefs.getPref('suppressErrors'))
					{
						//alert("SALastRead application err: "+errstr);
						alert("SALastRead application err: "+ex);
					}
				}
			}
			else
			{
				throw ex;
			}
		}
	},

	pageFinishedLoading: function(e)
	{
		// Only called for showthread pages
		window.gBrowser.removeEventListener("load", gSALR.pageFinishedLoading, true);
		var doc = e.originalTarget;
// Probably ought to check for this _before_ adding the event listener instead.
		if (gSALR.Prefs.getPref('reanchorThreadOnLoad'))
		{
			if (doc.location.href.match(/\#(.*)$/))
			{
				var post = doc.getElementById(doc.location.href.match(/\#(.*)$/)[1]);
				if (post)
				{
					post.scrollIntoView(true);
				}
			}
		}
		doc.__salastread_loading = false;
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

	// Do anything needed to the post list in a forum
	handleForumDisplay: function(doc)
	{
		var i;  // Little variables that'll get reused
		var forumid = gSALR.PageUtils.getForumId(doc);
		if (forumid === false)
		{
			// Can't determine forum id so stop
			return;
		}
		// The following forums have special needs that must be dealt with
		var flags = {
			"inFYAD" : gSALR.PageUtils.inFYAD(forumid),
			"inDump" : gSALR.PageUtils.inDump(forumid),
			//"inAskTell" : gSALR.PageUtils.inAskTell(forumid),
			"inGasChamber" : gSALR.PageUtils.inGasChamber(forumid),
			"inArchives" : (doc.location.host.search(/^archives\.somethingawful\.com$/i) > -1)
		};

		if (doc.getElementById('forum') == null) {
			// /!\ Forum table isn't there, abort! /!\
			return;
		}

		if (!gSALR.DB.gotForumList)
		{
			// Replace this function if/when JSON is added to the forums
			gSALR.grabForumList(doc);
		}

		if (flags.inFYAD && !gSALR.Prefs.getPref("enableFYAD")) {
			// We're in FYAD and FYAD support has been turned off
			return;
		}

		// Add our thread list CSS for FYAD/BYOB
		gSALR.PageUtils.insertDynamicCSS(doc, gSALR.Styles.generateDynamicThreadListCSS(forumid));

		// Start a transaction to try and reduce the likelihood of database corruption
		var ourTransaction = false;
		if (gSALR.DB.database.transactionInProgress) {
			ourTransaction = true;
			gSALR.DB.database.beginTransactionAs(gSALR.DB.database.TRANSACTION_DEFERRED);
		}

		var pageList = gSALR.PageUtils.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
		if (pageList)
		{
			if (pageList.length > 1)
			{
				pageList = pageList[pageList.length-1];
			}
			else
			{
				pageList = pageList[0];
			}
			if (pageList.childNodes.length > 1) // Are there pages
			{
				var numPages = pageList.lastChild.innerHTML.match(/(\d+)/);
				var curPage = gSALR.PageUtils.selectSingleNode(doc, pageList, "//OPTION[@selected='selected']");
				// Suppress a page-load error - possibly unnecessary with revised logic
				if (!numPages)
					return;
				numPages = parseInt(numPages[1], 10);
				curPage = parseInt(curPage.innerHTML, 10);
			}
			else
			{
				numPages = 1;
				curPage = 1;
			}
		}

		doc.__SALR_curPage = curPage;
		doc.__SALR_maxPage = numPages;

		// Insert the forums paginator
		if (gSALR.Prefs.getPref("enableForumNavigator"))
		{
			gSALR.Navigation.addPagination(doc);
		}
		if (gSALR.Prefs.getPref("gestureEnable"))
		{
			doc.body.addEventListener('mousedown', gSALR.pageMouseDown, false);
			doc.body.addEventListener('mouseup', gSALR.pageMouseUp, false);
		}

		// Turn on keyboard navigation
		if (gSALR.Prefs.getPref('quickPostJump'))
		{
			doc.addEventListener('keypress', gSALR.quickPostJump, false);
		}

		// Replace post button
		if (gSALR.Prefs.getPref("useQuickQuote") && !flags.inGasChamber)
		{
			var postbutton = gSALR.PageUtils.selectSingleNode(doc, doc, "//A[contains(@href,'action=newthread')]");
			if (postbutton)
			{
				gSALR.PostHandler.turnIntoQuickButton(doc, postbutton, forumid).addEventListener("click", function(event){gSALR.quickButtonClicked(event, forumid, null);}, true);
			}
		}

		// Snag Forum Moderators
		if (!flags.inGasChamber && !flags.inArchives)
		{
			let modarray = doc.getElementById('mods').getElementsByTagName('a');
			let modcount = modarray.length;
			for (i = 0; i < modcount; i++)
			{
				let userid = modarray[i].href.match(/userid=(\d+)/i)[1];
				let username = modarray[i].innerHTML;
				if (!gSALR.DB.isMod(userid) && !gSALR.DB.isAdmin(userid))
				{
					gSALR.DB.addMod(userid, username);
				}
			}
		}

		// Advanced thread filtering interface
		var prefAdvancedThreadFiltering = gSALR.Prefs.getPref("advancedThreadFiltering");
		if (prefAdvancedThreadFiltering && !flags.inDump && !flags.inArchives)
		{
			gSALR.rebuildFilterBox(doc);
		}

		if (!flags.inDump)
		{
			// Capture and store the post icon # -> post icon filename relationship
			var filterDiv = doc.getElementById("filter");
			var tagsDiv = gSALR.PageUtils.selectSingleNode(doc, filterDiv, "div[contains(@class, 'thread_tags')]");
			var iconNumber;
			var postIcons = gSALR.PageUtils.selectNodes(doc, tagsDiv, "A[contains(@href,'posticon=')]");
			var divIcon, separator, divClone, afIgnoredIcons, allIgnored, noneIgnored, searchString;
			var atLeastOneIgnored = false;
			var prefIgnoredPostIcons = gSALR.Prefs.getPref("ignoredPostIcons");

			for (i in postIcons)
			{
				if ((postIcons[i].href.search(/posticon=(\d+)/i) > -1) && (postIcons[i].firstChild.src.search(/posticons\/(.*)/i) > -1))
				{
					iconNumber = parseInt(postIcons[i].href.match(/posticon=(\d+)/i)[1]);
					// Additional stuff for advanced thread filtering
					if (prefAdvancedThreadFiltering && !flags.inArchives)
					{
						// First move all the existing icons and their spacers into a div for easy handling
						divIcon = doc.createElement("div");
						postIcons[i].parentNode.insertBefore(divIcon,postIcons[i]);
						separator = postIcons[i].nextSibling;
						divIcon.appendChild(postIcons[i]);
						divIcon.appendChild(separator);
						divIcon.style.visibility = "visible";
						divIcon.style.display = "inline";

						// Now make a copy of that div and stick it down in the ignored icons div, hidden
						divClone = divIcon.cloneNode(true);
						afIgnoredIcons = doc.getElementById("ignoredicons");
						afIgnoredIcons.appendChild(divClone);

						searchString = "(^|\\s)" + iconNumber + ",";
						searchString = new RegExp(searchString , "gi");

						// Is this icon ignored already?
						if (prefIgnoredPostIcons.search(searchString) > -1)
						{
							gSALR.PageUtils.toggleVisibility(divIcon,true);
							atLeastOneIgnored = true;
						}
						else
						{
							gSALR.PageUtils.toggleVisibility(divClone,true);
						}

						// Add the appropriate click events
						postIcons[i].parentNode.addEventListener("click", gSALR.clickToggleIgnoreIcon, false);
						divClone.addEventListener("click", gSALR.clickToggleIgnoreIcon, false);
					}
				}
			}

			// Little bit of house cleaning after cycling through the icons
			if (prefAdvancedThreadFiltering && !flags.inArchives)
			{
				allIgnored = doc.getElementById("alliconsignored");
				noneIgnored = doc.getElementById("noiconsignored");

				// Hide or show the placeholder labels
				var anyLeft = gSALR.PageUtils.selectSingleNode(doc, tagsDiv, "DIV[contains(@style,'visibility: visible; display: inline;')]");
				if (!anyLeft && allIgnored.style.visibility == "hidden")
				{
					gSALR.PageUtils.toggleVisibility(allIgnored,true);
				}
				if (atLeastOneIgnored && noneIgnored.style.visibility == "visible")
				{
					gSALR.PageUtils.toggleVisibility(noneIgnored,true);
				}
			}
		}

		gSALR.handleThreadList(doc, forumid, flags);

		if (ourTransaction)
		{
			// Finish off the transaction
			gSALR.DB.database.commitTransaction();
		}
	},

	// Do anything needed to the subscribed threads list
	handleSubscriptions: function(doc)
	{
		var cpusernav = gSALR.PageUtils.selectSingleNode(doc, doc, "//ul[contains(@id,'usercpnav')]");
		if (!cpusernav) {
			// Don't see the control panel menu so stop
			return;
		}

		let oldUsername = gSALR.Prefs.getPref("username");
		if (oldUsername == '' || oldUsername == 'Not%20cookied%3F')
		{
			var username = gSALR.PageUtils.selectSingleNode(doc,doc,"//div[contains(@class, 'breadcrumbs')]/b");
			if (username)
			{
				username = escape(username.textContent.substr(52));
				if (username != 'Not%20cookied%3F')
					gSALR.Prefs.setPref("username", username);
			}
		}

		gSALR.handleThreadList(doc, null, { "inUserCP" : true });
	},

	handleIndex: function(doc)
	{
		let oldUsername = gSALR.Prefs.getPref("username");
		if (oldUsername == '' || oldUsername == 'Not%20cookied%3F')
		{
			var username = gSALR.PageUtils.selectSingleNode(doc,doc,"//div[contains(@class, 'mainbodytextsmall')]//b");
			username = escape(username.textContent);
			if (username != 'Not%20cookied%3F')
				gSALR.Prefs.setPref("username", username);
		}
	},

	//handle highlighting of user cp/forum listings
	handleThreadList: function(doc, forumid, flags)
	{
		//get preferences once
		var dontHighlightThreads = gSALR.Prefs.getPref("dontHighlightThreads");
		var disableNewReCount = gSALR.Prefs.getPref("disableNewReCount");
		var newPostCountUseOneLine = gSALR.Prefs.getPref("newPostCountUseOneLine");
		var showUnvisitIcon = gSALR.Prefs.getPref("showUnvisitIcon");
		var swapIconOrder = gSALR.Prefs.getPref("swapIconOrder");
		var showGoToLastIcon = gSALR.Prefs.getPref("showGoToLastIcon");
		var alwaysShowGoToLastIcon = gSALR.Prefs.getPref("alwaysShowGoToLastIcon");
		var modColor = gSALR.Prefs.getPref("modColor");
		var modBackground = gSALR.Prefs.getPref("modBackground");
		var adminColor = gSALR.Prefs.getPref("adminColor");
		var adminBackground = gSALR.Prefs.getPref("adminBackground");
		var highlightUsernames = gSALR.Prefs.getPref("highlightUsernames");
		var dontBoldNames = gSALR.Prefs.getPref("dontBoldNames");
		var showTWNP = gSALR.Prefs.getPref('showThreadsWithNewPostsFirst');
		var showTWNPCP = gSALR.Prefs.getPref('showThreadsWithNewPostsFirstCP');
		var showTWNPCPS = gSALR.Prefs.getPref('showThreadsWithNewPostsFirstCPStickies');
		var postsPerPage = gSALR.Prefs.getPref('postsPerPage');
		var advancedThreadFiltering = gSALR.Prefs.getPref("advancedThreadFiltering");
		var ignoredPostIcons = gSALR.Prefs.getPref("ignoredPostIcons");
		var ignoredKeywords = gSALR.Prefs.getPref("ignoredKeywords");
		var superIgnoreUsers = gSALR.Prefs.getPref("superIgnore");

		// This should eventually be redone and moved to the flags section.
		if (typeof(flags.inUserCP) === undefined)
			flags.inUserCP = false;

		// We'll need lots of variables for this
		var threadIconBox, threadTitleBox, threadTitleLink, threadAuthorBox, threadRepliesBox, threadLastPostBox;
		var threadTitle, threadId, threadOPId, threadRe;
		var lastLink, searchString;
		//var starredthreads = gSALR.DB.starList;
		//var ignoredthreads = gSALR.DB.ignoreList;
		var forumTable = doc.getElementById('forum');

		if (!forumTable) // something is very wrong; abort!
			return;

		// We need to reset this every time the page is fully loaded
		if (advancedThreadFiltering)
			gSALR.Prefs.setPref("filteredThreadCount",0);

		// Here be where we work on the thread rows
		var threadlist = gSALR.PageUtils.selectNodes(doc, forumTable, "tbody/tr");

		// These are insertion points for thread sorting
		if ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP))
		{
			var anchorTop = gSALR.PageUtils.selectSingleNode(doc, forumTable, "tbody");

			if (anchorTop)
			{
				var anchorAnnouncement = doc.createElement("tr");
				anchorTop.insertBefore(anchorAnnouncement,threadlist[0]);
				var anchorUnreadStickies = doc.createElement("tr");
				anchorTop.insertBefore(anchorUnreadStickies,threadlist[0]);
				var anchorReadStickies = doc.createElement("tr");
				anchorTop.insertBefore(anchorReadStickies,threadlist[0]);
				var anchorThreads = doc.createElement("tr");
				anchorTop.insertBefore(anchorThreads,threadlist[0]);
				if (flags.inUserCP)
				{
					var anchorUnseenThreads = doc.createElement("tr");
					anchorTop.insertBefore(anchorUnseenThreads,threadlist[0]);
				}
			}
			else
			{
				// Oh dear there are no threads to sort!
				// Change these options for now so that it doesn't error later
				showTWNP = false;
				showTWNPCP = false;
			}
		}

		for (var i in threadlist)
		{
			var thread = threadlist[i];
			threadTitleBox = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]");
			if (!threadTitleBox)
			{
				// Either the page didn't finish loading or SA didn't send the full page.
				return;
			}
			var ttb_a0 = threadTitleBox.getElementsByTagName('a')[0];
			if (ttb_a0 && ttb_a0.className.search(/announcement/i) > -1)
			{
				if ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP))
				{
					anchorTop.insertBefore(thread,anchorAnnouncement);
				}
				// It's an announcement so skip the rest
				continue;
			}

			threadTitleLink = gSALR.PageUtils.selectSingleNode(doc, threadTitleBox, "DIV/DIV/A[contains(@class, 'thread_title')]");
			if (!threadTitleLink)
			{
				threadTitleLink = gSALR.PageUtils.selectSingleNode(doc, threadTitleBox, "A[contains(@class, 'thread_title')]");
			}
			if (!threadTitleLink) continue;
			threadId = parseInt(threadTitleLink.href.match(/threadid=(\d+)/i)[1], 10);
			threadTitle = threadTitleLink.innerHTML;
			if (gSALR.DB.isThreadIgnored(threadId))
			{
				// If thread is ignored might as well remove it and stop now
				thread.parentNode.removeChild(thread);
				// Update the title just incase we don't know what it is
				gSALR.DB.setThreadTitle(threadId, threadTitle);
				continue;
			}

			threadAuthorBox = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'author')]");
			threadRepliesBox = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'replies')]");
			if (!threadAuthorBox || !threadRepliesBox)
			{
				// Either the page didn't finish loading or SA didn't send the full page.
				return;
			}
			let threadOPLink = threadAuthorBox.getElementsByTagName('a');
			if (threadOPLink[0])
			{
				threadOPId = parseInt(threadOPLink[0].href.match(/userid=(\d+)/i)[1]);
			}

			if (threadOPId)
			{
				// If it was started by someone ignored, hide the thread
				if (superIgnoreUsers && gSALR.DB.isUserIgnored(threadOPId))
				{
					thread.parentNode.removeChild(thread);
					continue;
				}
			}

			if (advancedThreadFiltering && !flags.inArchives && !flags.inDump && !flags.inUserCP)
			{
				// Check for ignored keywords
				var keywordList = ignoredKeywords.split("|");
				var threadBeGone = false;

				for (var j in keywordList)
				{
					var keywords = keywordList[j];
					if (!keywords || threadBeGone)
					{
						continue;
					}
					searchString = new RegExp(keywords, "gi");

					if (threadTitle.search(searchString) > -1 && thread.style.visibility != "hidden")
					{
						gSALR.PageUtils.toggleVisibility(thread,false);
						gSALR.filteredThreadCount(doc,1);
						threadBeGone = true;
					}
				}
			}

			lastLink = gSALR.PageUtils.selectSingleNode(doc, threadTitleBox, "DIV/DIV/DIV/A[./text() = 'Last']");
			if (lastLink && postsPerPage > 0)
			{
				let threadReCount = parseInt(threadRepliesBox.textContent, 10) + 1;
				let lastPageNum = Math.ceil(threadReCount / postsPerPage);
				lastLink.innerHTML += ' (' + lastPageNum + ')';
			}

			// So right click star/ignore works
			thread.className += " salastread_thread_" + threadId;
			// So ignore/star can get a title immediately
			thread.__salastread_threadtitle = threadTitle;

			// Is this icon ignored?
			threadIconBox = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]");
			if (flags && forumid && advancedThreadFiltering && !flags.inArchives && !flags.inDump && !flags.inUserCP && threadIconBox.firstChild.firstChild.src.search(/posticons\/(.*)/i) > -1)
			{
				var iconnum = threadIconBox.firstChild.firstChild.src.match(/#(\d+)$/)[1];
				var iconSearchString = "(^|\\s)" + iconnum + ",";
				iconSearchString = new RegExp(iconSearchString , "gi");
				if (ignoredPostIcons.search(iconSearchString) > -1 && thread.style.visibility != "hidden")
				{
					gSALR.PageUtils.toggleVisibility(thread,false);
					gSALR.filteredThreadCount(doc,1);
				}
			}

			var divLastSeen = gSALR.PageUtils.selectSingleNode(doc, threadTitleBox, "DIV/DIV[contains(@class, 'lastseen')]");
			if (divLastSeen)
			{
				// Thread is read so let's work our magic
				var iconMarkUnseen = gSALR.PageUtils.selectSingleNode(doc, divLastSeen, "a[contains(@class, 'x')]");
				var iconJumpLastRead = gSALR.PageUtils.selectSingleNode(doc, divLastSeen, "a[contains(@class, 'count')]");

				// For thread sorting later
				if (iconJumpLastRead && ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP)))
				{
					thread.className += ' moveup';
				}

				if (gSALR.DB.didIPostHere(threadId))
				{
					threadRepliesBox.className += ' salrPostedIn';
				}

				// Thread highlighting
				if (!dontHighlightThreads)
				{
					if (iconJumpLastRead)
					{
						thread.className += ' newposts';
					}
					if (iconMarkUnseen)
					{
						// Ask/Tell and maybe other forums forget this at times
						if (thread.className.match(/(^|\s)seen(\s|$)/i) == null)
						{
							thread.className += ' seen';
						}
						// And to make sure it removes the post count properly
						if (!disableNewReCount)
						{
							iconMarkUnseen.addEventListener("click", gSALR.clickMarkUnseen, false);
						}
					}
				}

				//SALR replacing forums buttons
				if (!disableNewReCount && iconJumpLastRead)
				{
					threadRe = gSALR.PageUtils.selectSingleNode(doc, iconJumpLastRead, "B");
					threadRe = threadRe.cloneNode(true);
					threadRe.style.fontWeight = "normal";
					threadRe.style.fontSize = "75%";
					if (newPostCountUseOneLine)
					{
						threadRepliesBox.innerHTML += "&nbsp;(";
						threadRepliesBox.appendChild(threadRe);
						threadRepliesBox.innerHTML += ")";
					}
					else
					{
						threadRepliesBox.innerHTML += "<br />(";
						threadRepliesBox.appendChild(threadRe);
						threadRepliesBox.innerHTML += ")";
					}
				}

				if (alwaysShowGoToLastIcon && !iconJumpLastRead)
				{
					iconJumpLastRead = doc.createElement("a");
					iconJumpLastRead.title = "Jump to last read post";
					iconJumpLastRead.href = "/showthread.php?threadid=" + threadId + "&goto=newpost";
					iconJumpLastRead.className = "count";
					if (disableNewReCount)
					{
						threadRe = doc.createElement("b");
						threadRe.innerHTML = "0";
						iconJumpLastRead.appendChild(threadRe);
					}
					divLastSeen.appendChild(iconJumpLastRead);
				}

				if (showUnvisitIcon && !showGoToLastIcon && iconJumpLastRead)
				{
					// Fix up the background gradient on the default Jump To Last link
					divLastSeen.style.background = 'url(chrome://salastread/skin/lastseen-gradient.gif)';
				}

				// Switch the Mark as Unseen and Jump to Last Read icon order
				if (swapIconOrder && iconMarkUnseen && iconJumpLastRead)
				{
					divLastSeen.insertBefore(iconJumpLastRead, iconMarkUnseen);
				}
			}

			// Sort the threads, new stickies, then stickies, then new threads, then threads
			if ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP))
			{
				var iAmASticky = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'sticky')]");
				var iHaveNewPosts = (thread.className.search(/moveup/i) > -1);

				if (iAmASticky)
				{
					if (iHaveNewPosts)
					{
						if (flags.inUserCP && !showTWNPCPS)
							anchorTop.insertBefore(thread,anchorThreads);
						else
							anchorTop.insertBefore(thread,anchorUnreadStickies);
					}
					else if (!flags.inUserCP)
					{
						anchorTop.insertBefore(thread,anchorReadStickies);
					}
				}
				else if (iHaveNewPosts)
				{
					anchorTop.insertBefore(thread,anchorThreads);
				}
				else if (flags.inUserCP && thread.className.search(/seen/i) === -1)
				{
					anchorTop.insertBefore(thread,anchorUnseenThreads);
				}
			}

			if (gSALR.DB.isThreadStarred(threadId))
			{
				threadTitleBox.className += ' starred';
			}

			if (highlightUsernames)
			{
				var userColoring, lastPostId;
				var posterColor, posterBG;

				// First color the Author column
				if (threadOPId)
				{
					posterColor = false;
					posterBG = false;

					if (gSALR.DB.isMod(threadOPId))
					{
						posterColor = modColor;
						posterBG =  modBackground;
					}

					if (gSALR.DB.isAdmin(threadOPId))
					{
						posterColor = adminColor;
						posterBG =  adminBackground;
					}

					userColoring = gSALR.DB.isUserIdColored(threadOPId);
					if (userColoring)
					{
						if (userColoring.color && userColoring.color != "0")
						{
							posterColor = userColoring.color;
						}
						if (userColoring.background && userColoring.background != "0")
						{
							posterBG = userColoring.background;
						}
					}

					if (posterBG != false && posterBG != "0")
					{
						threadAuthorBox.style.backgroundColor = posterBG;
					}
					if (posterColor != false && posterColor != "0")
					{
						threadAuthorBox.getElementsByTagName("a")[0].style.color = posterColor;
						if (!dontBoldNames)
						{
							threadAuthorBox.getElementsByTagName("a")[0].style.fontWeight = "bold";
						}
					}
				}

				// Then color the Killed By column
				threadLastPostBox = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'lastpost')]");
				if (!threadLastPostBox)
				{
					// Either the page didn't finish loading or SA didn't send the full page.
					return;
				}
				let lastPostLink = threadLastPostBox.getElementsByTagName('a');
				if (lastPostLink[0])
				{
					lastPostId = gSALR.DB.getUserId(lastPostLink[0].innerHTML);
				}

				if (lastPostId)
				{
					posterColor = false;
					posterBG = false;

					if (gSALR.DB.isMod(lastPostId))
					{
						posterColor = modColor;
						posterBG =  modBackground;
					}

					if (gSALR.DB.isAdmin(lastPostId))
					{
						posterColor = adminColor;
						posterBG =  adminBackground;
					}

					userColoring = gSALR.DB.isUserIdColored(lastPostId);
					if (userColoring)
					{
						if (userColoring.color && userColoring.color != "0")
						{
							posterColor = userColoring.color;
						}
						if (userColoring.background && userColoring.background != "0")
						{
							posterBG = userColoring.background;
						}
					}

					if (posterBG != false && posterBG != "0")
					{
						threadLastPostBox.style.backgroundColor = posterBG;
					}
					if (posterColor != false && posterColor != "0")
					{
						threadLastPostBox.getElementsByTagName("a")[0].style.color = posterColor;
					}
				}
			}
		}

		// Clean up insertion points for thread sorting
		if ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP))
		{
			anchorTop.removeChild(anchorAnnouncement);
			anchorTop.removeChild(anchorUnreadStickies);
			anchorTop.removeChild(anchorReadStickies);
			anchorTop.removeChild(anchorThreads);
			anchorTop.removeChild(anchorUnseenThreads);
		}
	},

	handleShowThread: function(doc)
	{
		var i; // Little variables that'll get reused
		if (doc.getElementById('thread') == null)
		{
			// If there is no thread div then abort since something's not right
			return;
		}

		try
		{
			var forumid = gSALR.PageUtils.getForumId(doc);
			var threadid = gSALR.PageUtils.getThreadId(doc);

			if (!forumid || !threadid)
			{
				// Feel free to elaborate on this later
				throw false;
			}
		}
		catch(e)
		{
			// Can't get the forum or thread id so abort for now
			return;
		}

		doc.__SALR_forumid = forumid;
		doc.__SALR_threadid = threadid;

		// The following forums have special needs that must be dealt with
		var inFYAD = gSALR.PageUtils.inFYAD(forumid);
		//var inDump = gSALR.PageUtils.inDump(forumid);
		//var inAskTell = gSALR.PageUtils.inAskTell(forumid);
		var inGasChamber = gSALR.PageUtils.inGasChamber(forumid);
		// Obsolete:
		var inArchives = (doc.location.host.search(/^archives\.somethingawful\.com$/i) > -1);
		var singlePost = (doc.location.search.search(/action=showpost/i) > -1);
		var username = unescape(gSALR.Prefs.getPref('username'));

		if (inFYAD && !gSALR.Prefs.getPref("enableFYAD"))
		{
			// We're in FYAD and FYAD support has been turned off
			return;
		}

		// Add our ShowThread CSS
		gSALR.PageUtils.insertDynamicCSS(doc, gSALR.Styles.generateDynamicShowThreadCSS(forumid, threadid, singlePost));

		doc.body.className += " salastread_forum" + forumid;
		// used by the context menu to allow options for this thread
		doc.body.className += " salastread_thread_" + threadid;

		// Grab the thread title
		/* Note: it will only actually happen if the thread's already in the cache.
			Perhaps we can remove this call?
		*/
		gSALR.DB.setThreadTitle(threadid, gSALR.getPageTitle(doc));

		// Grab the go to dropdown
		if (!gSALR.DB.gotForumList && !singlePost)
		{
			gSALR.grabForumList(doc);
		}

		var pageList = gSALR.PageUtils.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
		if (pageList[0])
		{
			if (pageList.length >  1)
			{
				pageList = pageList[pageList.length-1];
			}
			else
			{
				pageList = pageList[0];
			}
			if (pageList.childNodes.length > 1 && pageList.lastChild && pageList.lastChild.innerHTML) // Are there pages
			{
				var numPages = pageList.lastChild.innerHTML.match(/(\d+)/);
				var curPage = gSALR.PageUtils.selectSingleNode(doc, pageList, "//OPTION[@selected='selected']");
				numPages = parseInt(numPages[1], 10);
				curPage = parseInt(curPage.innerHTML, 10);
			}
			else
			{
				numPages = 1;
				curPage = 1;
			}
		}

		doc.__SALR_curPage = curPage;
		doc.__SALR_maxPage = numPages;

		// Insert the thread paginator
		if (gSALR.Prefs.getPref("enablePageNavigator") && !singlePost)
		{
			gSALR.Navigation.addPagination(doc);
		}
		if (gSALR.Prefs.getPref("gestureEnable"))
		{
			doc.body.addEventListener('mousedown', gSALR.pageMouseDown, false);
			doc.body.addEventListener('mouseup', gSALR.pageMouseUp, false);
		}

		// Grab threads/posts per page
		var postsPerPageOld = gSALR.Prefs.getPref("postsPerPage");
		var perpage = gSALR.PageUtils.selectSingleNode(doc, doc, "//DIV[contains(@class,'pages')]//A[contains(@href,'perpage=')]");
		if (perpage)
		{
			perpage = perpage.href.match(/perpage=(\d+)/i)[1];
			if (postsPerPageOld != perpage)
			{
				gSALR.Prefs.setPref("postsPerPage", parseInt(perpage));
			}
		}
		else
		{
			perpage = 0;
		}

		// Check if the thread is closed
		var threadClosed = true;
		if (gSALR.PageUtils.selectSingleNode(doc, doc, "//A[contains(@href,'action=newreply&threadid')]//IMG[contains(@src,'closed')]") == null)
			threadClosed = false;

		// Replace post button
		if (gSALR.Prefs.getPref("useQuickQuote") && !inGasChamber)
		{
			var postbuttons = gSALR.PageUtils.selectNodes(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newthread')]");
			if (postbuttons.length > 0)
			{
				for (i in postbuttons)
				{
					gSALR.PostHandler.turnIntoQuickButton(doc, postbuttons[i], forumid).addEventListener("click", function(event){gSALR.quickButtonClicked(event, forumid, threadid);}, true);
				}
			}
			if (!threadClosed)
			{
				var replybuttons = gSALR.PageUtils.selectNodes(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newreply&threadid')]");
				if (replybuttons.length > 0)
				{
					for (i in replybuttons)
					{
						gSALR.PostHandler.turnIntoQuickButton(doc, replybuttons[i], forumid).addEventListener("click", function(event){gSALR.quickButtonClicked(event, forumid, threadid);}, true);
					}
				}
			}
		}

		if (gSALR.Prefs.getPref('quickPostJump'))
		{
			doc.addEventListener('keypress', gSALR.quickPostJump, false);
		}

		var searchThis = gSALR.PageUtils.selectSingleNode(doc, doc, "//FORM[contains(@class,'threadsearch')]");
		var placeHere = gSALR.PageUtils.selectSingleNode(doc, doc, "//img[contains(@class,'thread_bookmark')]");
		if (searchThis && placeHere && placeHere.parentNode && placeHere.parentNode.nodeName.toLowerCase() === 'li')
		{
			placeHere = placeHere.parentNode;
			if (gSALR.Prefs.getPref("replyCountLinkinThreads"))
			{
				var replyCountLi = doc.createElement('li');
				var replyCountLink = doc.createElement("A");
				replyCountLi.appendChild(replyCountLink);
				replyCountLink.href = "/misc.php?action=whoposted&threadid=" + threadid + "#fromthread";
				replyCountLink.target = "_blank";
				replyCountLink.innerHTML = "Who posted?";
				replyCountLink.style.fontSize = "10px";
				replyCountLink.style.cssFloat = "left";
				replyCountLink.style.marginLeft = "8px";
				replyCountLink.style.color = "#FFFFFF";
				// Plug it in right after the "Search thread:" form
				placeHere.parentNode.insertBefore(replyCountLi,placeHere.nextSibling);
				placeHere.parentNode.insertBefore(doc.createTextNode(" "),placeHere.nextSibling);
			}
			// SA's "Search thread" box is disabled; add our own
			if (!gSALR.Prefs.getPref("hideThreadSearchBox") && searchThis.firstChild.nodeName == '#text')
			{
				// Prevent weird zoom behavior
				searchThis.parentNode.style.overflow = "hidden";
				var newSearchBox = doc.createElement('li');
				var newSearchForm = doc.createElement('form');
				newSearchBox.appendChild(newSearchForm);
				newSearchForm.action = 'http://forums.somethingawful.com/f/search/submit';
				newSearchForm.method = 'post';
				newSearchForm.className = 'threadsearch'; 
				var newSearchDiv = doc.createElement('div');
				newSearchForm.appendChild(newSearchDiv);
				newSearchDiv.style.marginLeft = '6px';
				newSearchDiv.style.lineHeight = '22px';
				gSALR.addHiddenFormInput(doc,newSearchDiv,'forumids',forumid);
				gSALR.addHiddenFormInput(doc,newSearchDiv,'groupmode','0');
				gSALR.addHiddenFormInput(doc,newSearchDiv,'opt_search_posts','on');
				gSALR.addHiddenFormInput(doc,newSearchDiv,'perpage','20');
				gSALR.addHiddenFormInput(doc,newSearchDiv,'search_mode','ext');
				gSALR.addHiddenFormInput(doc,newSearchDiv,'show_post_previews','1');
				gSALR.addHiddenFormInput(doc,newSearchDiv,'sortmode','1');
				var newSearchText = doc.createElement('input');
				newSearchText.size = '25';
				newSearchText.value = 'Added by SALR';
				newSearchText.style.fontStyle = 'italic';
				newSearchText.style.color = '#BBBBBB';
				newSearchText.__unfocused = true;
				newSearchText.addEventListener("focus", function()
				{
					if (newSearchText.__unfocused === true)
					{
						newSearchText.style.fontStyle = 'normal';
						newSearchText.style.color = '';
						newSearchText.value = '';
						newSearchText.__unfocused = false;
					}
				}, true);

				// Don't accidentally trigger keyboard navigation
				newSearchText.addEventListener("keypress", function(evt)
				{
					// User hit enter
					if (evt.keyCode == 13)
					{
						if (newSearchText.__unfocused)
							return false;
						gSALR.addHiddenFormInput(doc,newSearchForm,'keywords','threadid:'+threadid+' '+newSearchText.value);
						newSearchForm.submit();
						return false;
					}
					evt.stopPropagation();
				}, true);
				newSearchDiv.appendChild(newSearchText);
				var newSearchButton = doc.createElement('input');
				newSearchButton.type='button';
				newSearchButton.value='Search thread';
				newSearchButton.addEventListener("click", function()
				{
					if (newSearchText.__unfocused)
						return false;
					gSALR.addHiddenFormInput(doc,newSearchForm,'keywords','threadid:'+threadid+' '+newSearchText.value);
					newSearchForm.submit();
				}, true);
				newSearchDiv.appendChild(newSearchButton);
				placeHere.parentNode.insertBefore(newSearchBox,placeHere.nextSibling);
			}
		}

		// get the posts to iterate through
		var postlist = gSALR.PageUtils.selectNodes(doc, doc, "//table[contains(@id,'post')]");

		var curPostId, postIdLink, resetLink, profileLink, posterId, postbody;
		var posterColor, posterBG, userNameBox, posterNote, posterImg, posterName, slink, quotebutton, editbutton;
		var userPosterNote;

		// Group calls to the prefs up here so we aren't repeating them, should help speed things up a bit
		var useQuickQuote = gSALR.Prefs.getPref('useQuickQuote');
		var insertPostTargetLink = gSALR.Prefs.getPref("insertPostTargetLink");
		var highlightUsernames = gSALR.Prefs.getPref("highlightUsernames");
		let hideCustomTitles = gSALR.Prefs.getPref('hideCustomTitles');

		//standard user colors
		var modColor = gSALR.Prefs.getPref("modColor");
		var modBackground = gSALR.Prefs.getPref("modBackground");
		var modSubText = gSALR.Prefs.getPref("modSubText");
		var adminColor = gSALR.Prefs.getPref("adminColor");
		var adminBackground = gSALR.Prefs.getPref("adminBackground");
		var adminSubText = gSALR.Prefs.getPref("adminSubText");
		var opColor = gSALR.Prefs.getPref("opColor");
		var opBackground = gSALR.Prefs.getPref("opBackground");
		var opSubText = gSALR.Prefs.getPref("opSubText");
		var superIgnoreUsers = gSALR.Prefs.getPref("superIgnore");
		var cancerTreatment = gSALR.Prefs.getPref("cancerTreatment");

		var threadMarkedPostedIn = false;

		// Loop through each post
		for (i in postlist)
		{
			var post = postlist[i];

			if (post.className.indexOf("ignored") > -1)
			{
				// Check if we need to super ignore
				if (superIgnoreUsers)
				{
					// Temporarily reuse these variables since we'll be moving on shortly
					profileLink = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postdate')]//a[contains(@href,'userid=')]");
					if (profileLink)
					{
						posterId = profileLink.href.match(/userid=(\d+)/i)[1];
						if (posterId && gSALR.DB.isUserIgnored(posterId))
							post.className += ' salrPostIgnored';
					}
				}
				// User is ignored by the system so skip doing anything else
				continue;
			}

			if (post.id == "post") // handle adbot
				continue;
			curPostId = post.id.match(/post(\d+)/)[1];
			profileLink = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//ul[contains(@class,'profilelinks')]//a[contains(@href,'userid=')]");
			if (!profileLink)
				continue;
			posterId = profileLink.href.match(/userid=(\d+)/i)[1];
			if (superIgnoreUsers && gSALR.DB.isUserIgnored(posterId))
			{
				// They're ignored but not by the system
				post.className += ' salrPostIgnored';
			}

			if (inFYAD && !inArchives)
			{
				userNameBox = gSALR.PageUtils.selectSingleNode(doc, post, "TBODY//DIV[contains(@class,'title')]//following-sibling::B");
			}
			else
			{
				userNameBox = gSALR.PageUtils.selectSingleNode(doc, post, "TBODY//TR/TD//DL//DT[contains(@class,'author')]");
			}

			//workaround for archives + fyad-type forum, since we can't detect we're in an archived thread at the moment
			if (userNameBox == null)
			{
				userNameBox = gSALR.PageUtils.selectSingleNode(doc, post, "TBODY//TR/TD//DL//DT[contains(@class,'author')]");
			}

			// Standard template
			let titleBox = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//dl[contains(@class,'userinfo')]//dd[contains(@class,'title')]");
			// If that doesn't work, try FYAD template
			if (titleBox == null)
				titleBox = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postbody')]//div[contains(@class,'title')]");

			if (titleBox)
			{
				if (gSALR.DB.isAvatarHidden(posterId))
				{
					// We hate this person's avatar and we want to banish it to the depths of Hell
					titleBox.style.display = "none";
				}
			}

			// Check to see if there's a mod or admin star
			posterImg = false;
			posterName = userNameBox.textContent.replace(/^\s+|\s+$/, '');
			if (userNameBox.title.length > 0 && !inArchives)
			{
				posterImg = userNameBox.title;
				if (posterImg == 'Administrator')
				{
					gSALR.DB.addAdmin(posterId, posterName);
				}
				else if (posterImg == 'Moderator')
				{
					gSALR.DB.addMod(posterId, posterName);
				}
			}

			posterColor = false;
			posterBG = false;
			posterNote = false;
			userPosterNote = false;

			//apply this to every post
			post.className += " salrPostBy" + posterId + " salrPostBy" + escape(posterName);
			if (posterName == username)
			{
				post.className += " salrPostOfSelf";
				if (threadMarkedPostedIn === false)
				{
					gSALR.DB.iPostedHere(threadid);
					threadMarkedPostedIn = true;
				}
			}


			//apply custom user coloring
			if (userNameBox.className.search(/\bop/) > -1)
			{
				posterColor = opColor;
				posterBG = opBackground;
				posterNote = opSubText;
				post.className += " salrPostByOP";
			}
			if (gSALR.DB.isMod(posterId))
			{
				if (posterImg == "Moderator" || posterImg == "Internet Knight" || inArchives)
				{
					posterColor = modColor;
					posterBG = modBackground;
					posterNote = modSubText;
					post.className += " salrPostByMod";
				}
				else if (!inArchives)
				{
					gSALR.DB.removeMod(posterId);
				}
			}
			if (gSALR.DB.isAdmin(posterId))
			{
				if (posterImg == "Administrator" || inArchives)
				{
					posterColor = adminColor;
					posterBG = adminBackground;
					posterNote = adminSubText;
					post.className += " salrPostByAdmin";
				}
				else if (!inArchives)
				{
					gSALR.DB.removeAdmin(posterId);
				}
			}
			var dbUser = gSALR.DB.isUserIdColored(posterId);
			if (dbUser)
			{
				if (!dbUser.username || dbUser.username != posterName)
				{
					gSALR.DB.setUserName(posterId, posterName);
				}
				if (dbUser.color && dbUser.color != "0")
				{
					posterColor = dbUser.color;
				}
				if (dbUser.background && dbUser.background != "0")
				{
					posterBG = dbUser.background;
				}
			}

			if (posterBG != "0")
			{
				gSALR.PostHandler.colorPost(doc, posterBG, posterId);
			}

			// Check for quotes that need to be colored or superIgnored
			if (gSALR.Prefs.getPref('highlightQuotes') || superIgnoreUsers)
			{
				var userQuoted;
				var anyQuotes = gSALR.PageUtils.selectNodes(doc, post, "TBODY//TR/TD//DIV[contains(@class,'bbc-block')]");
				for (let quote in anyQuotes)
				{
					userQuoted = anyQuotes[quote].textContent.match(/(.*) posted:/);
					if (userQuoted)
					{
						userQuoted = userQuoted[1];
						if (userQuoted != username) // self-quotes handled by forum JS now
						{
							let userQuotedDetails = gSALR.DB.isUsernameColored(userQuoted);
							let userQuotedId = gSALR.DB.getUserId(userQuoted);
							if (superIgnoreUsers && gSALR.DB.isUserIgnored(userQuotedId))
							{
								// They're quoting someone ignored, lets remove the entire post
								post.className += ' salrPostIgnored';
							}
							if (userQuotedDetails)
							{
								anyQuotes[quote].className += ' salrQuoteOf' + userQuotedDetails.userid;
								gSALR.PostHandler.colorQuote(doc, userQuotedDetails.background, userQuotedDetails.userid);
							}
						}
					}
				}
			}

			userPosterNote = gSALR.DB.getPosterNotes(posterId);
			if (highlightUsernames && posterColor != false && posterColor != "0")
			{
				userNameBox.style.color = posterColor;
			}
			if (posterNote || userPosterNote)
			{
				let newNoteBox = doc.createElement("p");
				newNoteBox.style.fontSize = "80%";
				newNoteBox.style.margin = "0";
				newNoteBox.style.padding = "0";
				newNoteBox.innerHTML = posterNote ? posterNote : '';
				newNoteBox.innerHTML += userPosterNote ? (((posterNote && userPosterNote) ? '<br />':'') + userPosterNote):'';
				newNoteBox.style.color = userNameBox.style.color;
				newNoteBox.style.fontWeight = "bold";
				userNameBox.parentNode.insertBefore(newNoteBox, userNameBox.nextSibling);
			}

			postIdLink = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postdate')]//a[contains(@href,'#post')]");
			if (!postIdLink)
			{
				postIdLink = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//a[contains(@href,'#post')]");
			}
			if (!postIdLink) continue;

			let postid = postIdLink.href.match(/#post(\d+)/i)[1];
			if (insertPostTargetLink)
			{
				slink = doc.createElement("a");
				if (singlePost)
				{
					slink.href = "/showthread.php?goto=post&postid="+postid;
					slink.title = "Back to Thread";
					slink.innerHTML = "1";
				}
				else
				{
					slink.href = "/showthread.php?action=showpost&postid="+postid+"&forumid="+forumid;
					slink.title = "Show Single Post";
					slink.innerHTML = "1";
				}
				postIdLink.parentNode.insertBefore(slink, postIdLink);
				postIdLink.parentNode.insertBefore(doc.createTextNode(" "), postIdLink);
			}

			//grab this once up here to avoid repetition
			if (useQuickQuote)
			{
				editbutton = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//ul[contains(@class,'postbuttons')]//li//a[contains(@href,'action=editpost')]");
			}

			if (useQuickQuote && !threadClosed)
			{
				quotebutton = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//ul[contains(@class,'postbuttons')]//li//a[contains(@href,'action=newreply')]");
				if (quotebutton)
				{
					gSALR.PostHandler.turnIntoQuickButton(doc, quotebutton, forumid).addEventListener("click", function(event){gSALR.quickButtonClicked(event, forumid, threadid);}, true);
				}
				if (editbutton)
				{
					gSALR.PostHandler.turnIntoQuickButton(doc, editbutton, forumid).addEventListener("click", function(event){gSALR.quickButtonClicked(event, forumid, threadid);}, true);
				}
			}

			var userLinks = profileLink.parentNode.parentNode;

			// Add a link to hide/unhide the user's avatar
			if (!hideCustomTitles)
			{
				let avLink = doc.createElement("li");
				avLink.setAttribute('style', '-moz-user-select: none;');
				avLink.style.cssFloat = 'right';
				avLink.style.marginLeft = '4px';
				let avAnch = doc.createElement("a");
				avAnch.href = "#";
				avAnch.title = "Toggle displaying this poster's avatar.";
				if (gSALR.DB.isAvatarHidden(posterId))
					avAnch.textContent = "Show Avatar";
				else
					avAnch.textContent = "Hide Avatar";

				avAnch.addEventListener("click", gSALR.clickToggleAvatar.bind(null, posterId, posterName, postid), false);
				avLink.appendChild(avAnch);
				userLinks.appendChild(doc.createTextNode(" "));
				userLinks.appendChild(avLink);
			}

			// Add user coloring/note links
			// Note: this is added after, but appears to the left thanks to CSS floats.
			if (highlightUsernames)
			{
				var li = doc.createElement("li");
				li.setAttribute('style', '-moz-user-select: none;');
				li.style.cssFloat = 'right';
				li.style.marginLeft = '4px';
				var a = doc.createElement("a");
				a.href = "#";
				a.textContent = "Add Coloring/Note";
				a.title = "Add coloring and/or a note for this poster.";
				a.dataset.salrPosterId = posterId;
				a.dataset.salrPosterName = posterName;
				a.addEventListener("click", gSALR.addHighlightedUser.bind(null,posterId,posterName), true);
				li.appendChild(a);
				userLinks.appendChild(doc.createTextNode(" "));
				userLinks.appendChild(li);
			}

			// Add a space for the Rap Sheet link added afterwards by forum JS:
			userLinks.appendChild(doc.createTextNode(" "));

			postbody = gSALR.PageUtils.selectSingleNode(doc, post, "TBODY//TD[contains(@class,'postbody')]");

			if (cancerTreatment)
			{
				var cancerDiv = gSALR.PageUtils.selectSingleNode(doc, postbody, "DIV[contains(@class,'cancerous')]");
				if (cancerDiv)
				{
					//Apply our alternate style:
					if (cancerTreatment == 1)
					{
						postbody.style.backgroundImage = 'url("chrome://salastread/skin/biohazard.png")';
						postbody.style.backgroundRepeat = "repeat";
					}
					//Hide entirely:
					else if (cancerTreatment == 2)
						post.style.display = "none";
				}
			}
			gSALR.PostHandler.convertSpecialLinks(postbody, doc);
			gSALR.PostHandler.processImages(postbody, doc);
		}

		doc.__salastread_loading = true;
		window.gBrowser.addEventListener("load", gSALR.pageFinishedLoading, true);
	},

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
					regReplyLink.innerHTML = "here.";
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

	handleAccount: function(doc)
	{
		var action;
		if ((action = doc.location.search.match(/action=(\w+)/i)) != null)
		{
			if (action[1] == "logout")
			{
				gSALR.Prefs.setPref("username", '');
				gSALR.Prefs.setPref("userId", 0);
			}
		}
		else
		{
			// There is no action specified, we may be logging in
			var div = doc.getElementById("main_wide");
			if (div)
			{
				var loginMsg = gSALR.PageUtils.selectSingleNode(doc, div, "DIV[contains(./text(),'GLUE')]");
				if (loginMsg)
				{
					var name = loginMsg.firstChild.textContent.match(/GLUE GLUEEEEE GLUUUUUUEEE, (.*)!  GLUUUEEE/);
					// Note that there are 2 spaces after the !, the extra space doesn't show up on the page but it's in the raw HTML
					if (name)
					{
						name = name[1];
						gSALR.Prefs.setPref("username", name);
					}
				}
			}
		}
	},

	handleMisc: function(doc)
	{
		var action;
		if ((action = doc.location.search.match(/action=(\w+)/i)) != null)
		{
			// Handle the "Who posted?" list window
			if (action[1] == "whoposted")
			{
				var posterTable = gSALR.PageUtils.selectSingleNode(doc,doc,"//DIV[@id='main_stretch']/DIV/TABLE/TBODY");
				var threadId = parseInt(doc.location.search.match(/threadid=(\d+)/i)[1], 10);
				if (posterTable && threadId)
				{
					var highlightUsernames = gSALR.Prefs.getPref("highlightUsernames");
					var sortReplyList = gSALR.Prefs.getPref("sortReplyList");

					// Make some headers for sorting users by importance
					// Custom colored users, then admins, then mods
					if (sortReplyList)
					{
						var headerUsers = posterTable.firstChild;
						headerUsers.firstChild.textContent = "Normal Users";

						var headerMods = posterTable.firstChild.cloneNode(true);
						headerMods.firstChild.textContent = "Moderators";
						posterTable.insertBefore(headerMods,posterTable.firstChild);

						var headerAdmins = posterTable.firstChild.cloneNode(true);
						headerAdmins.firstChild.textContent = "Administrators";
						posterTable.insertBefore(headerAdmins,posterTable.firstChild);

						var headerCustom = posterTable.firstChild.cloneNode(true);
						headerCustom.firstChild.textContent = "Users of Interest";
						posterTable.insertBefore(headerCustom,posterTable.firstChild);

						var customPosted, adminPosted, modPosted;
					}

					// Cycle through all the users listed and do whatever
					var rows = gSALR.PageUtils.selectNodes(doc, posterTable, "TR");
					for (var i in rows)
					{
						var posterId;
						var row = rows[i];

						// Skip the labels
						if (row.className == "smalltext" || row.childNodes[1].className == "smalltext")
						{
							continue;
						}

						// Linkify all the post counts to lead to the thread filtered for that poster
						posterId = parseInt(row.childNodes[1].firstChild.href.match(/userid=(\d+)/i)[1], 10);
					//	if (posterId)
					//	{
					//		row.childNodes[3].innerHTML = "<a onclick=\"opener.location=('showthread.php?s=&threadid="
					//			+ threadId + "&userid=" + posterId + "'); self.close();\" href=\"#\">" + row.childNodes[3].innerHTML + "</a>";
					//	}

						if ((highlightUsernames || sortReplyList) && posterId)
						{
							var userPriority = 0;

							if (gSALR.DB.isMod(posterId))
							{
								userPriority = 1;
							}
							if (gSALR.DB.isAdmin(posterId))
							{
								userPriority = 2;
							}

							// Check for user-defined name coloring and/or mod/admin coloring
							if (highlightUsernames)
							{
								var userColoring = gSALR.DB.isUserIdColored(posterId);
								if (userColoring)
								{
									if (userColoring.color && userColoring.color != "0")
									{
										row.childNodes[1].firstChild.style.color = userColoring.color;
										if (!gSALR.Prefs.getPref("dontBoldNames"))
										{
											row.childNodes[1].firstChild.style.fontWeight = "bold";
										}
										userPriority = 3;
									}
									if ((userColoring.background && userColoring.background != "0") || gSALR.DB.getPosterNotes(posterId))
										userPriority = 3;
								}
								else if (userPriority == 1)
								{
									row.childNodes[1].firstChild.style.color = gSALR.Prefs.getPref("modColor");
									if (!gSALR.Prefs.getPref("dontBoldNames"))
									{
										row.childNodes[1].firstChild.style.fontWeight = "bold";
									}
								}
								else if (userPriority == 2)
								{
									row.childNodes[1].firstChild.style.color = gSALR.Prefs.getPref("adminColor");
									if (!gSALR.Prefs.getPref("dontBoldNames"))
									{
										row.childNodes[1].firstChild.style.fontWeight = "bold";
									}
								}
							}

							// Sort them to the appropriate header
							if (sortReplyList)
							{
								switch (userPriority)
								{
									// Note for clarity: we are inserting the user BEFORE the headers referenced below,
									//   not after, thats why header and bool checks don't match up
									case 1:
										posterTable.insertBefore(row, headerUsers);
										modPosted = true;
										break;
									case 2:
										posterTable.insertBefore(row, headerMods);
										adminPosted = true;
										break;
									case 3:
										posterTable.insertBefore(row, headerAdmins);
										customPosted = true;
										break;
								}
							}
						}
					}

					// If we didn't sort any users to a particular header, remove it
					if (sortReplyList)
					{
						if (!customPosted)
						{
							posterTable.removeChild(headerCustom);
						}
						if (!adminPosted)
						{
							posterTable.removeChild(headerAdmins);
						}
						if (!modPosted)
						{
							posterTable.removeChild(headerMods);
						}
					}

					// If we came here from a link inside the thread, we dont want the link at the bottom to take us back to page 1
					if (doc.location.hash.search(/fromthread/i) > -1)
					{
						var closeLink = gSALR.PageUtils.selectSingleNode(doc, doc, "//A[contains(./text(),'show thread')]");
						closeLink.parentNode.innerHTML = "<a style=\"color: rgb(255, 255, 255) ! important;\" onclick=\"self.close();\" href=\"#\">" + closeLink.innerHTML + "</a>";
					}
				}
			}
		}
	},

	handleSupport: function(doc)
	{
		if (doc.getElementById('content') == null)
		{
			// If there is no content div then abort since something's not right
			return;
		}
		if (doc.getElementById('content').getElementsByTagName('iframe')[0].src.search(/supportfaq/) == -1)
		{
			// The iframe isn't there so something's changed
			return;
		}
		var newImg = doc.createElement('img');
		newImg.src = "chrome://salastread/skin/techsupport.jpg";
		var newText = doc.createElement('p');
		newText.innerHTML = "Please disable SA Last Read before reporting a problem with the forums";
		newText.style.textAlign = "center";
		var emptyP = doc.createElement('p');
		var newLink = doc.createElement('a');
		emptyP.appendChild(newLink);
		emptyP.style.textAlign = "center";
		newLink.href = "http://forums.somethingawful.com/showthread.php?threadid=2571027&goto=lastpost";
		newLink.innerHTML = "Click here to report a problem with SA Last Read instead";
		var supportTable = doc.getElementById('content').getElementsByTagName('div')[1];
		supportTable.parentNode.replaceChild(newImg, supportTable);
		newImg.parentNode.appendChild(newText);
		newImg.parentNode.appendChild(emptyP);
	},

	handleStats: function(doc)
	{
		if (doc.getElementsByName('t_forumid'))
		{
			// The forum list is here so let's update it
			//gSALR.grabForumList(doc);
		}
	},

	handleProfileView: function(doc)
	{
		var postSearchLink = gSALR.PageUtils.selectSingleNode(doc, doc, "//A[contains(./text(),'find posts by user')]");
		if (!postSearchLink)
			return;
		var userid = postSearchLink.href.match(/userid=(\d+)/i)[1];
		var newLink = doc.createElement('a');
		newLink.href = "/banlist.php?userid=" + userid;
		newLink.title = "Show poster's ban/probation history.";
		newLink.innerHTML = "Rap Sheet";
		newLink.style.color = "#FFFFFF";
		postSearchLink.parentNode.appendChild(doc.createTextNode(" ("));
		postSearchLink.parentNode.appendChild(newLink);
		postSearchLink.parentNode.appendChild(doc.createTextNode(")"));
	},

	handleModQueue: function(doc)
	{
	},

	handleOldSearch: function(doc)
	{
	},

	handleSearch: function(doc)
	{
		// Add support for mouse gestures / pagination
		if (gSALR.Prefs.getPref("gestureEnable"))
		{
			var pageList = gSALR.PageUtils.selectNodes(doc, doc, "//DIV[contains(@class,'pager')]");
			if (pageList)
			{
				if (pageList.length >= 1)
					pageList = pageList[pageList.length-1];
				else
					return;
				var numPages = pageList.innerHTML.match(/\((\d+)\)/);
				if (!numPages)
					return;
				var curPage = gSALR.PageUtils.selectSingleNode(doc, doc, "//a[contains(@class,'current')]");
				if (pageList.childNodes.length > 1) // Are there pages
				{
					numPages = parseInt(numPages[1], 10);
					curPage = parseInt(curPage.innerHTML, 10);
				}
				else
				{
					numPages = 1;
					curPage = 1;
				}
			}

			doc.__SALR_curPage = curPage;
			doc.__SALR_maxPage = numPages;

			doc.body.addEventListener('mousedown', gSALR.pageMouseDown, false);
			doc.body.addEventListener('mouseup', gSALR.pageMouseUp, false);
		}
	},

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Utility Functions ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	insertSALRConfigLink: function(doc)
	{
		var usercpnode = gSALR.PageUtils.selectSingleNode(doc, doc.body, "//UL[@id='navigation']/LI/A[contains(@href,'usercp.php')]");
		if (usercpnode)
		{
			var containerLi = doc.createElement("LI");
			var sep = doc.createTextNode(" - ");
			var newlink = doc.createElement("A");
			containerLi.appendChild(sep);
			containerLi.appendChild(newlink);
			newlink.appendChild( doc.createTextNode("Configure SALR") );
			usercpnode.parentNode.parentNode.insertBefore(containerLi, usercpnode.parentNode.nextSibling);
			newlink.href = "#";
			newlink.addEventListener("click", gSALR.runConfig, true);
		}
	},

	getPageTitle: function(doc)
	{
		if (doc.title == "The Something Awful Forums")
		{
			return doc.title;
		}
		return doc.title.replace(/( \- )?The Something ?Awful Forums( \- )?/i, '');
	},

	runConfig: function(paneID, args)
	{
		function handleArgs(cWin)
		{
			if (args && args["action"] === "addUser" )
			{
				cWin.gSALRUsersPane.handleIncomingArgs(args);
				//let advancedPaneTabs = doc.getElementById("advancedPrefs");
				//advancedPaneTabs.selectedTab = doc.getElementById(args["advancedTab"]);
			}
		}
		// check browser prefs so the dialog has the proper constructor arguments
		var prefServ = Components.classes["@mozilla.org/preferences-service;1"]
					.getService(Components.interfaces.nsIPrefBranch);
		var hasPrefPref = prefServ.getPrefType("browser.preferences.inContent");
		var inContent = hasPrefPref ? prefServ.getBoolPref("browser.preferences.inContent") : false;
		if (inContent === true)
		{
			let preferencesURL = "about:salr" + (paneID ? "#" + paneID : "");
			let newLoad = !window.switchToTabHavingURI(preferencesURL, true, {ignoreFragment: true});
			let browser = window.gBrowser.selectedBrowser;
			if (newLoad)
			{
				Services.obs.addObserver(function actionArgsLoadedObs(prefWin, topic, data)
				{
					if (!browser) {
						browser = window.gBrowser.selectedBrowser;
					}
					if (prefWin != browser.contentWindow) {
						return;
					}
					Services.obs.removeObserver(actionArgsLoadedObs, "action-args-loaded");
					handleArgs(browser.contentWindow);
					//handleArgs(browser.contentDocument);
				}, "action-args-loaded", false);
			}
			else
			{
				if (paneID)
				{
					browser.contentWindow.gotoPref(paneID);
				}
				handleArgs(browser.contentWindow);
				//handleArgs(browser.contentDocument);
			}
			//window.openUILinkIn(preferencesURL, "tab");
		}
		else
		{
			var instantApply = prefServ.getBoolPref("browser.preferences.instantApply");
			var features = "chrome,titlebar,toolbar,centerscreen,resizable" + (instantApply ? ",dialog=no" : ",modal");

			window.openDialog("chrome://salastread/content/pref/pref.xul", "Preferences", features, paneID, { "args" : args });
		}
	},

	// add a user to the highlighting/note section by clicking on a post link
	addHighlightedUser: function(userid, username, e)
	{
		e.stopPropagation();
		e.preventDefault();

		gSALR.runConfig('users', { "action" : "addUser", "userid" : userid, "username" : username });
	},

	timerTick: function()
	{
		if (gSALR.timerPageCount > 0)
		{
			gSALR.Timer.PingTimer();
		}
	},

	addHiddenFormInput: function(doc,form,name,value)
	{
	   var newel = doc.createElement("INPUT");
	   newel.type = "hidden";
	   newel.name = name;
	   newel.value = value;
	   form.appendChild(newel);
	},

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CSS & Formatting Functions //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	// This function should be removed if SALR ever allows more detailed color settings (backgrounds, font colors, etc)
	handleBodyClassing: function(doc)
	{
		var docbody = doc.body;
		var addclass = " somethingawfulforum";
		var phmatch = doc.location.href.match( /\/([^\/]*)\.php/ );
		if (phmatch)
		{
			addclass += " somethingawfulforum_"+phmatch[1]+"_php";
		}
		if (docbody)
			docbody.className += addclass;
	},



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Navbar & Mouse Gesture Functions ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	quickPostJump: function(event)
	{
		try {
			var ctrlKey = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
			if (ctrlKey)
			{
				// If any special keys were pressed, don't bother processing
				return;
			}
			var targ = event.target;
			var doc = targ.ownerDocument;
			var pressed = event.which;
			var postId, post, classChange, rescroll = false;

			// This should probably be edited to get the # of posts on the current page
			var maxPosts = gSALR.Prefs.getPref('postsPerPage');
			if (maxPosts == 0)
				maxPosts = 40;

			if (doc.__SALR_curFocus)
			{
				postId = doc.__SALR_curFocus;
			}
			else if (doc.location.href.match(/\#pti(\d+)$/))
			{
				postId = doc.location.href.match(/\#pti(\d+)$/)[1];
			}
			else if (doc.location.href.match(/\#(post\d+)$/))
			{
				postId = doc.location.href.match(/\#(post\d+)$/)[1];
				postId = doc.getElementById(postId).getElementsByTagName('tr')[0].id;
				postId = postId.match(/pti(\d+)$/)[1];
			}
			else
			{
				postId = '1';
			}
			switch (String.fromCharCode(pressed).toLowerCase())
			{
				case gSALR.Prefs.getPref('kb.reanchor'):
				case gSALR.Prefs.getPref('kb.reanchorAlt'):
					doc.getElementById('pti' + postId).parentNode.parentNode.className += ' focused';
					post = doc.getElementById('pti' + postId);
					rescroll = true;
					break;
				case gSALR.Prefs.getPref('kb.nextPage'):
				case gSALR.Prefs.getPref('kb.nextPageAlt'):
					// Goto next page
					if (doc.__SALR_curPage < doc.__SALR_maxPage)
					{
						doc.location = gSALR.Navigation.editPageNumIntoURI(doc, "pagenumber=" + (doc.__SALR_curPage + 1));
					}
					break;
				case gSALR.Prefs.getPref('kb.nextPost'):
				case gSALR.Prefs.getPref('kb.nextPostAlt'):
					// Goto next post
					postId++;
					if (postId <= maxPosts)
					{
						if (doc.getElementById('pti' + (postId - 1)))
						{
							classChange = doc.getElementById('pti' + (postId - 1)).parentNode.parentNode;
							classChange.className = classChange.className.replace(/(^|\s)focused($|\s)/, '');
							doc.getElementById('pti' + postId).parentNode.parentNode.className += ' focused';
						}
						post = doc.getElementById('pti' + postId);
						rescroll = true;
					}
					break;
				case gSALR.Prefs.getPref('kb.prevPage'):
				case gSALR.Prefs.getPref('kb.prevPageAlt'):
					// Goto previous page
					if (doc.__SALR_curPage > 1)
					{
						doc.location = gSALR.Navigation.editPageNumIntoURI(doc, "pagenumber=" + (doc.__SALR_curPage - 1));
					}
					break;
				case gSALR.Prefs.getPref('kb.prevPost'):
				case gSALR.Prefs.getPref('kb.prevPostAlt'):
					// Goto previous post
					postId--;
					if (postId > 0)
					{
						if (doc.getElementById('pti' + (postId + 1)))
						{
							classChange = doc.getElementById('pti' + (postId + 1)).parentNode.parentNode;
							classChange.className = classChange.className.replace(/(^|\s)focused($|\s)/, '');
							doc.getElementById('pti' + postId).parentNode.parentNode.className += ' focused';
						}
						post = doc.getElementById('pti' + postId);
						rescroll = true;
					}
					break;
				case gSALR.Prefs.getPref('kb.quickEdit'):
					// Activate Quick Edit Post
					var fakeEvent = {};
					var forumid = gSALR.PageUtils.getForumId(doc);
					var threadid = gSALR.PageUtils.getThreadId(doc);
					fakeEvent.originalTarget = gSALR.PageUtils.selectSingleNode(doc, doc.getElementById('pti' + postId).parentNode, 'TR/TD/UL/LI/IMG[@title="Quick Edit"]');
					gSALR.quickButtonClicked(fakeEvent, forumid, threadid);
					break;
				case gSALR.Prefs.getPref('kb.quickReply'):
					// Activate Quick Reply to Thread
					var fakeEvent = {};
					var forumid = gSALR.PageUtils.getForumId(doc);
					var threadid = gSALR.PageUtils.getThreadId(doc);
					fakeEvent.originalTarget = gSALR.PageUtils.selectSingleNode(doc, doc, '//UL[contains(@class,"postbuttons")]//IMG[@title="Quick Reply"]');
					gSALR.quickButtonClicked(fakeEvent, forumid, threadid);
					break;
				case gSALR.Prefs.getPref('kb.quickQuote'):
					// Activate Quick Quote Post
					var fakeEvent = {};
					var forumid = gSALR.PageUtils.getForumId(doc);
					var threadid = gSALR.PageUtils.getThreadId(doc);
					fakeEvent.originalTarget = gSALR.PageUtils.selectSingleNode(doc, doc.getElementById('pti' + postId).parentNode, 'TR/TD/UL/LI/IMG[@title="Quick Quote"]');
					gSALR.quickButtonClicked(fakeEvent, forumid, threadid);
					break;
			}
			if (rescroll)
			{
				post.scrollIntoView(true);
				doc.__SALR_curFocus = postId;
			}
		} catch(e) {window.dump('error:'+e);}
	},

	directionalNavigate: function(doc, dir)
	{
		var urlbase = doc.location.href.match(/.*\.somethingawful\.com/);
		var curPage = doc.__SALR_curPage;
		var perpage = "&perpage=" + gSALR.Prefs.getPref("postsPerPage");
		var forumid = doc.location.href.match(/forumid=[0-9]+/);
		var posticon = doc.location.href.match(/posticon=[0-9]+/);
		var inSearch = (doc.location.pathname == '/f/search/result');
		var searchid = doc.location.href.match(/qid=[0-9]+/);

		if (!posticon)
			posticon = "&posticon=0";
		var sortfield = doc.location.href.match(/&sortfield=[a-zA-Z0-9]+/);
		if (!sortfield)
			sortfield = "&sortfield=lastpost";
		var sortorder = doc.location.href.match(/&sortorder=[a-z]+/);
		if (!sortorder)
			sortorder = "&sortorder=desc";
		var daysprune = doc.location.href.match(/&daysprune=[0-9]+/);
		if (!daysprune)
			daysprune = "&daysprune=30";
		var userfilter = doc.location.href.match(/&userid=[0-9]+/);
		if (!userfilter)
			userfilter = "";

		if (dir == "top")
		{
			var threadForum = doc.__SALR_forumid;

			if ((curPage == 1 && !threadForum) || inSearch)
			{
				doc.location = urlbase + "/index.php";
			}
			else
			{
				if (threadForum)
					doc.location = urlbase + "/forumdisplay.php?s=&forumid=" + threadForum;
				else
					doc.location = urlbase + "/forumdisplay.php?s=&" + forumid + posticon;
			}
		}
		else if (dir == "left")
		{
			if (curPage > 1)
			{
				var threadid = doc.__SALR_threadid;
				if (threadid)
					doc.location = urlbase + "/showthread.php?s=&threadid=" + threadid + userfilter + perpage + "&pagenumber=" + (curPage - 1);
				else if (inSearch)
					doc.location = urlbase + "/f/search/result?" + searchid + "&p=" + (curPage - 1);
				else
					doc.location = urlbase + "/forumdisplay.php?" + forumid + daysprune + sortorder + sortfield + perpage + posticon + "&pagenumber=" + (curPage - 1);
			}
		}
		else if (dir == "right")
		{
			var maxPage = doc.__SALR_maxPage;
			if (maxPage > curPage)
			{
				var threadid = doc.__SALR_threadid;
				if (threadid)
					doc.location = urlbase + "/showthread.php?s=&threadid=" + threadid + userfilter + perpage + "&pagenumber=" + (curPage + 1);
				else if (inSearch)
					doc.location = urlbase + "/f/search/result?" + searchid + "&p=" + (curPage + 1);
				else
					doc.location = urlbase + "/forumdisplay.php?" + forumid + daysprune + sortorder + sortfield + perpage + posticon + "&pagenumber=" + (curPage + 1);
			}
		}
	},

	pageMouseUp: function(event)
	{
		var targ = event.target;
		var doc = targ.ownerDocument;
		if (targ && targ.SALR_isGestureElement == true)
		{
			doc.body.addEventListener('contextmenu', gSALR.gestureContextMenu, false);
			gSALR.directionalNavigate(doc, targ.SALR_dir);
		}

		var gn = doc.getElementById("salastread_gesturenavtop");
		if (gn)
		{
			var rx = 	function(dir)
						{
							var el = doc.getElementById("salastread_gesturenav"+dir);
							el.parentNode.removeChild(el);
						};

			rx("top");
			rx("left");
			rx("right");
			rx("bottom");
		}
	},

	gestureContextMenu: function(event)
	{
		var targ = event.target;
		var doc = targ.ownerDocument;
		doc.body.removeEventListener('contextmenu', gSALR.gestureContextMenu, false);
		if (event.preventDefault)
		{
			event.preventDefault();
		}
		return false;
	},

	pageMouseDown: function(event)
	{
		var doc = event.target.ownerDocument;

		// Suppress gesture nav on embeds
		if (event.target.nodeName.toLowerCase() == 'embed')
			return;

		var gn = doc.getElementById("salastread_gesturenavtop");
		if (gn)
		{
			return;
		}
		if (event.button == gSALR.Prefs.getPref('gestureButton') && gSALR.Prefs.getPref('gestureEnable'))
		{
			var cx =	function(dir, ofsy, ofsx)
						{
							var el = doc.createElement("IMG");
								el.SALR_dir = ""+dir;
								el.id = "salastread_gesturenav"+dir;
								el.className = "salastread_gesturenav";
								el.src = "chrome://salastread/skin/gesturenav-" + dir + ".png";
								el.style.left = ((event.clientX - 36) + (77 * ofsx)) + "px";
								el.style.top = ((event.clientY - 36) + (77 * ofsy)) + "px";
							doc.body.appendChild(el);
							el.SALR_isGestureElement = true;

							if (dir=="left" && (doc.__SALR_curPage <= 1 || !doc.__SALR_curPage))
							{
								el.className += " disab";
							}
							else if (dir=="right" && (doc.__SALR_maxPage <= doc.__SALR_curPage || !doc.__SALR_maxPage))
							{
								el.className += " disab";
							}
						};
			cx("top", -1, 0);
			cx("left", 0, -1);
			cx("right", 0, 1);
			cx("bottom", 1, 0);
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
				threadTitle = gSALR.getPageTitle(target.ownerDocument);

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
				threadTitle = gSALR.getPageTitle(target.ownerDocument);

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

	// Event catcher for clicking on the Mark Unseen box from a thread list
	clickMarkUnseen: function()
	{
		var doc = this.ownerDocument;
		var thread = this.parentNode.parentNode.parentNode.parentNode;
		if (thread)
		{
			var threadRepliesBox = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'replies')]");
			if (threadRepliesBox)
			{
				// Remove the new replies count
				if (!gSALR.Prefs.getPref("disableNewReCount") && thread.className.search(/newposts/i) > -1)
				{
					while (threadRepliesBox.childNodes[1])
					{
						// Delete everything but the original link
						threadRepliesBox.removeChild(threadRepliesBox.childNodes[1]);
					}
				}
			}
		}
	},

	// Event catcher for clicking the "Hide Avatar" or "Unhide Avatar" links
	clickToggleAvatar: function(idToToggle, nameToToggle, curPostId, event)
	{
		event.stopPropagation();
		event.preventDefault();
		let clickedLink = event.originalTarget;
		var doc = clickedLink.ownerDocument;
		var alreadyHidden = gSALR.DB.isAvatarHidden(idToToggle);
		var posts = gSALR.PageUtils.selectNodes(doc, doc, "//table[contains(@id,'post')]");
		var post, profileLink, posterId, titleBox, toggleLink;

		for (var n = 0; n < posts.length; n++)
		{
			post = posts[n];
			let reachedSelf = false;
			profileLink = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//ul[contains(@class,'profilelinks')]//a[contains(@href,'userid=')]");
			if (!profileLink)
				continue;
			posterId = profileLink.href.match(/userid=(\d+)/i)[1];
			if (posterId == idToToggle)
			{
				// Standard template
				titleBox = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//dl[contains(@class,'userinfo')]//dd[contains(@class,'title')]");
				// If that doesn't work, try FYAD template
				if (titleBox == null)
					titleBox = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postbody')]//div[contains(@class,'title')]");

				toggleLink = gSALR.PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//a[text() = 'Hide Avatar' or text() = 'Show Avatar']");
				if (toggleLink === clickedLink)
					reachedSelf = true;

				if (alreadyHidden)
				{
					if (titleBox.style.visibility === "hidden")
						titleBox.style.visibility = "visible";
					else
						titleBox.style.display = "block";
					toggleLink.textContent = "Hide Avatar";
				}
				else
				{
					if (reachedSelf)
						titleBox.style.display = "none";
					else
						titleBox.style.visibility = "hidden";
					toggleLink.textContent = "Show Avatar";
				}
			}
		}
		gSALR.DB.toggleAvatarHidden(idToToggle, nameToToggle);
	},


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Advanced Thread Filtering Functions /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	rebuildFilterBox: function(doc)
	{
		var filterDiv = doc.getElementById("filter");
		var toggleDiv = gSALR.PageUtils.selectSingleNode(doc, filterDiv, "div[contains(@class, 'toggle_tags')]");
		var tagsDiv = gSALR.PageUtils.selectSingleNode(doc, filterDiv, "div[contains(@class, 'thread_tags')]");
		var afObject, afObject2; // Temp object storage for things that really only get handled once

		if (toggleDiv && tagsDiv)
		{
			var afIgnoredIcons;
			//var afIgnoredKeywords;
			//var prefIgnoredPostIcons = gSALR.Prefs.getPref("ignoredPostIcons");
			var prefIgnoredKeywords = gSALR.Prefs.getPref("ignoredKeywords");

			toggleDiv.innerHTML = '';
			afObject = doc.createElement("b");
			afObject.innerHTML = "Advanced thread filtering";
			toggleDiv.appendChild(afObject);
			afObject = doc.createElement("div");
			afObject.id = "salr_filteredthreadcount";
			afObject.style.fontSize = "80%";
			afObject.style.fontWeight = "normal";
			afObject.style.marginLeft = "6px";
			afObject.appendChild(doc.createTextNode("(Currently ignoring "));
			afObject.appendChild(doc.createTextNode("0"));
			afObject.appendChild(doc.createTextNode(" threads.)"));
			toggleDiv.appendChild(afObject);

			var tagsHead = doc.createElement("div");
			tagsDiv.insertBefore(tagsHead,tagsDiv.firstChild);

			// Move the current non-advanced filtered icon to the top, if applicable
			var alreadyFiltering = doc.location.href.match(/posticon=(\d+)/i);
			if (alreadyFiltering && alreadyFiltering[1])
			{
				var filteredIcon = gSALR.PageUtils.selectSingleNode(doc, tagsDiv, "A[contains(@href,'posticon=" + parseInt(alreadyFiltering[1]) + "')]");
				afObject2 = gSALR.PageUtils.selectSingleNode(doc, tagsDiv, "DIV[contains(@class,'remove_tag')]/A");
				if (filteredIcon && afObject2)
				{
					tagsHead.appendChild(doc.createTextNode("Showing only this icon: ("));
					afObject = filteredIcon.cloneNode(true);
					afObject.firstChild.style.marginRight = '0px';
					afObject.firstChild.style.marginBottom = '-2px';
					afObject.href = afObject2.href;
					afObject.innerHTML += "&nbsp;Reset";
					afObject.style.fontSize = "75%";
					afObject.style.fontWeight = "bold";
					tagsHead.appendChild(afObject);
					tagsHead.appendChild(doc.createTextNode(")"));
					tagsHead.appendChild(doc.createElement("br"));
					tagsHead.appendChild(doc.createElement("br"));
				}
			}
			// Remove the "Remove filter" link since it's showing up all the time
			let removeTagsDiv = gSALR.PageUtils.selectSingleNode(doc, tagsDiv, "DIV[contains(@class,'remove_tag')]");
			if (removeTagsDiv)
				removeTagsDiv.parentNode.removeChild(removeTagsDiv);

			// Add a message for when all the icons are ignored and hide it for now
			afObject = doc.createElement("div");
			afObject.id = "alliconsignored";
			afObject.appendChild(doc.createTextNode("You've ignored everything but shit posts, you cretin!"));
			afObject.style.fontWeight = "bold";
			gSALR.PageUtils.toggleVisibility(afObject,true);
			tagsDiv.insertBefore(afObject,tagsHead.nextSibling);

			// Plug a bunch of stuff in after the main icon list
			afObject = doc.createElement("div");
			afObject.appendChild(doc.createTextNode("Ctrl click an icon to add to ignored list."));
			afObject.style.fontStyle = "italic";
			afObject.style.fontSize = "85%";
			tagsDiv.appendChild(afObject);
			tagsDiv.appendChild(doc.createElement("br"));

			// Now all the ignored icons
			tagsDiv.appendChild(doc.createTextNode("Ignored icons:"));
			tagsDiv.appendChild(doc.createElement("br"));
			afIgnoredIcons = doc.createElement("div");
			afIgnoredIcons.id = "ignoredicons";
			afObject = doc.createElement("div");
			afObject.id = "noiconsignored";
			afObject.appendChild(doc.createTextNode("None."));
			afObject.style.fontStyle = "italic";
			afObject.style.visibility = "visible";
			afObject.style.display = "inline";
			afIgnoredIcons.appendChild(afObject);
			tagsDiv.appendChild(afIgnoredIcons);
			tagsDiv.appendChild(doc.createElement("br"));

			// Now the ignored keywords
			tagsDiv.appendChild(doc.createTextNode("Ignored keywords:"));
			tagsDiv.appendChild(doc.createElement("br"));
			afObject = doc.createElement("input");
			afObject.id = "ignoredkeywords";
			afObject.type = "text";
			afObject.value = prefIgnoredKeywords;
			afObject.size = 75;
			tagsDiv.appendChild(afObject);
			tagsDiv.appendChild(doc.createTextNode(" "));
			afObject = doc.createElement("input");
			afObject.type = "button";
			afObject.value = "Save";
			afObject.addEventListener("click", gSALR.clickIgnoreKeywordSave, false);
			tagsDiv.appendChild(afObject);
			tagsDiv.appendChild(doc.createElement("br"));
			afObject = doc.createElement("div");
			afObject.appendChild(doc.createTextNode("Separate strings with a pipe \"|\" symbol. Too many strings may affect performance."));
			afObject.style.fontStyle = "italic";
			afObject.style.fontSize = "85%";
			tagsDiv.appendChild(afObject);
			tagsDiv.appendChild(doc.createElement("br"));

			// TODO: ability to ignore shitposts even though they dont have an icon id
			// TODO: remove all the icon stuff for when viewing the dumps but keep the rest, maybe add star# filtering for those
			// TODO: thread rating filtering
		}
	},

	// Event catcher for ignoring post icons
	clickToggleIgnoreIcon: function(event)
	{
		if (gSALR.Prefs.getPref("advancedThreadFiltering"))
		{
			var doc = this.ownerDocument;
			var filterDiv = doc.getElementById("filter");
			var tagsDiv = gSALR.PageUtils.selectSingleNode(doc, filterDiv, "div[contains(@class, 'thread_tags')]");

			if (tagsDiv)
			{
				var afIgnoredIcons, afShowMe, afHideMe, afIgnoring;
				var iconToIgnore, iconToIgnoreId, iconIgnored;
				var afObject; // Temp object storage for things that really only get handled once
				var prefIgnoredPostIcons = gSALR.Prefs.getPref("ignoredPostIcons");
				var prefIgnoredKeywords = gSALR.Prefs.getPref("ignoredKeywords");
				var anyLeft, anyLeftIn, mirrorIcons, searchString, threadBeGone;
				var threadList, thread, threadIcon;

				afIgnoredIcons = doc.getElementById("ignoredicons");

				if (this.parentNode == tagsDiv)
				{
					if (event.ctrlKey == false)
					{
						return; // Moving from the main icon list requires ctrl click
					}
					afIgnoring = true;
					afShowMe = "alliconsignored";
					afHideMe = "noiconsignored";
					anyLeftIn = tagsDiv;
					mirrorIcons = afIgnoredIcons;
				}
				else if (this.parentNode.id == "ignoredicons")
				{
					afIgnoring = false;
					afShowMe = "noiconsignored";
					afHideMe = "alliconsignored";
					anyLeftIn = afIgnoredIcons;
					mirrorIcons = tagsDiv;
				}
				else
				{
					return;
				}

				iconToIgnore = this.firstChild;
				iconToIgnoreId = parseInt(iconToIgnore.href.match(/posticon=(\d+)/i)[1]);
				iconIgnored = gSALR.PageUtils.selectSingleNode(doc, mirrorIcons, "DIV/A[contains(@href,'posticon=" + iconToIgnoreId + "')]");

				searchString = "(^|\\s)" + iconToIgnoreId + ",";
				searchString = new RegExp(searchString , "gi");

				if (!afIgnoredIcons || !iconIgnored || (afIgnoring && prefIgnoredPostIcons.search(searchString) > -1))
				{
					// Something is amiss
					return;
				}

				event.stopPropagation();
				event.preventDefault();

				if (afIgnoring)
				{
					prefIgnoredPostIcons += iconToIgnoreId + ", ";
				}
				else
				{
					prefIgnoredPostIcons = prefIgnoredPostIcons.replace(searchString,"");
				}
				gSALR.Prefs.setPref("ignoredPostIcons",prefIgnoredPostIcons);

				gSALR.PageUtils.toggleVisibility(this,true);
				afObject = doc.getElementById(afHideMe);
				if (afObject && afObject.style.visibility != "hidden")
				{
					gSALR.PageUtils.toggleVisibility(afObject,true);
				}

				gSALR.PageUtils.toggleVisibility(iconIgnored.parentNode,true);
				afObject = doc.getElementById(afShowMe);
				anyLeft = gSALR.PageUtils.selectSingleNode(doc, anyLeftIn, "DIV[contains(@style,'visibility: visible; display: inline;')]");
				if (!anyLeft && afObject && afObject.style.visibility == "hidden")
				{
					gSALR.PageUtils.toggleVisibility(afObject,true);
				}

				// Cycle through the threads and actively update their visibility
				threadList = gSALR.PageUtils.selectNodes(doc, doc, "//table[@id='forum']/tbody/tr");

				for (var i in threadList)
				{
					thread = threadList[i];
					threadIcon = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]//IMG");
					threadBeGone = false;
					if (threadIcon.src.search(/posticons\/(.*)/i) > -1)
					{
						var iconnum = threadIcon.src.match(/#(\d+)$/)[1];
						if (iconnum == iconToIgnoreId)
						{
							if (afIgnoring)
							{
								threadBeGone = true;
							}
						}
						else
						{
							continue;
						}
					}

					// No icon match or matched icon is being unignored, I could reveal it, but is it keyword-ignored?
					if (!threadBeGone && prefIgnoredKeywords && thread.style.visibility == "hidden")
					{
						var threadTitleLink = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/DIV/A[contains(@class, 'thread_title')]");
						if(!threadTitleLink)
						{
							threadTitleLink = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/A[contains(@class, 'thread_title')]");
						}
						var threadTitle = threadTitleLink.innerHTML;
						var keywordList = prefIgnoredKeywords.split("|");

						for (var j in keywordList)
						{
							let keywords = keywordList[j];
							if (!keywords)
							{
								continue;
							}
							searchString = new RegExp(keywords, "gi");

							if (threadTitle.search(searchString) > -1)
							{
								threadBeGone = true;
								break;
							}
						}
					}

					if (threadBeGone && thread.style.visibility != "hidden")
					{
						gSALR.PageUtils.toggleVisibility(thread,false);
						gSALR.filteredThreadCount(doc,1);
					}
					else if (!threadBeGone && thread.style.visibility == "hidden")
					{
						gSALR.PageUtils.toggleVisibility(thread,false);
						gSALR.filteredThreadCount(doc,-1);
					}
				}
			}
		}
	},

	// Event catcher for keyword ignoring input box
	clickIgnoreKeywordSave: function(event)
	{
		if (gSALR.Prefs.getPref("advancedThreadFiltering"))
		{
			var doc = this.ownerDocument;
			var afMain = doc.getElementById("filter");

			if (afMain)
			{
				var afObject; // Temp object storage for things that really only get handled once
				var prefIgnoredKeywords = gSALR.Prefs.getPref("ignoredKeywords");
				var prefIgnoredPostIcons = gSALR.Prefs.getPref("ignoredPostIcons");
				var threadList, thread, threadTitleLink, threadTitle, threadBeGone;
				var newKeywords, keywordList, keywords, searchString;

				afObject = doc.getElementById("ignoredkeywords");
				newKeywords = afObject.value;

				if (newKeywords == prefIgnoredKeywords)
				{
					return;
				}

				//	Todo: may need to strip certain chars like " or ' ?

			//	event.stopPropagation();
				event.preventDefault();

				gSALR.Prefs.setPref("ignoredKeywords",newKeywords);

				// Cycle through the threads and actively update their visibility
				threadList = gSALR.PageUtils.selectNodes(doc, doc, "//table[@id='forum']/tbody/tr");
				keywordList = newKeywords.split("|");

				for (var i in threadList)
				{
					thread = threadList[i];
					threadTitleLink = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/DIV/DIV/A[contains(@class, 'thread_title')]");
					if(!threadTitleLink)
					{
						threadTitleLink = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/A[contains(@class, 'thread_title')]");
					}
					threadTitle = threadTitleLink.innerHTML;
					threadBeGone = false;

					for (var j in keywordList)
					{
						keywords = keywordList[j];
						if (!keywords)
						{
							continue;
						}
						searchString = new RegExp(keywords, "gi");

						if (threadTitle.search(searchString) > -1)
						{
							threadBeGone = true;
							break;
						}
					}

					// No keyword match, I could reveal it, but is it icon-ignored?
					if (!threadBeGone && prefIgnoredPostIcons && thread.style.visibility == "hidden")
					{
						var threadIcon = gSALR.PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]//IMG");

						if (threadIcon.src.search(/posticons\/(.*)/i) > -1)
						{
							var iconnum = threadIcon.src.match(/#(\d+)$/)[1];
							if (prefIgnoredPostIcons.search(iconnum) > -1)
							{
								threadBeGone = true;
							}
						}
					}

					if (threadBeGone && thread.style.visibility != "hidden")
					{
						gSALR.PageUtils.toggleVisibility(thread,false);
						gSALR.filteredThreadCount(doc,1);
					}
					else if (!threadBeGone && thread.style.visibility == "hidden")
					{
						gSALR.PageUtils.toggleVisibility(thread,false);
						gSALR.filteredThreadCount(doc,-1);
					}
				}
			}
		}
	},

	// To cut down on code elsewhere (for keeping track of the number of threads being filtered)
	filteredThreadCount: function(doc,amount)
	{
		var count = gSALR.Prefs.getPref("filteredThreadCount");
		var afObject; // Temp object storage for things that really only get handled once

		afObject = doc.getElementById("salr_filteredthreadcount");

		if (!afObject)
			return;

		count += amount;
		afObject.childNodes[1].textContent = count;

		if (count <= 0 && afObject.style.visibility != "hidden")
		{
			gSALR.PageUtils.toggleVisibility(afObject,true);
		}
		else if (afObject.style.visibility == "hidden")
		{
			gSALR.PageUtils.toggleVisibility(afObject,true);
		}

		gSALR.Prefs.setPref("filteredThreadCount",count);
	},

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
			gSALR.addHiddenFormInput(doc,newform,"s","");

			if (gSALR.quickWindowParams.quicktype == "newthread")
			{
				newform.action = "http://forums.somethingawful.com/newthread.php";
				gSALR.addHiddenFormInput(doc, newform,"action", "postthread");
				gSALR.addHiddenFormInput(doc, newform, "forumid",  gSALR.quickWindowParams.forumid);
				gSALR.addHiddenFormInput(doc, newform, "iconid", gSALR.quickquotewin.document.getElementById('posticonbutton').iconid);
				gSALR.addHiddenFormInput(doc, newform, "subject", gSALR.quickquotewin.document.getElementById('subject').value);
			}
			else if (gSALR.quickWindowParams.quicktype == "editpost")
			{
				newform.action = "http://forums.somethingawful.com/editpost.php";
				gSALR.addHiddenFormInput(doc, newform,"action", "updatepost");
				gSALR.addHiddenFormInput(doc, newform, "postid", gSALR.quickWindowParams.postid);
			}
			else if (gSALR.quickWindowParams.quicktype == "quote" || gSALR.quickWindowParams.quicktype == "reply")
			{
				gSALR.addHiddenFormInput(doc, newform,"action", "postreply");
				gSALR.addHiddenFormInput(doc, newform,"threadid", gSALR.quickWindowParams.threadid);
			}

			gSALR.addHiddenFormInput(doc, newform,"parseurl", parseurl ? "yes" : "");
			gSALR.addHiddenFormInput(doc, newform,"bookmark", subscribe ? "yes" : "");
			gSALR.addHiddenFormInput(doc, newform,"disablesmilies", disablesmilies ? "yes" : "");
			gSALR.addHiddenFormInput(doc, newform,"signature", signature ? "yes" : "");
			gSALR.addHiddenFormInput(doc, newform,"message", message);
			gSALR.addHiddenFormInput(doc, newform,"MAX_FILE_SIZE", "2097152");
			gSALR.addHiddenFormInput(doc, newform,"formkey", formkey);

			if (form_cookie != "")
			{
				gSALR.addHiddenFormInput(doc, newform,"form_cookie", form_cookie);
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
					gSALR.addHiddenFormInput(doc,newform,"submit","Submit Reply");
					gSALR.DB.iPostedHere(gSALR.quickWindowParams.threadid);
				}
				else
				{
					gSALR.addHiddenFormInput(doc,newform,"preview","Preview Reply");
				}
			}
			else
			{
				gSALR.addHiddenFormInput(doc,newform,"preview","Preview Post");
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SA Drop Down Menu Functions /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	// Move to threadutils after other bits moved to UI
	grabForumList: function(doc)
	{
		var statsMenu = false;
		var rowList = gSALR.PageUtils.selectNodes(doc, doc, "//select[@name='forumid']/option");
		if (!rowList || rowList.length === 0)
		{
			// Can't find the forum list so lets check the other location
			rowList = gSALR.PageUtils.selectNodes(doc, doc, "//select[@name='t_forumid']/option");
			if (!rowList)
			{
				// Still couldn't find the forum list so let's stop now
				return;
			}
			statsMenu = true;
		}
		if (rowList.length < 15)
		{
			// There are way more then 15 forums so this menu is missing some
			return;
		}

		let oDomParser = new DOMParser();
		let forumsDoc = oDomParser.parseFromString("<?xml version=\"1.0\"?>\n<forumlist></forumlist>", "text/xml");
		//var targetEl = forumsDoc.documentElement;

		let forumsEl = forumsDoc.createElement("forums");
		forumsDoc.documentElement.appendChild(forumsEl);
		forumsDoc.documentElement.insertBefore(forumsDoc.createTextNode("\n"), forumsEl);

		for (let i = 0; i < rowList.length; )
		{
			i = gSALR._addForums(forumsDoc, rowList, i, forumsEl, 0, statsMenu);
		}

		gSALR.DB.forumListXml = forumsDoc;
		gSALR.DB.gotForumList = true;
		if (gSALR.Prefs.getPref('showSAForumMenu'))
		{
			gSALR.buildForumMenu('menubar');
			gSALR.buildForumMenu('toolbar');
		}
	},

	_addForums: function(forumsDoc, rowList, index, parentEl, depth, statsMenu)
	{
		var thisEl = rowList[index];
		var forumTitle = thisEl.firstChild.nodeValue;
		var forumId = thisEl.getAttribute("value");

		forumId = parseInt(forumId);
		if (isNaN(forumId) || forumId < 0)
		{
			return index+1;
		}

		var dashes = '--', elDepth = 0;
		if (statsMenu)
		{
			dashes = '---';
		}
		while (true)
		{
			if (forumTitle.indexOf(dashes) !== 0)
			{
				break;
			}

			forumTitle = forumTitle.substring(dashes.length);
			elDepth++;
		}
		forumTitle = forumTitle.replace(/^\s+|\s+$/g, '');
		forumTitle = forumTitle.replace('(no posting)', '');
		if (elDepth < depth)
		{
			return index;
		}
		if (elDepth > depth)
		{
			// This can't fit in the tree
			return index+1;
		}

		var fel;
		if (depth === 0)
		{
			fel = forumsDoc.createElement("cat");
		}
		else
		{
			fel = forumsDoc.createElement("forum");
		}

		fel.setAttribute("id", forumId);
		fel.setAttribute("name", forumTitle);
		parentEl.appendChild(forumsDoc.createTextNode("\n"));
		parentEl.appendChild(fel);

		for (index++; index < rowList.length; )
		{
			var i = gSALR._addForums(forumsDoc, rowList, index, fel, depth+1, statsMenu);

			if (i == index)
			{
				return i;
			}

			index = i;
		}
		return index;
	},

	menuItemCommand: function(event, el, etype)
	{
		var target = "none";
		if (etype === "command")
			target = "current";
		if (etype === "click")
			if (event.button === 2 || event.button === 1)
				target = "newtab";

		if (target !== "none")
		{
			// forum=search shortcut seems to be working again; comment to use new search instead:
			if (el.getAttribute("forumnum") == "search")
				gSALR.menuItemGoTo(event,"http://forums.somethingawful.com/f/search",target);
			else
				gSALR.menuItemGoTo(event,"http://forums.somethingawful.com/forumdisplay.php?s=&forumid="+el.getAttribute("forumnum"),target);
			// Try to block Firefox's default right-click menu for this element, if applicable.
			if (event.cancelable)
				event.preventDefault();
		}
	},

	menuItemCommandGoToStarredThread: function(event, el, etype, threadid)
	{
		// Band-aid: Don't execute this function twice on a left click.
		if (etype == "click" && event.button === 0)
			return;
		// Try to block Firefox's default right-click menu for this element, if applicable.
		if (event.cancelable)
			event.preventDefault();

		if (event.ctrlKey === true && event.shiftKey === true)
		{
			if (window.confirm("Do you want to unstar thread \"" + gSALR.DB.getThreadTitle(threadid) + "\"?"))
			{
				gSALR.DB.toggleThreadStar(threadid);
			}
			return;
		}

		try
		{
			gSALR.menuItemCommandURL(event, "http://forums.somethingawful.com/showthread.php?threadid=" + threadid + "&goto=newpost", etype);
		}
		catch(e)
		{
			alert("Couldn't find thread id: " + threadid);
		}
	},

	menuItemCommandURL: function(event, el, etype)
	{
		var target = "none";
		if (etype === "command")
		{
			target = "current";
		}
		else if (etype === "click")
		{
			if (event.button === 0)
				target = "current";
			else if (event.button === 2 || event.button === 1)
				target = "newtab";
		}

		var targeturl = "";
		if (typeof(el) === "string")
			targeturl = el;
		else
			targeturl = el.getAttribute("targeturl");

		if (target !== "none")
			gSALR.menuItemGoTo(event,targeturl,target);
	},

	menuItemGoTo: function(event, url, target)
	{
		if (target === "newtab")
		{
			getBrowser().addTab(url);
		}
		else if (target === "current")
		{
			if (getBrowser().selectedTab.pinned && !gSALR.Prefs.getPref('ignoreAppTabs'))
				getBrowser().selectedTab = getBrowser().addTab(url);
			else
				loadURI(url);
		}
	},

	_populateForumMenuFrom: function(nested_menus, target, pinnedForumNumbers, pinnedForumElements)
	{
		let forumsDoc = gSALR.DB.forumListXml;
		let forumListXmlSrc = forumsDoc ? forumsDoc.documentElement : null;
		// First, add Utils menu items
		let menuUtils = [
			{name:"Private Messages",id:"pm"},
			{name:"User Control Panel",id:"cp"},
			{name:"Search Forums",id:"search"},
			{name:"Forums Home",id:"home"},
			{name:"Leper's Colony",id:"lc"}];

		for (let i = 0; i < menuUtils.length; i++)
		{
			let thisUtil = menuUtils[i];
			let menuel = document.createElement("menuitem");
			menuel.setAttribute("label", thisUtil.name);
			menuel.setAttribute("forumnum", thisUtil.id);
			menuel.setAttribute("onclick", "gSALR.menuItemCommand(event,this,'click');");
			menuel.setAttribute("oncommand", "gSALR.menuItemCommand(event,this,'command');");

			//TODO: access keys
			target.appendChild(menuel);
		}
		target.appendChild(document.createElement("menuseparator"));

		// Next, see if we can add any forums - look for <forums> element in our XML
		// If we find it, pass that element to "populateForumMenuForumsFrom"
		var forums, foundforums = false;
		if (forumListXmlSrc) {
			for (var i = 0; i < forumListXmlSrc.childNodes.length; i++) {
				if (forumListXmlSrc.childNodes[i].nodeName == "forums")
					forums = forumListXmlSrc.childNodes[i];
			}
			if (forums)
				foundforums = gSALR._populateForumMenuForumsFrom(nested_menus, target, forums, pinnedForumNumbers, pinnedForumElements,0);
		}
		// If we don't find it, create an instructional placeholder menu item
		if (!foundforums)
		{
			let menuel = document.createElement("menuitem");
			menuel.setAttribute("label", "Visit a forum to reload list");
			menuel.setAttribute("forumnum", "home");

			target.appendChild(menuel);
		}
	},

	_populateForumMenuForumsFrom: function(nested_menus, target, src, pinnedForumNumbers, pinnedForumElements, depth)
	{
		var first = true;
		var foundAnything = false;
		for (var i = 0; i < src.childNodes.length; i++)
		{
			var thisforum = src.childNodes[i];

			if (thisforum.nodeName == "cat")
			{
				foundAnything = true;
				if (!nested_menus)
				{
					if (!first)
						target.appendChild(document.createElement("menuseparator"));
					else
						first = false;
					gSALR._populateForumMenuForumsFrom(nested_menus,target,thisforum,pinnedForumNumbers,pinnedForumElements,depth+1);
				}
				else
				{
					var submenu = document.createElement("menu");
					submenu.setAttribute("label", thisforum.getAttribute("name"));
					var submenupopup = document.createElement("menupopup");
					if (gSALR.Prefs.getPref('useSAForumMenuBackground'))
						submenupopup.setAttribute("class", "lastread_menu");

					submenu.appendChild(submenupopup);
					gSALR._populateForumMenuForumsFrom(nested_menus,submenupopup,thisforum,pinnedForumNumbers,pinnedForumElements,depth+1);
					target.appendChild(submenu);
				}
			}
			else if (thisforum.nodeName == "forum")
			{
				foundAnything = true;
				var menuel = document.createElement("menuitem");
				menuel.setAttribute("label", thisforum.getAttribute("name"));
				menuel.setAttribute("forumnum", thisforum.getAttribute("id"));
				menuel.setAttribute("onclick", "gSALR.menuItemCommand(event,this,'click');");
				menuel.setAttribute("oncommand", "gSALR.menuItemCommand(event,this,'command');");

				var cssClass = "";
				for (var j = 1; j <= depth; j++)
				{
					cssClass += "sub";
					if (j != depth)
						cssClass += "-";
				}

				if (cssClass != "")
					menuel.setAttribute("class", "lastread_menu_" + cssClass);

				//TODO: access keys
				target.appendChild(menuel);
				if (nested_menus)
				{
					var thisforumnum = thisforum.getAttribute("id");
					for (var j = 0; j < pinnedForumNumbers.length; j++)
					{
						if (pinnedForumNumbers[j] == thisforumnum)
							pinnedForumElements[j] = thisforum;
					}
				}
				gSALR._populateForumMenuForumsFrom(nested_menus,target,thisforum,pinnedForumNumbers,pinnedForumElements,depth+1);
			}
		}
		return foundAnything;
	},

	buildForumMenu: function(menuLoc)
	{
		var menupopup = null;
		if (menuLoc === "menubar")
		{
			// If there are any other SA menus, hide them.  Why? Who knows
			// Since this now defaults to off, it might not work, keep an eye out if anyone cares
			if (gSALR.Prefs.getPref('hideOtherSAMenus'))
			{
				var mmb = document.getElementById("main-menubar");
				for (var x=0; x<mmb.childNodes.length; x++)
				{
					var thischild = mmb.childNodes[x];
					if (thischild.nodeName=="menu")
					{
						if ((thischild.getAttribute("label")=="SA" || thischild.id=="menu-sa") && thischild.id!="salr-menu")
						{
							mmb.removeChild(thischild);
							x--;
						}
					}
				}
			}

			menupopup = document.getElementById("menupopup_SAforums");
			if (menupopup === null)
			{
				var iBefore = document.getElementById("tools-menu");
				if (!iBefore)
					iBefore = document.getElementById("main-menubar").lastChild;
				var salrMenu = document.createElement("menu");
				salrMenu.id = "salr-menu";
				salrMenu.setAttribute("label", "SA");
				salrMenu.setAttribute("accesskey", gSALR.Prefs.getPref('menuAccessKey'));
				salrMenu.style.display = "none";
				menupopup = document.createElement("menupopup");
				menupopup.id = "menupopup_SAforums";
				menupopup.className = "lastread_menu";
				salrMenu.appendChild(menupopup);
				iBefore.parentNode.insertBefore(salrMenu, iBefore);
			}
		}
		else if (menuLoc === "toolbar")
		{
			menupopup = document.getElementById("salr-toolbar-popup");
		}


		if (menupopup)
		{
			if (gSALR.Prefs.getPref('useSAForumMenuBackground'))
				menupopup.className = "lastread_menu";
			else
				menupopup.className = "";

			while (menupopup.firstChild)
			{
				menupopup.removeChild(menupopup.firstChild);
			}
			var nested_menus = gSALR.Prefs.getPref('nestSAForumMenu');
			var salrMenu = document.createElement("menuitem");
			var pinnedForumNumbers = new Array();
			var pinnedForumElements = new Array();
			if (nested_menus && gSALR.Prefs.getPref('menuPinnedForums'))
				pinnedForumNumbers = gSALR.Prefs.getPref('menuPinnedForums').split(",");
			salrMenu.setAttribute("label","Something Awful");
			salrMenu.setAttribute("image", "chrome://salastread/skin/sa.png");
			salrMenu.setAttribute("onclick", "gSALR.menuItemCommandURL(event,'http://www.somethingawful.com','click');");
			salrMenu.setAttribute("oncommand", "gSALR.menuItemCommandURL(event,'http://www.somethingawful.com','command');");
			salrMenu.setAttribute("class","menuitem-iconic lastread_menu_frontpage");
			menupopup.appendChild(salrMenu);
			menupopup.appendChild(document.createElement("menuseparator"));

			var lsalrMenu = document.createElement("menuitem");
			lsalrMenu.setAttribute("label","Configure SALastRead...");
			lsalrMenu.setAttribute("oncommand", "gSALR.runConfig();");
			menupopup.appendChild(lsalrMenu);
			menupopup.appendChild(document.createElement("menuseparator"));

			gSALR._populateForumMenuFrom(nested_menus,menupopup,pinnedForumNumbers,pinnedForumElements);

			// We only add pinned forums + any starred threads if nestSAForumMenu is true
			if (nested_menus && (pinnedForumElements.length > 0 || pinnedForumNumbers.length > 0))
			{
				menupopup.appendChild(document.createElement("menuseparator"));
				for (var j = 0; j < pinnedForumElements.length || j < pinnedForumNumbers.length; j++)
				{
					if (pinnedForumElements[j])
					{
						var thisforum = pinnedForumElements[j];
						var salrMenu = document.createElement("menuitem");
						var forumname = thisforum.getAttribute("name");
						while (forumname.substring(0,1)==" ")
						{
							forumname = forumname.substring(1);
						}
						salrMenu.setAttribute("label", forumname);
						salrMenu.setAttribute("forumnum", thisforum.getAttribute("id"));
						salrMenu.setAttribute("onclick", "gSALR.menuItemCommand(event,this,'click');");
						salrMenu.setAttribute("oncommand", "gSALR.menuItemCommand(event,this,'command');");
						salrMenu.setAttribute("class", "lastread_menu_sub");
						menupopup.appendChild(salrMenu);
					}
					else if (pinnedForumNumbers[j] == "sep")
					{
						menupopup.appendChild(document.createElement("menuseparator"));
					}
					else if (typeof(pinnedForumNumbers[j]) == "string" && pinnedForumNumbers[j].substring(0, 3) == "URL")
					{
						var umatch = pinnedForumNumbers[j].match(/^URL\[(.*?)\]\[(.*?)\]$/);
						if (umatch)
						{
							var salrMenu = document.createElement("menuitem");
							salrMenu.setAttribute("label", gSALR.PageUtils.UnescapeMenuURL(umatch[1]));
							salrMenu.setAttribute("targeturl", gSALR.PageUtils.UnescapeMenuURL(umatch[2]));
							salrMenu.setAttribute("onclick", "gSALR.menuItemCommandURL(event,this,'click');");
							salrMenu.setAttribute("oncommand", "gSALR.menuItemCommandURL(event,this,'command');");
							salrMenu.setAttribute("class", "lastread_menu_sub");

							menupopup.appendChild(salrMenu);
						}
					}
					else if (pinnedForumNumbers[j]=="starred")
					{
						var salrMenu = document.createElement("menu");
						salrMenu.setAttribute("label", "Starred Threads");
						salrMenu.setAttribute("image", "chrome://salastread/skin/star.png");
						salrMenu.setAttribute("class", "menu-iconic lastread_menu_starred");

						var subpopup = document.createElement("menupopup");
						if (menuLoc == "menubar")
							subpopup.id = "salr_starredthreadmenupopup";
						else if (menuLoc == "toolbar")
							subpopup.id = "salr_tb_starredthreadmenupopup";

						salrMenu.appendChild(subpopup);
						menupopup.appendChild(salrMenu);
						subpopup.setAttribute("onpopupshowing", "gSALR.starredThreadMenuShowing('"+menuLoc+"');");
					}
				}

				if (gSALR.Prefs.getPref('showMenuPinHelper'))
				{
					var ms = document.createElement("menuseparator");
					ms.setAttribute("class", "salr_pinhelper_item");
					menupopup.appendChild(ms);

					salrMenu = document.createElement("menuitem");
					salrMenu.setAttribute("label", "Learn how to pin forums to this menu...");
					salrMenu.setAttribute("image", "chrome://salastread/skin/eng101-16x16.png");
					salrMenu.setAttribute("oncommand", "gSALR.launchPinHelper();");
					salrMenu.setAttribute("class", "salr_pinhelper_item menuitem-iconic lastread_menu_sub");

					menupopup.addEventListener("popupshowing", function(){gSALR.removeMenuPinHelper(menuLoc);}, false);
					menupopup.appendChild(salrMenu);
				}
			}
		}
		if (menuLoc === "menubar")
			document.getElementById("salr-menu").style.display = "-moz-box";
	},

	// Only called for menubar
	removeForumMenu: function()
	{
		let menupopup = document.getElementById("menupopup_SAforums");
		if (menupopup !== null)
		{
			while (menupopup.firstChild)
				menupopup.removeChild(menupopup.firstChild);
			menupopup.parentNode.removeChild(menupopup);
		}
		let menu = document.getElementById("salr-menu");
		if (menu !== null)
			menu.parentNode.removeChild(menu);
	},

	starredThreadMenuShowing: function(menuLoc)
	{
		var menupopup;
		if (menuLoc === "menubar")
			menupopup = document.getElementById("salr_starredthreadmenupopup");
		else if (menuLoc === "toolbar")
			menupopup = document.getElementById("salr_tb_starredthreadmenupopup");

		while (menupopup.firstChild != null) {
			menupopup.removeChild(menupopup.firstChild);
		}
		var starred = gSALR.DB.starList;

		for (var id in starred)
		{
			var title = starred[id];
			let menuel = document.createElement("menuitem");
				menuel.setAttribute("label", title);
				menuel.setAttribute("onclick", "gSALR.menuItemCommandGoToStarredThread(event, this, 'click'," + id + ");");
				menuel.setAttribute("oncommand", "gSALR.menuItemCommandGoToStarredThread(event, this, 'command'," + id + ");");
			menupopup.appendChild(menuel);
		}

		if (!menupopup.firstChild)
		{
			let menuel = document.createElement("menuitem");
				menuel.setAttribute("label", "You have no threads starred.");
				menuel.setAttribute("disabled", "true");
			menupopup.appendChild(menuel);
		}
	},

	removeMenuPinHelper: function(menuLoc)
	{
		if (gSALR.Prefs.getPref('showMenuPinHelper') == false)
		{
			if (menuLoc === "menubar")
				var menupopup = document.getElementById("menupopup_SAforums");
			else if (menuLoc === "toolbar")
				var menupopup = document.getElementById("salr-toolbar-popup");
			if (menupopup)
			{
				var pinhelperItems = menupopup.getElementsByClassName('salr_pinhelper_item');
				while(pinhelperItems.length > 0)
					menupopup.removeChild(pinhelperItems[0]);
			}
		}
	},

	launchPinHelper: function()
	{
	   gSALR.Prefs.setPref('showMenuPinHelper', false);

	   gSALR.runConfig("menu");
	   alert("You may return to the menu settings at any time by choosing \"Configure SALastRead...\" from the SA menu, or by "+
	         "clicking the \"Configure SALR\" link in the header of any forum page.");
	},

};
