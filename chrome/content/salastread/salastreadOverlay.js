// gSALR will (hopefully) be our only global object per window
var gSALR = {
	// the service formerly known as persistObject
	service: null,

	// keeps track of how many SA timer-tracked pages are open
	timerPageCount: 0,

	// SALR init - called with each new browser window opened
	init: function()
	{
		window.addEventListener('load', gSALR.windowOnLoad, true);
		window.addEventListener('beforeunload', gSALR.windowOnBeforeUnload, true);
		window.addEventListener('unload', gSALR.windowOnUnload, true);
	},

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Core Funtions & Events /////////////////////////////////////////////////////////////////////////////////////////////

	windowOnLoad: function(e)
	{
		try
		{
			gSALR.service = Components.classes['@evercrest.com/salastread/persist-object;1'].getService().wrappedJSObject;
			if (!gSALR.service)
			{
				throw "Failed to create SALR service.";
			}

			// Anything that only needs to be run once (instead of for each browser window opened) should be placed within this code block.
			if (gSALR.service._needToRunOnce)
			{
				// This should get changed to something better eventually
				var isWindows = (navigator.platform.indexOf("Win") != -1);
				gSALR.service.ProfileInit(isWindows);
				if (gSALR.service._starterr)
					throw "SALR Startup Error";

				setInterval(gSALR.timerTick, 1000);

				var needToShowChangeLog = false;
				if (gSALR.service.LastRunVersion != gSALR.service.SALRversion)
				{
					needToShowChangeLog = !gSALR.service.IsDevelopmentRelease;
					//needToShowChangeLog = true;
					// Here we have to put special cases for specific dev build numbers that require the changelog dialog to appear
					var buildNum = parseInt(gSALR.service.LastRunVersion.match(/^(\d+)\.(\d+)\.(\d+)/)[3], 10);
					gSALR.service.checkForSQLPatches(buildNum);
				}
				if (needToShowChangeLog == true)
				{
					needToShowChangeLog = false;
					//openDialog("chrome://salastread/content/newfeatures/newfeatures.xul", "SALR_newfeatures", "chrome,centerscreen,dialog=no");
					// This requires a timeout to function correctly.
					setTimeout(gSALR.showChangelogAlert, 10);
				}

				// Fill up the cache
				gSALR.service.populateDataCaches();

				// Load Styles
				gSALR.service.updateStyles();

				gSALR.service.LastRunVersion = gSALR.service.SALRversion;

				gSALR.service._needToRunOnce = false;
			}
		}
		catch (e)
		{
			alert("SALastRead init error: "+e);
			if (gSALR.service)
			{
				alert("gSALR.service._starterr =\n" + gSALR.service._starterr);
			}
		}
		if (document.getElementById('appcontent'))
			window.addEventListener('DOMContentLoaded', gSALR.onDOMLoad, true);
		if (gSALR.service.getPreference("showSAForumMenu") && (document.getElementById("salr-menu") == null))
			SALR_buildForumMenu();
	},

	showChangelogAlert: function()
	{
		var alertsService = Components.classes["@mozilla.org/alerts-service;1"].
                      getService(Components.interfaces.nsIAlertsService);
		try {
		  alertsService.showAlertNotification("chrome://salastread/skin/sa-24.png", 
									  "SALR extension updated!", "Click here for the changelog.", 
									  true, "", gSALR.changelogListener, "");
		} catch (e) {
			// This can fail on Mac OS X
		}
	},

	changelogListener:
	{
		observe: function(subject, topic, data)
		{
			// User has requested changelog
			if (topic == "alertclickcallback")
			{
				gSALR.runConfig("about");
				//gSALR.openChangelogTab();
			}
		},
	},

	openChangelogTab: function()
	{
		gBrowser.selectedTab = gBrowser.addTab("chrome://salastread/content/changelog.html");
	},

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
		if (simpleURI || doc.location.host.search(/^(forum|archive)s?\.somethingawful\.com$/i) == -1 || gSALR.service.getPreference("disabled"))
		{
			return;
		}
		if (doc.__salastread_processed)
		{
			return;
		}

		// Set a listener on the context menu
		if (gSALR.service.getPreference("enableContextMenu") && gSALR.service.getPreference("disabled") == false)
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
				if (gSALR.service.getPreference("gestureEnable"))
					gSALR.insertCSS(doc, "chrome://salastread/content/css/gestureStyling.css");
				if (gSALR.service.getPreference("removeHeaderAndFooter"))
					gSALR.insertCSS(doc, "chrome://salastread/content/css/removeHeaderAndFooter.css");
				if (gSALR.service.getPreference("enablePageNavigator") || gSALR.service.getPreference("enableForumNavigator"))
					gSALR.insertCSS(doc, "chrome://salastread/content/css/pageNavigator.css");

				// Insert a text link to open the options menu
				if (gSALR.service.getPreference('showTextConfigLink'))
					gSALR.insertSALRConfigLink(doc);

				// Remove the page title prefix/postfix
				if (gSALR.service.getPreference("removePageTitlePrefix"))
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

			if (gSALR.service.getPreference('enableDebugMarkup'))
			{
				var dbg = doc.createElement("DIV");
				dbg.innerHTML = SALR_debugLog.join("<br>");
				doc.body.appendChild(dbg);
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

					if (!gSALR.service || !gSALR.service.getPreference('suppressErrors'))
					{
						alert("SALastRead application err: "+errstr);
						//alert("SALastRead application err: "+ex);
					}
					else
					{
						if (!gSALR.service || !gSALR.service.getPreference('suppressErrors'))
						{
							alert("SALastRead application err: "+ex);
						}
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
		if (gSALR.service.getPreference('reanchorThreadOnLoad'))
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

	windowOnBeforeUnload: function(e)
	{
		if (gSALR.quickWindowParams.doc && e.originalTarget == gSALR.quickWindowParams.doc)
		{
			if (quickQuoteSubmitting)
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

	windowOnUnload: function(e)
	{
		if (e.originalTarget.__salastread_processed)
		{
			gSALR.timerPageCount--;
			gSALR.service.SaveTimerValue();
		}
	},

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Page Handlers ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	// Do anything needed to the post list in a forum
	handleForumDisplay: function(doc)
	{
		var failed, i, e;  // Little variables that'll get reused
		var forumid = gSALR.service.getForumID(doc);
		if (forumid === false)
		{
			// Can't determine forum id so stop
			return;
		}
		// The following forums have special needs that must be dealt with
		var flags = {
			"inFYAD" : gSALR.service.inFYAD(forumid),
			"inDump" : gSALR.service.inDump(forumid),
			"inAskTell" : gSALR.service.inAskTell(forumid),
			"inGasChamber" : gSALR.service.inGasChamber(forumid),
			"inArchives" : (doc.location.host.search(/^archives\.somethingawful\.com$/i) > -1)
		};

		if (doc.getElementById('forum') == null) {
			// /!\ Forum table isn't there, abort! /!\
			return;
		}

		if (!gSALR.service.gotForumList)
		{
			// Replace this function once the AJAXified JSON is added to the forums
			// function will check timestamp which is stored in preferences

			grabForumList(doc);
			gSALR.service.gotForumList = true;
		}

		if (flags.inFYAD && !gSALR.service.getPreference("enableFYAD")) {
			// We're in FYAD and FYAD support has been turned off
			return;
		}

		// Add our thread list CSS for FYAD/BYOB
		gSALR.service.insertDynamicCSS(doc, gSALR.service.generateDynamicThreadListCSS(forumid));

		// Start a transaction to try and reduce the likelihood of database corruption
		var ourTransaction = false;
		if (gSALR.service.database.transactionInProgress) {
			ourTransaction = true;
			gSALR.service.database.beginTransactionAs(gSALR.service.database.TRANSACTION_DEFERRED);
		}

		var pageList = gSALR.service.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
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
				var curPage = gSALR.service.selectSingleNode(doc, pageList, "//OPTION[@selected='selected']");
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
		if (gSALR.service.getPreference("enableForumNavigator"))
		{
			gSALR.service.addPagination(doc);
		}
		if (gSALR.service.getPreference("gestureEnable"))
		{
			doc.body.addEventListener('mousedown', gSALR.pageMouseDown, false);
			doc.body.addEventListener('mouseup', gSALR.pageMouseUp, false);
		}

		// Turn on keyboard navigation
		if (gSALR.service.getPreference('quickPostJump'))
		{
			doc.addEventListener('keypress', gSALR.quickPostJump, false);
		}

		// Replace post button
		if (gSALR.service.getPreference("useQuickQuote") && !flags.inGasChamber)
		{
			var postbutton = gSALR.service.selectSingleNode(doc, doc, "//A[contains(@href,'action=newthread')]");
			if (postbutton)
			{
				gSALR.service.turnIntoQuickButton(doc, postbutton, forumid).addEventListener("click", function(event){gSALR.quickButtonClicked(event, forumid, null)}, true);
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
				if (!gSALR.service.isMod(userid) && !gSALR.service.isAdmin(userid))
				{
					gSALR.service.addMod(userid, username);
				}
			}
		}

		// Advanced thread filtering interface
		var prefAdvancedThreadFiltering = gSALR.service.getPreference("advancedThreadFiltering");
		if (prefAdvancedThreadFiltering && !flags.inDump && !flags.inArchives)
		{
			gSALR.rebuildFilterBox(doc);
		}

		if (!flags.inDump)
		{
			// Capture and store the post icon # -> post icon filename relationship
			var filterDiv = doc.getElementById("filter");
			var tagsDiv = gSALR.service.selectSingleNode(doc, filterDiv, "div[contains(@class, 'thread_tags')]");
			var iconNumber, iconFilename;
			var postIcons = gSALR.service.selectNodes(doc, tagsDiv, "A[contains(@href,'posticon=')]");
			var divIcon, separator, divClone, afIgnoredIcons, anyLeft, allIgnored, noneIgnored, searchString;
			var atLeastOneIgnored = false;
			var prefIgnoredPostIcons = gSALR.service.getPreference("ignoredPostIcons");
			var prefIgnoredKeywords = gSALR.service.getPreference("ignoredKeywords");

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
							gSALR.service.toggleVisibility(divIcon,true);
							atLeastOneIgnored = true;
						}
						else
						{
							gSALR.service.toggleVisibility(divClone,true);
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
				var anyLeft = gSALR.service.selectSingleNode(doc, tagsDiv, "DIV[contains(@style,'visibility: visible; display: inline;')]");
				if (!anyLeft && allIgnored.style.visibility == "hidden")
				{
					gSALR.service.toggleVisibility(allIgnored,true);
				}
				if (atLeastOneIgnored && noneIgnored.style.visibility == "visible")
				{
					gSALR.service.toggleVisibility(noneIgnored,true);
				}
			}
		}

		gSALR.handleThreadList(doc, forumid, flags);

		if (ourTransaction)
		{
			// Finish off the transaction
			gSALR.service.database.commitTransaction();
		}
	},

	// Do anything needed to the subscribed threads list
	handleSubscriptions: function(doc)
	{
		var cpusernav = gSALR.service.selectSingleNode(doc, doc, "//ul[contains(@id,'usercpnav')]");
		if (!cpusernav) {
			// Don't see the control panel menu so stop
			return;
		}

		let oldUsername = gSALR.service.getPreference("username");
		if (oldUsername == '' || oldUsername == 'Not%20cookied%3F')
		{
			var username = gSALR.service.selectSingleNode(doc,doc,"//div[contains(@class, 'breadcrumbs')]/b");
			if (username)
			{
				username = escape(username.textContent.substr(52));
				if (username != 'Not%20cookied%3F')
					gSALR.service.setPreference("username", username);
			}
		}

		gSALR.handleThreadList(doc, null, { "inUserCP" : true });
	},

	handleIndex: function(doc)
	{
		let oldUsername = gSALR.service.getPreference("username");
		if (oldUsername == '' || oldUsername == 'Not%20cookied%3F')
		{
			var username = gSALR.service.selectSingleNode(doc,doc,"//div[contains(@class, 'mainbodytextsmall')]//b");
			username = escape(username.textContent);
			if (username != 'Not%20cookied%3F')
				gSALR.service.setPreference("username", username);
		}
	},

	//handle highlighting of user cp/forum listings
	handleThreadList: function(doc, forumid, flags)
	{
		//get preferences once
		var dontHighlightThreads = gSALR.service.getPreference("dontHighlightThreads");
		var disableNewReCount = gSALR.service.getPreference("disableNewReCount");
		var newPostCountUseOneLine = gSALR.service.getPreference("newPostCountUseOneLine");
		var disableGradients = gSALR.service.getPreference("disableGradients");
		var showUnvisitIcon = gSALR.service.getPreference("showUnvisitIcon");
		var swapIconOrder = gSALR.service.getPreference("swapIconOrder");
		var showGoToLastIcon = gSALR.service.getPreference("showGoToLastIcon");
		var alwaysShowGoToLastIcon = gSALR.service.getPreference("alwaysShowGoToLastIcon");
		var readWithNewLight = gSALR.service.getPreference("readWithNewLight");
		var readWithNewDark = gSALR.service.getPreference("readWithNewDark");
		var readLight = gSALR.service.getPreference("readLight");
		var readDark = gSALR.service.getPreference("readDark");
		var postedInThreadRe = gSALR.service.getPreference("postedInThreadRe");
		var modColor = gSALR.service.getPreference("modColor");
		var modBackground = gSALR.service.getPreference("modBackground");
		var adminColor = gSALR.service.getPreference("adminColor");
		var adminBackground = gSALR.service.getPreference("adminBackground");
		var highlightUsernames = gSALR.service.getPreference("highlightUsernames");
		var dontBoldNames = gSALR.service.getPreference("dontBoldNames");
		var showSALRIcons = gSALR.service.getPreference("showSALRIcons");
		var showTWNP = gSALR.service.getPreference('showThreadsWithNewPostsFirst');
		var showTWNPCP = gSALR.service.getPreference('showThreadsWithNewPostsFirstCP');
		var showTWNPCPS = gSALR.service.getPreference('showThreadsWithNewPostsFirstCPStickies');
		var postsPerPage = gSALR.service.getPreference('postsPerPage');
		var advancedThreadFiltering = gSALR.service.getPreference("advancedThreadFiltering");
		var ignoredPostIcons = gSALR.service.getPreference("ignoredPostIcons");
		var ignoredKeywords = gSALR.service.getPreference("ignoredKeywords");
		var superIgnoreUsers = gSALR.service.getPreference("superIgnore");

		// This should eventually be redone and moved to the flags section.
		if (typeof(flags.inUserCP) === undefined)
			flags.inUserCP = false;

		// We'll need lots of variables for this
		var threadIconBox, threadTitleBox, threadTitleLink, threadAuthorBox, threadRepliesBox, threadLastPostBox;
		var threadTitle, threadId, threadOPId, threadRe;
		var threadLRCount, unvistIcon, lpIcon, lastPostName;
		var userPosterNote, lastLink, searchString;
		var starredthreads = gSALR.service.starList, ignoredthreads = gSALR.service.ignoreList;
		var table = document.getElementById('forum');

		// We need to reset this every time the page is fully loaded
		if (advancedThreadFiltering)
			gSALR.service.setPreference("filteredThreadCount",0);

		// Here be where we work on the thread rows
		var threadlist = gSALR.service.selectNodes(doc, doc, "//table[@id='forum']/tbody/tr");

		// These are insertion points for thread sorting
		if ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP))
		{
			var anchorTop = gSALR.service.selectSingleNode(doc, doc, "//table[@id='forum']/tbody");

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
			threadTitleBox = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class,'title')]");
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

			threadTitleLink = gSALR.service.selectSingleNode(doc, threadTitleBox, "DIV/DIV/A[contains(@class, 'thread_title')]");
			if (!threadTitleLink)
			{
				threadTitleLink = gSALR.service.selectSingleNode(doc, threadTitleBox, "A[contains(@class, 'thread_title')]");
			}
			if (!threadTitleLink) continue;
			threadId = parseInt(threadTitleLink.href.match(/threadid=(\d+)/i)[1], 10);
			threadTitle = threadTitleLink.innerHTML;
			if (gSALR.service.isThreadIgnored(threadId))
			{
				// If thread is ignored might as well remove it and stop now
				thread.parentNode.removeChild(thread);
				// Update the title just incase we don't know what it is
				gSALR.service.setThreadTitle(threadId, threadTitle);
				continue;
			}

			threadAuthorBox = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class, 'author')]");
			threadRepliesBox = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class, 'replies')]");
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
				if (superIgnoreUsers && gSALR.service.isUserIgnored(threadOPId))
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
						gSALR.service.toggleVisibility(thread,false);
						gSALR.filteredThreadCount(doc,1);
						threadBeGone = true;
					}
				}
			}

			lastLink = gSALR.service.selectSingleNode(doc, threadTitleBox, "DIV/DIV/DIV/A[./text() = 'Last']");
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
			threadIconBox = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]");
			if (flags && forumid && advancedThreadFiltering && !flags.inArchives && !flags.inDump && !flags.inUserCP && threadIconBox.firstChild.firstChild.src.search(/posticons\/(.*)/i) > -1)
			{
				var iconnum = threadIconBox.firstChild.firstChild.src.match(/#(\d+)$/)[1];
				var iconSearchString = "(^|\\s)" + iconnum + ",";
				iconSearchString = new RegExp(iconSearchString , "gi");
				if (ignoredPostIcons.search(iconSearchString) > -1 && thread.style.visibility != "hidden")
				{
					gSALR.service.toggleVisibility(thread,false);
					gSALR.filteredThreadCount(doc,1);
				}
			}

			var divLastSeen = gSALR.service.selectSingleNode(doc, threadTitleBox, "DIV/DIV[contains(@class, 'lastseen')]");
			if (divLastSeen)
			{
				// Thread is read so let's work our magic
				var iconMarkUnseen = gSALR.service.selectSingleNode(doc, divLastSeen, "a[contains(@class, 'x')]");
				var iconJumpLastRead = gSALR.service.selectSingleNode(doc, divLastSeen, "a[contains(@class, 'count')]");

				// For thread sorting later
				if (iconJumpLastRead && ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP)))
				{
					thread.className += ' moveup';
				}

				if (gSALR.service.didIPostHere(threadId))
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
					threadRe = gSALR.service.selectSingleNode(doc, iconJumpLastRead, "B");
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
				var iAmASticky = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class, 'sticky')]");
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
			}

			if (gSALR.service.isThreadStarred(threadId))
			{
				threadTitleBox.className += ' starred';
			}

			if (highlightUsernames)
			{
				var userColoring, threadLastPostBox, lastPostId;
				var posterColor, posterBG;

				// First color the Author column
				if (threadOPId)
				{
					posterColor = false;
					posterBG = false;

					if (gSALR.service.isMod(threadOPId))
					{
						posterColor = modColor;
						posterBG =  modBackground;
					}

					if (gSALR.service.isAdmin(threadOPId))
					{
						posterColor = adminColor;
						posterBG =  adminBackground;
					}

					userColoring = gSALR.service.isUserIdColored(threadOPId);
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
				threadLastPostBox = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class, 'lastpost')]");
				if (!threadLastPostBox)
				{
					// Either the page didn't finish loading or SA didn't send the full page.
					return;
				}
				let lastPostLink = threadLastPostBox.getElementsByTagName('a');
				if (lastPostLink[0])
				{
					lastPostId = gSALR.service.getUserId(lastPostLink[0].innerHTML);
				}

				if (lastPostId)
				{
					posterColor = false;
					posterBG = false;

					if (gSALR.service.isMod(lastPostId))
					{
						posterColor = modColor;
						posterBG =  modBackground;
					}

					if (gSALR.service.isAdmin(lastPostId))
					{
						posterColor = adminColor;
						posterBG =  adminBackground;
					}

					userColoring = gSALR.service.isUserIdColored(lastPostId);
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
		}
	},

	handleShowThread: function(doc)
	{
		var failed, i, e; // Little variables that'll get reused
		if (doc.getElementById('thread') == null)
		{
			// If there is no thread div then abort since something's not right
			return;
		}

		try
		{
			var forumid = gSALR.service.getForumID(doc);
			var threadid = gSALR.service.getThreadID(doc);

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
		var inFYAD = gSALR.service.inFYAD(forumid);
		var inDump = gSALR.service.inDump(forumid);
		var inAskTell = gSALR.service.inAskTell(forumid);
		var inGasChamber = gSALR.service.inGasChamber(forumid);
		// Obsolete:
		var inArchives = (doc.location.host.search(/^archives\.somethingawful\.com$/i) > -1);
		var singlePost = (doc.location.search.search(/action=showpost/i) > -1);
		var username = unescape(gSALR.service.getPreference('username'));

		if (inFYAD && !gSALR.service.getPreference("enableFYAD"))
		{
			// We're in FYAD and FYAD support has been turned off
			return;
		}

		// Add our ShowThread CSS
		gSALR.service.insertDynamicCSS(doc, gSALR.service.generateDynamicShowThreadCSS(forumid));

		doc.body.className += " salastread_forum" + forumid;
		// used by the context menu to allow options for this thread
		doc.body.className += " salastread_thread_" + threadid;

		// Grab the thread title
		/* Note: it will only actually happen if the thread's already in the cache.
			Perhaps we can remove this call?
		*/
		gSALR.service.setThreadTitle(threadid, gSALR.getPageTitle(doc));

		// Grab the go to dropdown
		if (!gSALR.service.gotForumList && !singlePost)
		{
			grabForumList(doc);
			gSALR.service.gotForumList = true;
		}

		var pageList = gSALR.service.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
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
				var curPage = gSALR.service.selectSingleNode(doc, pageList, "//OPTION[@selected='selected']");
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
		if (gSALR.service.getPreference("enablePageNavigator") && !singlePost)
		{
			gSALR.service.addPagination(doc);
		}
		if (gSALR.service.getPreference("gestureEnable"))
		{
			doc.body.addEventListener('mousedown', gSALR.pageMouseDown, false);
			doc.body.addEventListener('mouseup', gSALR.pageMouseUp, false);
		}

		// Grab threads/posts per page
		var postsPerPageOld = gSALR.service.getPreference("postsPerPage");
		var perpage = gSALR.service.selectSingleNode(doc, doc, "//DIV[contains(@class,'pages')]//A[contains(@href,'perpage=')]");
		if (perpage)
		{
			perpage = perpage.href.match(/perpage=(\d+)/i)[1];
			if (postsPerPageOld != perpage)
			{
				gSALR.service.setPreference("postsPerPage", perpage);
			}
		}
		else
		{
			perpage = 0;
		}

		// Check if the thread is closed
		if (gSALR.service.selectSingleNode(doc, doc, "//A[contains(@href,'action=newreply&threadid')]//IMG[contains(@src,'closed')]") == null)
		{
			var threadClosed = false;
		}
		else
		{
			var threadClosed = true;
		}

		// Replace post button
		if (gSALR.service.getPreference("useQuickQuote") && !inGasChamber)
		{
			var postbuttons = gSALR.service.selectNodes(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newthread')]");
			if (postbuttons.length > 0)
			{
				for (i in postbuttons)
				{
					gSALR.service.turnIntoQuickButton(doc, postbuttons[i], forumid).addEventListener("click", function(event){gSALR.quickButtonClicked(event, forumid, threadid)}, true);
				}
			}
			if (!threadClosed)
			{
				var replybuttons = gSALR.service.selectNodes(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newreply&threadid')]");
				if (replybuttons.length > 0)
				{
					for (i in replybuttons)
					{
						gSALR.service.turnIntoQuickButton(doc, replybuttons[i], forumid).addEventListener("click", function(event){gSALR.quickButtonClicked(event, forumid, threadid)}, true);
					}
				}
			}
		}

		if (gSALR.service.getPreference('quickPostJump'))
		{
			doc.addEventListener('keypress', gSALR.quickPostJump, false);
		}

		var searchThis = gSALR.service.selectSingleNode(doc, doc, "//FORM[contains(@class,'threadsearch')]");
		var placeHere = gSALR.service.selectSingleNode(doc, doc, "//img[contains(@class,'thread_bookmark')]");
		if (searchThis && placeHere && placeHere.parentNode && placeHere.parentNode.nodeName.toLowerCase() === 'li')
		{
			placeHere = placeHere.parentNode;
			if (gSALR.service.getPreference("replyCountLinkinThreads"))
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
			if (!gSALR.service.getPreference("hideThreadSearchBox") && searchThis.firstChild.nodeName == '#text')
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
					if (newSearchText.__unfocused == true)
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
		var postlist = gSALR.service.selectNodes(doc, doc, "//table[contains(@id,'post')]");

		var curPostId, colorDark = true, colorOfPost, postIdLink, resetLink, profileLink, posterId, postbody, postRow, f, linksUL, storeUserLink;
		var posterColor, posterBG, userNameBox, posterNote, posterImg, posterName, slink, quotebutton, editbutton, reportbutton;
		var userPosterColor, userPosterBG, userPosterNote, userQuote;

		// Group calls to the prefs up here so we aren't repeating them, should help speed things up a bit
		var useQuickQuote = gSALR.service.getPreference('useQuickQuote');
		var insertPostLastMarkLink = gSALR.service.getPreference("insertPostLastMarkLink");
		var insertPostTargetLink = gSALR.service.getPreference("insertPostTargetLink");
		var highlightUsernames = gSALR.service.getPreference("highlightUsernames");

		//standard user colors
		var modColor = gSALR.service.getPreference("modColor");
		var modBackground = gSALR.service.getPreference("modBackground");
		var modSubText = gSALR.service.getPreference("modSubText");
		var adminColor = gSALR.service.getPreference("adminColor");
		var adminBackground = gSALR.service.getPreference("adminBackground");
		var adminSubText = gSALR.service.getPreference("adminSubText");
		var opColor = gSALR.service.getPreference("opColor");
		var opBackground = gSALR.service.getPreference("opBackground");
		var opSubText = gSALR.service.getPreference("opSubText");
		var superIgnoreUsers = gSALR.service.getPreference("superIgnore");
		var cancerTreatment = gSALR.service.getPreference("cancerTreatment");

		var threadMarkedPostedIn = false;

		doc.postlinks = new Array;

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
					profileLink = gSALR.service.selectSingleNode(doc, post, "tbody//td[contains(@class,'postdate')]//a[contains(@href,'userid=')]");
					if (profileLink)
					{
						posterId = profileLink.href.match(/userid=(\d+)/i)[1];
						if (posterId && gSALR.service.isUserIgnored(posterId))
							post.className += ' salrPostIgnored';
					}
				}
				// User is ignored by the system so skip doing anything else
				continue;
			}

			if (post.id == "post") // handle adbot
				continue;
			curPostId = post.id.match(/post(\d+)/)[1];
			profileLink = gSALR.service.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//ul[contains(@class,'profilelinks')]//a[contains(@href,'userid=')]");
			if (!profileLink)
				continue;
			posterId = profileLink.href.match(/userid=(\d+)/i)[1];
			if (superIgnoreUsers && gSALR.service.isUserIgnored(posterId))
			{
				// They're ignored but not by the system
				post.className += ' salrPostIgnored';
			}

			if (inFYAD && !inArchives)
			{
				userNameBox = gSALR.service.selectSingleNode(doc, post, "TBODY//DIV[contains(@class,'title')]//following-sibling::B");
			}
			else
			{
				userNameBox = gSALR.service.selectSingleNode(doc, post, "TBODY//TR/TD//DL//DT[contains(@class,'author')]");
			}

			//workaround for archives + fyad-type forum, since we can't detect we're in an archived thread at the moment
			if (userNameBox == null)
			{
				userNameBox = gSALR.service.selectSingleNode(doc, post, "TBODY//TR/TD//DL//DT[contains(@class,'author')]");
			}

			// Standard template
			let titleBox = gSALR.service.selectSingleNode(doc, post, "tbody//dl[contains(@class,'userinfo')]//dd[contains(@class,'title')]");
			// If that doesn't work, try FYAD template
			if (titleBox == null)
				titleBox = gSALR.service.selectSingleNode(doc, post, "tbody//td[contains(@class,'postbody')]//div[contains(@class,'title')]");

			if (titleBox)
			{
				if (gSALR.service.isAvatarHidden(posterId))
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
					gSALR.service.addAdmin(posterId, posterName);
				}
				else if (posterImg == 'Moderator')
				{
					gSALR.service.addMod(posterId, posterName);
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
				if (threadMarkedPostedIn == false)
				{
					gSALR.service.iPostedHere(threadid);
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
			if (gSALR.service.isMod(posterId))
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
					gSALR.service.removeMod(posterId);
				}
			}
			if (gSALR.service.isAdmin(posterId))
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
					gSALR.service.removeAdmin(posterId);
				}
			}
			var dbUser = gSALR.service.isUserIdColored(posterId);
			if (dbUser)
			{
				if (!dbUser.username || dbUser.username != posterName)
				{
					gSALR.service.setUserName(posterId, posterName);
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
				gSALR.service.colorPost(doc, posterBG, posterId);
			}

			// Check for quotes that need to be colored or superIgnored
			if (gSALR.service.getPreference('highlightQuotes') || superIgnoreUsers)
			{
				var userQuoted;
				var anyQuotes = gSALR.service.selectNodes(doc, post, "TBODY//TR/TD//DIV[contains(@class,'bbc-block')]");
				for (let quote in anyQuotes)
				{
					userQuoted = anyQuotes[quote].textContent.match(/(.*) posted:/);
					if (userQuoted)
					{
						userQuoted = userQuoted[1];
						if (userQuoted != username) // self-quotes handled by forum JS now
						{
							let userQuotedDetails = gSALR.service.isUsernameColored(userQuoted);
							let userQuotedId = gSALR.service.getUserId(userQuoted);
							if (superIgnoreUsers && gSALR.service.isUserIgnored(userQuotedId))
							{
								// They're quoting someone ignored, lets remove the entire post
								post.className += ' salrPostIgnored';
							}
							if (userQuotedDetails)
							{
								anyQuotes[quote].className += ' salrQuoteOf' + userQuotedDetails.userid;
								gSALR.service.colorQuote(doc, userQuotedDetails.background, userQuotedDetails.userid);
							}
						}
					}
				}
			}

			userPosterNote = gSALR.service.getPosterNotes(posterId);
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

			postIdLink = gSALR.service.selectSingleNode(doc, post, "tbody//td[contains(@class,'postdate')]//a[contains(@href,'#post')]");
			if (!postIdLink)
			{
				postIdLink = gSALR.service.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//a[contains(@href,'#post')]");
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
				editbutton = gSALR.service.selectSingleNode(doc, post, "tbody//ul[contains(@class,'postbuttons')]//li//a[contains(@href,'action=editpost')]");
			}

			if (useQuickQuote && !threadClosed)
			{
				quotebutton = gSALR.service.selectSingleNode(doc, post, "tbody//ul[contains(@class,'postbuttons')]//li//a[contains(@href,'action=newreply')]");
				if (quotebutton)
				{
					gSALR.service.turnIntoQuickButton(doc, quotebutton, forumid).addEventListener("click", function(event){gSALR.quickButtonClicked(event, forumid, threadid)}, true);
				}
				if (editbutton)
				{
					gSALR.service.turnIntoQuickButton(doc, editbutton, forumid).addEventListener("click", function(event){gSALR.quickButtonClicked(event, forumid, threadid)}, true);
				}
			}

			var userLinks = profileLink.parentNode.parentNode;

			// Add user coloring/note links
			if (highlightUsernames)
			{
				var li = doc.createElement("li");
				var a = doc.createElement("a");
				a.id = curPostId + "_" + posterId;
				a.href ="#" + posterName;
				a.innerHTML = "Add Coloring/Note";
				a.addEventListener("click", gSALR.addHighlightedUser, true);
				li.appendChild(a);
				userLinks.appendChild(doc.createTextNode(" "));
				userLinks.appendChild(li);
			}

			// Add a link to hide/unhide the user's avatar
			var avLink = doc.createElement("li");
			var avAnch = doc.createElement("a");
			avAnch.href = "#ToggleAvatar#" + posterId + "#" + posterName;
			avAnch.title = "Toggle displaying this poster's avatar.";
			if (gSALR.service.isAvatarHidden(posterId))
				avAnch.innerHTML = "Show Avatar";
			else
				avAnch.innerHTML = "Hide Avatar";

			avAnch.addEventListener("click", gSALR.clickToggleAvatar, false);
			avLink.appendChild(avAnch);
			userLinks.appendChild(doc.createTextNode(" "));
			userLinks.appendChild(avLink);

			// Add a space for the Rap Sheet link added afterwards by forum JS:
			userLinks.appendChild(doc.createTextNode(" "));

			postbody = gSALR.service.selectSingleNode(doc, post, "TBODY//TD[contains(@class,'postbody')]");

			if (cancerTreatment)
			{
				var cancerDiv = gSALR.service.selectSingleNode(doc, postbody, "DIV[contains(@class,'cancerous')]");
				if (cancerDiv)
				{
					//Apply our alternate style:
					if (cancerTreatment == 1)
					{
						cancerDiv.style.opacity = "1";
						postbody.style.backgroundImage = 'url("chrome://salastread/skin/biohazard.png")';
						postbody.style.backgroundRepeat = "repeat";
					}
					//Hide entirely:
					else if (cancerTreatment == 2)
						post.style.display = "none";
				}
			}
			gSALR.service.convertSpecialLinks(postbody, doc);
			gSALR.service.processImages(postbody, doc);
		}

		doc.__salastread_loading = true;
		window.gBrowser.addEventListener("load", gSALR.pageFinishedLoading, true);
	},

	handleEditPost: function(doc)
	{
		var submitbtn = gSALR.service.selectNodes(doc, doc.body, "//INPUT[@type='submit'][@value='Save Changes']")[0];
		var tarea = gSALR.service.selectNodes(doc, doc.body, "//TEXTAREA[@name='message']")[0];
		if (submitbtn && tarea) {
			submitbtn.addEventListener("click", function() { parsePLTagsInEdit(tarea); }, true);
			submitbtn.style.backgroundColor = gSALR.service.getPreference('postedInThreadRe');
		}
	},

	handleNewReply: function(doc)
	{
		var threadlink = gSALR.service.selectSingleNode(doc, doc.body, "DIV[contains(@id, 'container')]//div[@class='breadcrumbs']//A[contains(@href,'showthread.php')][contains(@href,'threadid=')]");
		if (threadlink)
		{
			var tlmatch = threadlink.href.match( /threadid=(\d+)/ );
			if (tlmatch)
			{
				var threadid = tlmatch[1];
				if (needRegReplyFill)
				{
					var msgEl = gSALR.service.selectSingleNode(doc, doc.body, "//TEXTAREA[@name='message']");
					if (msgEl)
					{
						msgEl.value = salastread_savedQuickReply;
					}
					needRegReplyFill = false;
				}
				var postbtn = gSALR.service.selectSingleNode(doc, doc.body, "//FORM[@name='vbform']//INPUT[@name='submit']");
				if (postbtn)
				{
					postbtn.addEventListener("click", function() { gSALR.service.iPostedHere(threadid); }, true);
					postbtn.style.backgroundColor = gSALR.service.getPreference('postedInThreadRe');
				}
			}
		}
		else
		{
			if (salastread_savedQuickReply!="")
			{
				// TODO: Check if the stuff immediately below is broken.
				var forgeCheck = gSALR.service.selectSingleNode(doc, doc.body, "TABLE/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[2]/TD[1]/FONT[contains(text(),'have been forged')]");
				if (forgeCheck)
				{
					gSALR.service.__cachedFormKey = "";
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
					regReplyLink.onclick = function() { needRegReplyFill = true; };
					regReplyLink.href = "http://forums.somethingawful.com/newreply.php?s=&action=newreply&threadid=" +
					salastread_savedQuickReplyThreadId;
					regReplyLink.innerHTML = "here.";
					reqMsg.appendChild(regReplyLink);
					forgeCheck.parentNode.insertBefore(reqMsg, forgeCheck);
				}
				else
				{
					salastread_savedQuickReply = "";
					salastread_savedQuickReplyThreadId = "";
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
				gSALR.service.setPreference("username", '');
				gSALR.service.setPreference("userId", 0);
			}
		}
		else
		{
			// There is no action specified, we may be logging in
			var div = doc.getElementById("main_wide");
			if (div)
			{
				var loginMsg = gSALR.service.selectSingleNode(doc, div, "DIV[contains(./text(),'GLUE')]");
				if (loginMsg)
				{
					var name = loginMsg.firstChild.textContent.match(/GLUE GLUEEEEE GLUUUUUUEEE, (.*)!  GLUUUEEE/);
					// Note that there are 2 spaces after the !, the extra space doesn't show up on the page but it's in the raw HTML
					if (name)
					{
						name = name[1];
						gSALR.service.setPreference("username", name);
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
				var posterTable = gSALR.service.selectSingleNode(doc,doc,"//DIV[@id='main_stretch']/DIV/TABLE/TBODY");
				var threadId = parseInt(doc.location.search.match(/threadid=(\d+)/i)[1], 10);
				if (posterTable && threadId)
				{
					var highlightUsernames = gSALR.service.getPreference("highlightUsernames");
					var sortReplyList = gSALR.service.getPreference("sortReplyList");

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
					var rows = gSALR.service.selectNodes(doc, posterTable, "TR");
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

							if (gSALR.service.isMod(posterId))
							{
								userPriority = 1;
							}
							if (gSALR.service.isAdmin(posterId))
							{
								userPriority = 2;
							}

							// Check for user-defined name coloring and/or mod/admin coloring
							if (highlightUsernames)
							{
								var userColoring = gSALR.service.isUserIdColored(posterId);
								if (userColoring)
								{
									if (userColoring.color && userColoring.color != "0")
									{
										row.childNodes[1].firstChild.style.color = userColoring.color;
										if (!gSALR.service.getPreference("dontBoldNames"))
										{
											row.childNodes[1].firstChild.style.fontWeight = "bold";
										}
										userPriority = 3;
									}
									if ((userColoring.background && userColoring.background != "0") || gSALR.service.getPosterNotes(posterId))
										userPriority = 3;
								}
								else if (userPriority == 1)
								{
									row.childNodes[1].firstChild.style.color = gSALR.service.getPreference("modColor");
									if (!gSALR.service.getPreference("dontBoldNames"))
									{
										row.childNodes[1].firstChild.style.fontWeight = "bold";
									}
								}
								else if (userPriority == 2)
								{
									row.childNodes[1].firstChild.style.color = gSALR.service.getPreference("adminColor");
									if (!gSALR.service.getPreference("dontBoldNames"))
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
						var closeLink = gSALR.service.selectSingleNode(doc, doc, "//A[contains(./text(),'show thread')]");
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
			//grabForumList(doc);
		}
	},

	handleProfileView: function(doc)
	{
		var postSearchLink = gSALR.service.selectSingleNode(doc, doc, "//A[contains(./text(),'find posts by user')]");
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
		if (gSALR.service.getPreference("gestureEnable"))
		{
			var pageList = gSALR.service.selectNodes(doc, doc, "//DIV[contains(@class,'pager')]");
			if (pageList)
			{
				if (pageList.length >= 1)
					pageList = pageList[pageList.length-1];
				else
					return;
				var numPages = pageList.innerHTML.match(/\((\d+)\)/);
				if (!numPages)
					return;
				var curPage = gSALR.service.selectSingleNode(doc, doc, "//a[contains(@class,'current')]");
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
		var usercpnode = gSALR.service.selectSingleNode(doc, doc.body, "//UL[@id='navigation']/LI/A[contains(@href,'usercp.php')]");
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

	runConfig: function(page, args)
	{
		// check a browser pref so the dialog has the proper constructor arguments
		var pref = Components.classes["@mozilla.org/preferences-service;1"]
					.getService(Components.interfaces.nsIPrefBranch);

		var instantApply = pref.getBoolPref("browser.preferences.instantApply");
		var features = "chrome,titlebar,toolbar,centerscreen,resizable" + (instantApply ? ",dialog=no" : ",modal");

		openDialog("chrome://salastread/content/pref.xul", "Preferences", features, page, { "args" : args });
	},

	// add a user to the highlighting/note section by clicking on a post link
	addHighlightedUser: function(e)
	{
		e.stopPropagation();
		e.preventDefault();

		var link = e.originalTarget;
		var userid = link.id.split("_")[1];
		var username = link.href.split("#")[1];

		gSALR.runConfig('users', { "action" : "addUser", "userid" : userid, "username" : username });
	},

	timerTick: function()
	{
		if (gSALR.timerPageCount > 0 && gSALR.service)
		{
			gSALR.service.PingTimer();
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

	insertCSS: function(doc, url)
	{
		var stylesheet = doc.createElement("link");
		stylesheet.rel = "stylesheet";
		stylesheet.type = "text/css";
		stylesheet.href = url;
		doc.getElementsByTagName('head')[0].appendChild(stylesheet);
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
			var maxPosts = gSALR.service.getPreference('postsPerPage');
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
				case gSALR.service.getPreference('kb.reanchor'):
				case gSALR.service.getPreference('kb.reanchorAlt'):
					doc.getElementById('pti' + postId).parentNode.parentNode.className += ' focused';
					post = doc.getElementById('pti' + postId);
					rescroll = true;
					break;
				case gSALR.service.getPreference('kb.nextPage'):
				case gSALR.service.getPreference('kb.nextPageAlt'):
					// Goto next page
					if (doc.__SALR_curPage < doc.__SALR_maxPage)
					{
						doc.location = gSALR.service.editPageNumIntoURI(doc, "pagenumber=" + (doc.__SALR_curPage + 1));
					}
					break;
				case gSALR.service.getPreference('kb.nextPost'):
				case gSALR.service.getPreference('kb.nextPostAlt'):
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
				case gSALR.service.getPreference('kb.prevPage'):
				case gSALR.service.getPreference('kb.prevPageAlt'):
					// Goto previous page
					if (doc.__SALR_curPage > 1)
					{
						doc.location = gSALR.service.editPageNumIntoURI(doc, "pagenumber=" + (doc.__SALR_curPage - 1));
					}
					break;
				case gSALR.service.getPreference('kb.prevPost'):
				case gSALR.service.getPreference('kb.prevPostAlt'):
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
				case gSALR.service.getPreference('kb.quickEdit'):
					// Activate Quick Edit Post
					var fakeEvent = {};
					var forumid = gSALR.service.getForumID(doc);
					var threadid = gSALR.service.getThreadID(doc);
					fakeEvent.originalTarget = gSALR.service.selectSingleNode(doc, doc.getElementById('pti' + postId).parentNode, 'TR/TD/UL/LI/IMG[@title="Quick Edit"]');
					gSALR.quickButtonClicked(fakeEvent, forumid, threadid);
					break;
				case gSALR.service.getPreference('kb.quickReply'):
					// Activate Quick Reply to Thread
					var fakeEvent = {};
					var forumid = gSALR.service.getForumID(doc);
					var threadid = gSALR.service.getThreadID(doc);
					fakeEvent.originalTarget = gSALR.service.selectSingleNode(doc, doc, '//UL[contains(@class,"postbuttons")]//IMG[@title="Quick Reply"]');
					gSALR.quickButtonClicked(fakeEvent, forumid, threadid);
					break;
				case gSALR.service.getPreference('kb.quickQuote'):
					// Activate Quick Quote Post
					var fakeEvent = {};
					var forumid = gSALR.service.getForumID(doc);
					var threadid = gSALR.service.getThreadID(doc);
					fakeEvent.originalTarget = gSALR.service.selectSingleNode(doc, doc.getElementById('pti' + postId).parentNode, 'TR/TD/UL/LI/IMG[@title="Quick Quote"]');
					gSALR.quickButtonClicked(fakeEvent, forumid, threadid);
					break;
			}
			if (rescroll)
			{
				post.scrollIntoView(true);
				doc.__SALR_curFocus = postId;
			}
		} catch(e) {dump('error:'+e);}
	},

	directionalNavigate: function(doc, dir)
	{
		var urlbase = doc.location.href.match(/.*\.somethingawful\.com/);
		var curPage = doc.__SALR_curPage;
		var perpage = "&perpage=" + gSALR.service.getPreference("postsPerPage");
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
						}

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
		if (event.button == gSALR.service.getPreference('gestureButton') && gSALR.service.getPreference('gestureEnable'))
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

		if(gSALR.service.getPreference('contextMenuOnBottom') )
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
				if (doc.__salastread_processed == true)
				{
					if (gSALR.service.getPreference("enableContextMenu"))
						gSALR.contextVis();
				}
			}
			catch (e) {}
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
					document.getElementById("salastread-context-starthread").setAttribute('label',(gSALR.service.isThreadStarred(threadid) ? 'Unstar' : 'Star') + ' This Thread (' + threadid + ')');
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

			var starStatus = gSALR.service.isThreadStarred(threadid);
			gSALR.service.toggleThreadStar(threadid);

			if (starStatus == false) // we just starred it
				gSALR.service.setThreadTitle(threadid, threadTitle);

			if (target.ownerDocument.location.href.search(/showthread.php/i) == -1)
			{
				// Don't refresh the page. Why would we refresh the page?
				//target.ownerDocument.location = target.ownerDocument.location;
			}
			else
			{
				var startext = starStatus ? "unstarred" : "starred";
				alert("This thread is now " + startext + ".");
			}
		}
	},

	ignoreThread: function()
	{
		var threadid = document.getElementById("salastread-context-ignorethread").data;
		var target = document.getElementById("salastread-context-ignorethread").target;
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
			if (confirm("Are you sure you want to ignore thread #"+threadid+"?"))
			{
				// Actually use ignoreStatus
				var ignoreStatus = gSALR.service.isThreadIgnored(threadid);
				if (ignoreStatus == false)
				{
					gSALR.service.toggleThreadIgnore(threadid);
					gSALR.service.setThreadTitle(threadid, threadTitle);
					// todo: detect by if there is a "forum" node, to cover bookmark page and control panel
					if (target.ownerDocument.location.href.search(/showthread.php/i) == -1)
					{
						target.parentNode.removeChild(target);
					}
				}
			}
		}
	},

	unreadThread: function()
	{
		var threadid = document.getElementById("salastread-context-unreadthread").data;
		var target = document.getElementById("salastread-context-unreadthread").target;
		if (threadid)
		{
			var xhr = new XMLHttpRequest();
			var xhrparams = "json=1&action=resetseen&threadid="+threadid;
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
					if (xhr.responseText.match(/threadid/))
						alert("Thread #" + threadid + " marked as unread.");
					else
						alert("Something went wrong! Please try again.");
				}
			}
			xhr.send(xhrparams);
		}
	},

	// Event catcher for clicking on the Mark Unseen box
	clickMarkUnseen: function()
	{
		var doc = this.ownerDocument;
		var thread = this.parentNode.parentNode.parentNode.parentNode;
		if (thread)
		{
			var threadRepliesBox = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class, 'replies')]");
			if (threadRepliesBox)
			{
				// Remove the new replies count
				if (!gSALR.service.getPreference("disableNewReCount") && thread.className.search(/newposts/i) > -1)
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
	clickToggleAvatar: function()
	{
		var doc = this.ownerDocument;
		var idToToggle = this.href.match(/\#ToggleAvatar\#(\d+)\#(.*)$/)[1];
		var nameToToggle = this.href.match(/\#ToggleAvatar\#(\d+)\#(.*)$/)[2];
		var alreadyHidden = gSALR.service.isAvatarHidden(idToToggle);
		var posts = gSALR.service.selectNodes(doc, doc, "//table[contains(@id,'post')]");
		var post, profileLink, posterId, titleBox, toggleLink;

		for (n in posts)
		{
			post = posts[n];
			profileLink = gSALR.service.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//ul[contains(@class,'profilelinks')]//a[contains(@href,'userid=')]");
			if (!profileLink)
				continue;
			posterId = profileLink.href.match(/userid=(\d+)/i)[1];
			if (posterId == idToToggle)
			{
				// Standard template
				titleBox = gSALR.service.selectSingleNode(doc, post, "tbody//dl[contains(@class,'userinfo')]//dd[contains(@class,'title')]");
				// If that doesn't work, try FYAD template
				if (titleBox == null)
					titleBox = gSALR.service.selectSingleNode(doc, post, "tbody//td[contains(@class,'postbody')]//div[contains(@class,'title')]");

				toggleLink = gSALR.service.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//a[contains(@href,'#ToggleAvatar#')]");
				if (alreadyHidden)
				{
					titleBox.style.display = "block";
					toggleLink.innerHTML = "Hide Avatar";
				}
				else
				{
					titleBox.style.display = "none";
					toggleLink.innerHTML = "Show Avatar";
				}
			}
		}
		gSALR.service.toggleAvatarHidden(idToToggle, nameToToggle);
	},


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Advanced Thread Filtering Functions /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	rebuildFilterBox: function(doc)
	{
		var filterDiv = doc.getElementById("filter");
		var toggleDiv = gSALR.service.selectSingleNode(doc, filterDiv, "div[contains(@class, 'toggle_tags')]");
		var tagsDiv = gSALR.service.selectSingleNode(doc, filterDiv, "div[contains(@class, 'thread_tags')]");
		var afObject, afObject2; // Temp object storage for things that really only get handled once

		if (toggleDiv && tagsDiv)
		{
			var afIgnoredIcons, afIgnoredKeywords;
			var prefIgnoredPostIcons = gSALR.service.getPreference("ignoredPostIcons");
			var prefIgnoredKeywords = gSALR.service.getPreference("ignoredKeywords");

			toggleDiv.innerHTML = '';
			var afObject = doc.createElement("b");
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

			tagsHead = doc.createElement("div");
			tagsDiv.insertBefore(tagsHead,tagsDiv.firstChild);

			// Move the current non-advanced filtered icon to the top, if applicable
			var alreadyFiltering = doc.location.href.match(/posticon=(\d+)/i);
			if (alreadyFiltering && alreadyFiltering[1])
			{
				var filteredIcon = gSALR.service.selectSingleNode(doc, tagsDiv, "A[contains(@href,'posticon=" + parseInt(alreadyFiltering[1]) + "')]");
				afObject2 = gSALR.service.selectSingleNode(doc, tagsDiv, "DIV[contains(@class,'remove_tag')]/A");
				if (filteredIcon && afObject2)
				{
					tagsHead.appendChild(doc.createTextNode("Showing only this icon: ("));
					afObject = filteredIcon.cloneNode(true);
					afObject.firstChild.style.marginRight = '0px';
					afObject.firstChild.style.marginBottom = '-2px';
					afObject.href = afObject2.href;
					afObject.innerHTML += "&nbsp;Reset"
					afObject.style.fontSize = "75%";
					afObject.style.fontWeight = "bold";
					tagsHead.appendChild(afObject);
					tagsHead.appendChild(doc.createTextNode(")"));
					tagsHead.appendChild(doc.createElement("br"));
					tagsHead.appendChild(doc.createElement("br"));
				}
			}
			// Remove the "Remove filter" link since it's showing up all the time
			let removeTagsDiv = gSALR.service.selectSingleNode(doc, tagsDiv, "DIV[contains(@class,'remove_tag')]");
			if (removeTagsDiv)
				removeTagsDiv.parentNode.removeChild(removeTagsDiv);

			// Add a message for when all the icons are ignored and hide it for now
			afObject = doc.createElement("div");
			afObject.id = "alliconsignored";
			afObject.appendChild(doc.createTextNode("You've ignored everything but shit posts, you cretin!"));
			afObject.style.fontWeight = "bold";
			gSALR.service.toggleVisibility(afObject,true);
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
		if (gSALR.service.getPreference("advancedThreadFiltering"))
		{
			var doc = this.ownerDocument;
			var filterDiv = doc.getElementById("filter");
			var tagsDiv = gSALR.service.selectSingleNode(doc, filterDiv, "div[contains(@class, 'thread_tags')]");

			if (tagsDiv)
			{
				var afIgnoredIcons, afShowMe, afHideMe, afIgnoring;
				var iconToIgnore, iconToIgnoreId, iconIgnored;
				var afObject; // Temp object storage for things that really only get handled once
				var prefIgnoredPostIcons = gSALR.service.getPreference("ignoredPostIcons");
				var prefIgnoredKeywords = gSALR.service.getPreference("ignoredKeywords");
				var anyLeft, anyLeftIn, searchString, threadBeGone;
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
				iconIgnored = gSALR.service.selectSingleNode(doc, mirrorIcons, "DIV/A[contains(@href,'posticon=" + iconToIgnoreId + "')]");

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
				gSALR.service.setPreference("ignoredPostIcons",prefIgnoredPostIcons);

				gSALR.service.toggleVisibility(this,true);
				afObject = doc.getElementById(afHideMe);
				if (afObject && afObject.style.visibility != "hidden")
				{
					gSALR.service.toggleVisibility(afObject,true);
				}

				gSALR.service.toggleVisibility(iconIgnored.parentNode,true);
				afObject = doc.getElementById(afShowMe);
				anyLeft = gSALR.service.selectSingleNode(doc, anyLeftIn, "DIV[contains(@style,'visibility: visible; display: inline;')]");
				if (!anyLeft && afObject && afObject.style.visibility == "hidden")
				{
					gSALR.service.toggleVisibility(afObject,true);
				}

				// Cycle through the threads and actively update their visibility
				threadList = gSALR.service.selectNodes(doc, doc, "//table[@id='forum']/tbody/tr");

				for (var i in threadList)
				{
					thread = threadList[i];
					threadIcon = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]//IMG");
					threadBeGone = false;
					iconMatch = false;
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
						var threadTitleLink = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/DIV/A[contains(@class, 'thread_title')]");
						if(!threadTitleLink)
						{
							threadTitleLink = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/A[contains(@class, 'thread_title')]");
						}
						var threadTitle = threadTitleLink.innerHTML;
						var keywordList = prefIgnoredKeywords.split("|");

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
					}

					if (threadBeGone && thread.style.visibility != "hidden")
					{
						gSALR.service.toggleVisibility(thread,false);
						gSALR.filteredThreadCount(doc,1);
					}
					else if (!threadBeGone && thread.style.visibility == "hidden")
					{
						gSALR.service.toggleVisibility(thread,false);
						gSALR.filteredThreadCount(doc,-1);
					}
				}
			}
		}
	},

	// Event catcher for keyword ignoring input box
	clickIgnoreKeywordSave: function(event)
	{
		if (gSALR.service.getPreference("advancedThreadFiltering"))
		{
			var doc = this.ownerDocument;
			var afMain = doc.getElementById("filter");

			if (afMain)
			{
				var afObject; // Temp object storage for things that really only get handled once
				var prefIgnoredKeywords = gSALR.service.getPreference("ignoredKeywords");
				var prefIgnoredPostIcons = gSALR.service.getPreference("ignoredPostIcons");
				var threadList, thread, threadTitleLink, threadtitle, threadBeGone;
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

				gSALR.service.setPreference("ignoredKeywords",newKeywords);

				// Cycle through the threads and actively update their visibility
				threadList = gSALR.service.selectNodes(doc, doc, "//table[@id='forum']/tbody/tr");
				keywordList = newKeywords.split("|");

				for (var i in threadList)
				{
					thread = threadList[i];
					threadTitleLink = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/DIV/DIV/A[contains(@class, 'thread_title')]");
					if(!threadTitleLink)
					{
						threadTitleLink = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/A[contains(@class, 'thread_title')]");
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
						var threadIcon = gSALR.service.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]//IMG");

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
						gSALR.service.toggleVisibility(thread,false);
						gSALR.filteredThreadCount(doc,1);
					}
					else if (!threadBeGone && thread.style.visibility == "hidden")
					{
						gSALR.service.toggleVisibility(thread,false);
						gSALR.filteredThreadCount(doc,-1);
					}
				}
			}
		}
	},

	// To cut down on code elsewhere (for keeping track of the number of threads being filtered)
	filteredThreadCount: function(doc,amount)
	{
		var count = gSALR.service.getPreference("filteredThreadCount");
		var afObject; // Temp object storage for things that really only get handled once

		afObject = doc.getElementById("salr_filteredthreadcount");

		if (!afObject)
			return;

		count += amount;
		afObject.childNodes[1].textContent = count;

		if (count <= 0 && afObject.style.visibility != "hidden")
		{
			gSALR.service.toggleVisibility(afObject,true);
		}
		else if (afObject.style.visibility == "hidden")
		{
			gSALR.service.toggleVisibility(afObject,true);
		}

		gSALR.service.setPreference("filteredThreadCount",count);
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

		//var forumid = gSALR.service.getForumID(doc); // Make into event param
		//var threadid = gSALR.service.getThreadID(doc); // Ditto
		var postid = undefined;
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
			case 'editpost':
				postid = quickbutton.nextSibling.href.match(/postid=(\d+)/i)[1];
				break;
			case 'newthread':
				break;
		}

//alert("Clicked: quicktype: " + quicktype + " threadid " + threadid + " forumid " + forumid + " postid " + postid);

		// Do we already have a window?
		if (gSALR.service.__quickquotewindowObject && !gSALR.service.__quickquotewindowObject.closed)
		{
			gSALR.quickquotewin = gSALR.service.__quickquotewindowObject;
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
							if (confirm("You already have a quick edit window open, but it was attached to a different post.\nDo you want to change which post you're editing?"))
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
						if (confirm("You already have a quick window open. Press 'OK' to convert it to a quick edit window for this post, \nor press 'Cancel' to append this post to your quick window."))
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
						if (confirm("You already have a quick window open. Press 'OK' to convert it \nto a quick reply window for this thread, or press 'Cancel' to leave it alone."))
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
					if (confirm("You already have a quick window open. Press 'OK' to convert it \nto a quick " + quicktype + " window, or press 'Cancel' to leave it alone."))
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
			gSALR.service.__quickquotewindowObject = gSALR.quickquotewin;
		}
		return false;
	},

};

gSALR.init();


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// (Old) Globals ////////////////////////////////////////////////////////////////////////////////////////////////////////////


var needRegReplyFill = false;
var quickQuoteSubmitting = false;
var salastread_savedQuickReply = "";
var salastread_savedQuickReplyThreadId = "";


// Quick quote / edit post util functions

function convertPLTag(message)
{
	return message.replace(/\[PL=(.*?)\](.*?)\[\/PL\]/g,"[URL=http://forums.somethingawful.com/showthread.php?s=&postid=$1#post$1]$2[/URL]");
}

function parsePLTagsInEdit(tarea)
{
   var xtxt = tarea.value;
   tarea.value = convertPLTag(xtxt);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Quick Quote/Post/Edit/Whatever Functions ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function quickQuoteSubmit(message, parseurl, subscribe, disablesmilies, signature, subtype, formkey, attachfile, form_cookie)
{
	try
	{
		message = convertPLTag(message);
		salastread_savedQuickReply = message;
		salastread_savedQuickReplyThreadId = gSALR.quickWindowParams.threadid;

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
			quickQuoteAddFile(doc, newform,"attachment", attachfile);
		}
		newform.__submit = newform.submit;

		if (gSALR.quickWindowParams.quicktype != "newthread")
		{
			if (subtype=="submit")
			{
				gSALR.addHiddenFormInput(doc,newform,"submit","Submit Reply");
				gSALR.service.iPostedHere(gSALR.quickWindowParams.threadid);
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
		quickQuoteSubmitting = true;
		newform.__submit();
		gSALR.quickquotewin.close();
	}
	catch(e)
	{
		alert("err: " + e);
	}
}

function quickQuoteAddFile(doc,form,name,value)
{
   var newel = doc.createElement("INPUT");
   newel.type = "file";
   newel.name = name;
   newel.value = value;
   form.appendChild(newel);
}

function releaseQuickQuoteVarsWithClose()
{
	// Never called?
   gSALR.quickquotewin.close();
}

function releaseQuickQuoteVars()
{
	gSALR.quickWindowParams.quicktype = null;
	gSALR.quickWindowParams.threadid = null;
	gSALR.quickWindowParams.forumid = null;
	gSALR.quickWindowParams.postid = null;
	gSALR.quickWindowParams.doc = null;
	quickQuoteSubmitting = false;
	gSALR.quickquotewin = null;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SA Drop Down Menu Functions /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function SALR_menuItemCommand(event, el, etype)
{
	var target = "none";
	if(etype=="command")
	{
		target = "current";
	}
	if(etype=="click")
	{
		if(event.button == 2 || event.button == 1)
		{
			target = "newtab";
		}
	}

	if(target != "none")
	{
		// Temporary (?) workaround until the forumid=search shortcut works again
		if (el.getAttribute("forumnum") == "search")
			SALR_menuItemGoTo(event,"http://forums.somethingawful.com/f/search",target);
		else
			SALR_menuItemGoTo(event,"http://forums.somethingawful.com/forumdisplay.php?s=&forumid="+el.getAttribute("forumnum"),target);
		// Try to block Firefox's default right-click menu for this element, if applicable.
		if (event.cancelable)
			event.preventDefault();
	}
}

function SALR_menuItemCommandGoToLastPost(event, el, etype, threadid)
{
	if (event.ctrlKey == true && event.shiftKey == true)
	{
		if (confirm("Do you want to unstar thread \"" + gSALR.service.getThreadTitle(threadid) + "\"?"))
		{
			gSALR.service.toggleThreadStar(threadid);
		}
		return;
	}

	try
	{
		SALR_menuItemCommandURL(event, "http://forums.somethingawful.com/showthread.php?threadid=" + threadid + "&goto=newpost", etype);
	}
	catch(e)
	{
		alert("Couldn't find thread id: " + threadid);
	}
}

function SALR_menuItemCommandURL(event, el, etype)
{
	var target = "none";

	if (etype=="command")
	{
		target = "current";
	}
	if (etype=="click")
	{
		if (event.button == 0)
		{
			target = "current";
		}
		else if (event.button == 2 || event.button == 1)
		{
			target = "newtab";
		}
	}

	var targeturl = "";
	if (typeof(el) == "string")
	{
		targeturl = el;
	}
	else
	{
		targeturl = el.getAttribute("targeturl");
	}

	if (target != "none")
	{
		SALR_menuItemGoTo(event,targeturl,target);
	}
}

function SALR_menuItemGoTo(event, url, target)
{
	if (target=="newtab")
	{
		getBrowser().addTab(url);
	}
	else if (target=="current")
	{
		if (getBrowser().selectedTab.pinned && !gSALR.service.getPreference('ignoreAppTabs'))
			getBrowser().selectedTab = getBrowser().addTab(url);
		else
			loadURI(url);
	}
}

function grabForumList(doc)
{
	var statsMenu = false;
	var rowList = gSALR.service.selectNodes(doc, doc, "//select[@name='forumid']/option");
	if (!rowList || rowList.length == 0)
	{
		// Can't find the forum list so lets check the other location
		rowList = gSALR.service.selectNodes(doc, doc, "//select[@name='t_forumid']/option");
		if (!rowList)
		{
			// Still couldn't find the forum list so lets stop now
			return
		}
		statsMenu = true;
	}
	if (rowList.length < 15)
	{
		// There's way more then 15 forums so this menu is missing some
		return;
	}

	var oDomParser = new DOMParser();
	var forumsDoc = oDomParser.parseFromString("<?xml version=\"1.0\"?>\n<forumlist></forumlist>", "text/xml");
	var targetEl = forumsDoc.documentElement;

	var forumsEl = forumsDoc.createElement("forums");
	forumsDoc.documentElement.appendChild(forumsEl);
	forumsDoc.documentElement.insertBefore(forumsDoc.createTextNode("\n"), forumsEl);

	for (var i=0; i < rowList.length; )
	{
		i = addForums(forumsDoc, rowList, i, forumsEl, 0, statsMenu);
	}

	gSALR.service.forumListXml = forumsDoc;
	if (gSALR.service.getPreference('showSAForumMenu'))
	{
		SALR_buildForumMenu();
		SALR_buildToolbarButtonMenu();
	}
}

function addForums(forumsDoc, rowList, index, parentEl, depth, statsMenu)
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
		if(forumTitle.indexOf(dashes) != 0)
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
	if (depth == 0)
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
		var i = addForums(forumsDoc, rowList, index, fel, depth+1, statsMenu);

		if (i == index)
		{
			return i;
		}

		index = i;
	}

	return index;

}

function populateForumMenuFrom(nested_menus, target, src, pinnedForumNumbers, pinnedForumElements) {

   populateForumMenuUtilsFrom(target)

   var forums, foundforums = false;
   if(src) {
      for(var i = 0; i < src.childNodes.length; i++) {
         if(src.childNodes[i].nodeName == "forums")forums = src.childNodes[i]
      }

      if(forums) {

         foundforums = populateForumMenuForumsFrom(nested_menus, target, forums, pinnedForumNumbers, pinnedForumElements,0)
      }
   }

   if(!foundforums) {
      var menuel = document.createElement("menuitem");
         menuel.setAttribute("label", "Visit a forum to reload list");
         menuel.setAttribute("forumnum", "home");

         target.appendChild(menuel);
   }
}

function populateForumMenuUtilsFrom(target) {
   var utils = [
      {name:"Private Messages",id:"pm"},
      {name:"User Control Panel",id:"cp"},
      {name:"Search Forums",id:"search"},
      {name:"Forums Home",id:"home"},
      {name:"Leper's Colony",id:"lc"}]

   var utils
   for(var i = 0; i < utils.length; i++) {
		var thisutil = utils[i]

      var menuel = document.createElement("menuitem");
         menuel.setAttribute("label", thisutil.name);
         menuel.setAttribute("forumnum", thisutil.id);
         menuel.setAttribute("onclick", "SALR_menuItemCommand(event,this,'click');");
         menuel.setAttribute("oncommand", "SALR_menuItemCommand(event,this,'command');");


         //TODO: access keys
         target.appendChild(menuel);

	}
   target.appendChild(document.createElement("menuseparator"));
}

function populateForumMenuForumsFrom(nested_menus, target, src, pinnedForumNumbers, pinnedForumElements,depth) {
   var first = true
   var foundAnything = false
   for(var i = 0; i < src.childNodes.length; i++) {
		var thisforum = src.childNodes[i];

		if(thisforum.nodeName == "cat") {
         foundAnything = true
			if(!nested_menus) {
            if(!first) {
   				target.appendChild(document.createElement("menuseparator"));
            } else  {
               first = false
            }
				populateForumMenuForumsFrom(nested_menus,target,thisforum,pinnedForumNumbers,pinnedForumElements,depth+1);
			} else {
				var submenu = document.createElement("menu");
					submenu.setAttribute("label", thisforum.getAttribute("name"));

				var submenupopup = document.createElement("menupopup");
				if(gSALR.service.getPreference('useSAForumMenuBackground')) {
					submenupopup.setAttribute("class", "lastread_menu");
				}

				submenu.appendChild(submenupopup);
				populateForumMenuForumsFrom(nested_menus,submenupopup,thisforum,pinnedForumNumbers,pinnedForumElements,depth+1);
				target.appendChild(submenu);
			}
		} else if(thisforum.nodeName == "forum" ) {
         foundAnything = true
			var menuel = document.createElement("menuitem");
         menuel.setAttribute("label", thisforum.getAttribute("name"));
         menuel.setAttribute("forumnum", thisforum.getAttribute("id"));
         menuel.setAttribute("onclick", "SALR_menuItemCommand(event,this,'click');");
         menuel.setAttribute("oncommand", "SALR_menuItemCommand(event,this,'command');");

         var cssClass = ""
         for(var j=1;j<=depth;j++) {
            cssClass += "sub"
            if(j!=depth)cssClass += "-"
         }

         if(cssClass != "") {
            menuel.setAttribute("class", "lastread_menu_" + cssClass);
         }
			//TODO: access keys
			target.appendChild(menuel);
			if(nested_menus) {
				var thisforumnum = thisforum.getAttribute("id");
				for (var j = 0; j < pinnedForumNumbers.length; j++) {
					if (pinnedForumNumbers[j] == thisforumnum) {
						pinnedForumElements[j] = thisforum;
					}
				}
			}

   		populateForumMenuForumsFrom(nested_menus,target,thisforum,pinnedForumNumbers,pinnedForumElements,depth+1);
		}
	}
   return foundAnything
}

function SALR_onMenuShowing(e)
{
	// Build the menu if we need to.
	var menupopup = document.getElementById("salr-toolbar-popup");
	if (menupopup && !menupopup.firstChild)
		SALR_buildToolbarButtonMenu();
}

function SALR_onTBClick(e)
{
	// The main portion of the SALR button has been clicked.
	// Just open the context menu, for now.
	SALR_onTBContextMenu(e)
}

function SALR_onTBContextMenu(e)
{
	var tb = e.currentTarget;
	var popup = tb.firstChild;
	if (!popup || !popup.showPopup)
		return;
	e.preventDefault();
	popup.showPopup();
}

function SALR_buildToolbarButtonMenu()
{
	var menupopup = document.getElementById("salr-toolbar-popup");
	if (menupopup)
	{
		menupopup.addEventListener("popupshowing", SALR_TBMenuShowing, false);
		if (gSALR.service.getPreference('useSAForumMenuBackground'))
		{
			menupopup.className = "lastread_menu";
		}
		else
		{
			menupopup.className = "";
		}

		while (menupopup.firstChild) {
			menupopup.removeChild(menupopup.firstChild);
		}
		var forumsDoc = gSALR.service.forumListXml;
		var nested_menus = gSALR.service.getPreference('nestSAForumMenu');
		var salrMenu = document.createElement("menuitem");
		var pinnedForumNumbers = new Array();
		var pinnedForumElements = new Array();
		if (nested_menus && gSALR.service.getPreference('menuPinnedForums')) {
			pinnedForumNumbers = gSALR.service.getPreference('menuPinnedForums').split(",");
		}
		salrMenu.setAttribute("label","Something Awful");
		salrMenu.setAttribute("image", "chrome://salastread/skin/sa.png");
		salrMenu.setAttribute("onclick", "SALR_menuItemCommandURL(event,'http://www.somethingawful.com','click');");
		salrMenu.setAttribute("oncommand", "SALR_menuItemCommandURL(event,'http://www.somethingawful.com','command');");
		salrMenu.setAttribute("class","menuitem-iconic lastread_menu_frontpage");
		menupopup.appendChild(salrMenu);
		menupopup.appendChild(document.createElement("menuseparator"));

		var lsalrMenu = document.createElement("menuitem");
		lsalrMenu.setAttribute("label","Configure SALastRead...");
		lsalrMenu.setAttribute("oncommand", "gSALR.runConfig('command');");

		menupopup.appendChild(lsalrMenu);

		menupopup.appendChild(document.createElement("menuseparator"));

		populateForumMenuFrom(nested_menus,menupopup,forumsDoc ? forumsDoc.documentElement : null,pinnedForumNumbers,pinnedForumElements);

		if(nested_menus && (pinnedForumElements.length > 0 || pinnedForumNumbers.length > 0)) {
			menupopup.appendChild(document.createElement("menuseparator"));
			for(var j = 0; j < pinnedForumElements.length || j < pinnedForumNumbers.length; j++) {
				if(pinnedForumElements[j]) {
					var thisforum = pinnedForumElements[j];
					var salrMenu = document.createElement("menuitem");
					var forumname = thisforum.getAttribute("name");
					while (forumname.substring(0,1)==" ") {
						forumname = forumname.substring(1);
					}
					salrMenu.setAttribute("label", forumname);
					salrMenu.setAttribute("forumnum", thisforum.getAttribute("id"));
					salrMenu.setAttribute("onclick", "SALR_menuItemCommand(event,this,'click');");
					salrMenu.setAttribute("oncommand", "SALR_menuItemCommand(event,this,'command');");
					salrMenu.setAttribute("class", "lastread_menu_sub");
					menupopup.appendChild(salrMenu);
				} else if(pinnedForumNumbers[j]=="sep") {
					menupopup.appendChild(document.createElement("menuseparator"));
				} else if (typeof(pinnedForumNumbers[j]) == "string" && pinnedForumNumbers[j].substring(0, 3) == "URL") {
					var umatch = pinnedForumNumbers[j].match(/^URL\[(.*?)\]\[(.*?)\]$/);
					if(umatch) {
						var salrMenu = document.createElement("menuitem");
							salrMenu.setAttribute("label", gSALR.service.UnescapeMenuURL(umatch[1]));
							salrMenu.setAttribute("targeturl", gSALR.service.UnescapeMenuURL(umatch[2]));
							salrMenu.setAttribute("onclick", "SALR_menuItemCommandURL(event,this,'click');");
							salrMenu.setAttribute("oncommand", "SALR_menuItemCommandURL(event,this,'command');");
							salrMenu.setAttribute("class", "lastread_menu_sub");

						menupopup.appendChild(salrMenu);
					}
				} else if (pinnedForumNumbers[j]=="starred") {
					var salrMenu = document.createElement("menu");
						salrMenu.setAttribute("label", "Starred Threads");
						salrMenu.setAttribute("image", "chrome://salastread/skin/star.png");
						salrMenu.setAttribute("class", "menu-iconic lastread_menu_starred");

					var subpopup = document.createElement("menupopup");
						subpopup.id = "salr_tb_starredthreadmenupopup";

					salrMenu.appendChild(subpopup);
					menupopup.appendChild(salrMenu);

					subpopup.setAttribute("onpopupshowing", "SALR_TBStarredThreadMenuShowing();");
					
				}
			}

			if(gSALR.service.getPreference('showMenuPinHelper')) {
				var ms = document.createElement("menuseparator");
				ms.id = "salr_tb_pinhelper_sep";

				menupopup.appendChild(ms);

				var salrMenu = document.createElement("menuitem");
				salrMenu.id = "salr_tb_pinhelper_item";
				salrMenu.setAttribute("label", "Learn how to pin forums to this menu...");
				salrMenu.setAttribute("image", "chrome://salastread/skin/eng101-16x16.png");
				salrMenu.setAttribute("oncommand", "SALR_LaunchPinHelper();");
				salrMenu.setAttribute("class", "menuitem-iconic lastread_menu_sub");

				menupopup.appendChild(salrMenu);
			}
		}
	}
}

function SALR_buildForumMenu()
{
	// If there are any other SA menus, hide them.  Why? Who knows
	// Since this now defaults to off, it might not work, keep an eye out if anyone cares
	if (gSALR.service.getPreference('hideOtherSAMenus'))
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

	var menupopup = document.getElementById("menupopup_SAforums");
	if (menupopup == null)
	{
		var iBefore = document.getElementById("tools-menu");
		if (!iBefore)
		{
			iBefore = document.getElementById("main-menubar").lastChild;
		}
		var salrMenu = document.createElement("menu");
		salrMenu.id = "salr-menu";
		salrMenu.setAttribute("label", "SA");
		salrMenu.setAttribute("accesskey", gSALR.service.getPreference('menuAccessKey'));
		salrMenu.style.display = "none";
		menupopup = document.createElement("menupopup");
		menupopup.id = "menupopup_SAforums";
		menupopup.className = "lastread_menu";
		salrMenu.appendChild(menupopup);
		iBefore.parentNode.insertBefore(salrMenu, iBefore);
		menupopup.addEventListener("popupshowing", SALR_SAMenuShowing, false);
	}

	if (gSALR.service.getPreference('useSAForumMenuBackground'))
	{
		menupopup.className = "lastread_menu";
	}
	else
	{
		menupopup.className = "";
	}

	while (menupopup.firstChild) {
		menupopup.removeChild(menupopup.firstChild);
	}
	var forumsDoc = gSALR.service.forumListXml;
	var nested_menus = gSALR.service.getPreference('nestSAForumMenu');
	var salrMenu = document.createElement("menuitem");
	var pinnedForumNumbers = new Array();
	var pinnedForumElements = new Array();
	if (nested_menus && gSALR.service.getPreference('menuPinnedForums')) {
		pinnedForumNumbers = gSALR.service.getPreference('menuPinnedForums').split(",");
	}
	salrMenu.setAttribute("label","Something Awful");
	salrMenu.setAttribute("image", "chrome://salastread/skin/sa.png");
	salrMenu.setAttribute("onclick", "SALR_menuItemCommandURL(event,'http://www.somethingawful.com','click');");
	salrMenu.setAttribute("oncommand", "SALR_menuItemCommandURL(event,'http://www.somethingawful.com','command');");
	salrMenu.setAttribute("class","menuitem-iconic lastread_menu_frontpage");
	menupopup.appendChild(salrMenu);
	menupopup.appendChild(document.createElement("menuseparator"));

	var lsalrMenu = document.createElement("menuitem");
	lsalrMenu.setAttribute("label","Configure SALastRead...");
	lsalrMenu.setAttribute("oncommand", "gSALR.runConfig('command');");

	menupopup.appendChild(lsalrMenu);

	menupopup.appendChild(document.createElement("menuseparator"));

	populateForumMenuFrom(nested_menus,menupopup,forumsDoc ? forumsDoc.documentElement : null,pinnedForumNumbers,pinnedForumElements);

	if(nested_menus && (pinnedForumElements.length > 0 || pinnedForumNumbers.length > 0)) {
		menupopup.appendChild(document.createElement("menuseparator"));
		for(var j = 0; j < pinnedForumElements.length || j < pinnedForumNumbers.length; j++) {
			if(pinnedForumElements[j]) {
				var thisforum = pinnedForumElements[j];
				var salrMenu = document.createElement("menuitem");
				var forumname = thisforum.getAttribute("name");
				while (forumname.substring(0,1)==" ") {
					forumname = forumname.substring(1);
				}
				salrMenu.setAttribute("label", forumname);
				salrMenu.setAttribute("forumnum", thisforum.getAttribute("id"));
				salrMenu.setAttribute("onclick", "SALR_menuItemCommand(event,this,'click');");
				salrMenu.setAttribute("oncommand", "SALR_menuItemCommand(event,this,'command');");
				salrMenu.setAttribute("class", "lastread_menu_sub");
				menupopup.appendChild(salrMenu);
			} else if(pinnedForumNumbers[j]=="sep") {
				menupopup.appendChild(document.createElement("menuseparator"));
			} else if (typeof(pinnedForumNumbers[j]) == "string" && pinnedForumNumbers[j].substring(0, 3) == "URL") {
				var umatch = pinnedForumNumbers[j].match(/^URL\[(.*?)\]\[(.*?)\]$/);
				if(umatch) {
					var salrMenu = document.createElement("menuitem");
						salrMenu.setAttribute("label", gSALR.service.UnescapeMenuURL(umatch[1]));
						salrMenu.setAttribute("targeturl", gSALR.service.UnescapeMenuURL(umatch[2]));
						salrMenu.setAttribute("onclick", "SALR_menuItemCommandURL(event,this,'click');");
						salrMenu.setAttribute("oncommand", "SALR_menuItemCommandURL(event,this,'command');");
						salrMenu.setAttribute("class", "lastread_menu_sub");

					menupopup.appendChild(salrMenu);
				}
			} else if (pinnedForumNumbers[j]=="starred") {
				var salrMenu = document.createElement("menu");
					salrMenu.setAttribute("label", "Starred Threads");
					salrMenu.setAttribute("image", "chrome://salastread/skin/star.png");
					salrMenu.setAttribute("class", "menu-iconic lastread_menu_starred");

				var subpopup = document.createElement("menupopup");
					subpopup.id = "salr_starredthreadmenupopup";

				salrMenu.appendChild(subpopup);
				menupopup.appendChild(salrMenu);

				subpopup.setAttribute("onpopupshowing", "SALR_StarredThreadMenuShowing();");
			}
		}

		if(gSALR.service.getPreference('showMenuPinHelper')) {
			var ms = document.createElement("menuseparator");
			ms.id = "salr_pinhelper_sep";

			menupopup.appendChild(ms);

			var salrMenu = document.createElement("menuitem");
			salrMenu.id = "salr_pinhelper_item";
			salrMenu.setAttribute("label", "Learn how to pin forums to this menu...");
			salrMenu.setAttribute("image", "chrome://salastread/skin/eng101-16x16.png");
			salrMenu.setAttribute("oncommand", "SALR_LaunchPinHelper();");
			salrMenu.setAttribute("class", "menuitem-iconic lastread_menu_sub");

			menupopup.appendChild(salrMenu);
		}
	}
	document.getElementById("salr-menu").style.display = "-moz-box";
}

function SALR_TBStarredThreadMenuShowing() {
	var menupopup = document.getElementById("salr_tb_starredthreadmenupopup");
	while (menupopup.firstChild != null) {
		menupopup.removeChild(menupopup.firstChild);
	}
	var starred = gSALR.service.starList;

	for(var id in starred)
	{
		var title = starred[id];
		var menuel = document.createElement("menuitem");
			menuel.setAttribute("label", title);
			menuel.setAttribute("onclick", "SALR_menuItemCommandGoToLastPost(event, this, 'click'," + id + ");");
			menuel.setAttribute("oncommand", "SALR_menuItemCommandGoToLastPost(event, this, 'command'," + id + ");");
		menupopup.appendChild(menuel);
	}

	if (!menupopup.firstChild)
	{
		var menuel = document.createElement("menuitem");
			menuel.setAttribute("label", "You have no threads starred.");
			menuel.setAttribute("disabled", "true");
		menupopup.appendChild(menuel);
	}
}

function SALR_StarredThreadMenuShowing() {
	var menupopup = document.getElementById("salr_starredthreadmenupopup");
	while (menupopup.firstChild != null) {
		menupopup.removeChild(menupopup.firstChild);
	}
	var starred = gSALR.service.starList;

	for(var id in starred)
	{
		var title = starred[id];
		var menuel = document.createElement("menuitem");
			menuel.setAttribute("label", title);
			menuel.setAttribute("onclick", "SALR_menuItemCommandGoToLastPost(event, this, 'click'," + id + ");");
			menuel.setAttribute("oncommand", "SALR_menuItemCommandGoToLastPost(event, this, 'command'," + id + ");");
		menupopup.appendChild(menuel);
	}

	if (!menupopup.firstChild)
	{
		var menuel = document.createElement("menuitem");
			menuel.setAttribute("label", "You have no threads starred.");
			menuel.setAttribute("disabled", "true");
		menupopup.appendChild(menuel);
	}
}

function SALR_TBMenuShowing() {
   if ( gSALR.service.getPreference('showMenuPinHelper') == false ) {
      var ms = document.getElementById("salr_tb_pinhelper_sep");
      var mi = document.getElementById("salr_tb_pinhelper_item");
      if ( ms != null ) {
         ms.parentNode.removeChild(ms);
      }
      if ( mi != null ) {
         mi.parentNode.removeChild(mi);
      }
   }
}

function SALR_SAMenuShowing() {
   if ( gSALR.service.getPreference('showMenuPinHelper') == false ) {
      var ms = document.getElementById("salr_pinhelper_sep");
      var mi = document.getElementById("salr_pinhelper_item");
      if ( ms != null ) {
         ms.parentNode.removeChild(ms);
      }
      if ( mi != null ) {
         mi.parentNode.removeChild(mi);
      }
   }
}

function SALR_LaunchPinHelper() {
   gSALR.service.setPreference('showMenuPinHelper', false);

   gSALR.runConfig("menu");
   alert("You may return to the menu settings at any time by choosing \"Configure SALastRead...\" from the SA menu, or by "+
         "clicking the \"Configure SALR\" link in the header of any forum page.");
}


