///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Globals ////////////////////////////////////////////////////////////////////////////////////////////////////////////


var persistObject = null;
var needToShowChangeLog = false;
var salastread_needRegReplyFill = false;
var SALR_debugLog = new Array();
var SALR_PageTimerCount = 0;
var quickquotewin = null;
var quickQuoteSubmitting = false;
var salastread_savedQuickReply = "";
var salastread_savedQuickReplyThreadId = "";


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Core Funtions & Events /////////////////////////////////////////////////////////////////////////////////////////////


// This starts it all. Called once, on browser load, plan accordingly.
try
{
	persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"].createInstance(Components.interfaces.nsISupports);
	persistObject = persistObject.wrappedJSObject;
	if (!persistObject)
	{
		throw "Failed to create persistObject.";
	}
	SALR_init();

	document.addEventListener('load', SALR_windowOnload, true);
	document.addEventListener('beforeunload', salastread_windowOnBeforeUnload, true);
	document.addEventListener('unload', salastread_windowOnUnload, true);
}
catch (e)
{
	alert("SALastRead init error: "+e);
	if (persistObject)
	{
		alert("persistObject._starterr =\n" + persistObject._starterr);
	}
}

function SALR_init()
{
	// This should get changed to something better eventually
	var isWindows = (navigator.platform.indexOf("Win") != -1);
	persistObject.ProfileInit(isWindows);

	if (persistObject._starterr)
	{
		throw "SALR Startup Error";
	}

	setInterval(SALR_TimerTick, 1000);

	if (persistObject && persistObject.LastRunVersion != persistObject.SALRversion)
	{
		needToShowChangeLog = !persistObject.IsDevelopmentRelease;
		// Here we have to put special cases for specific dev build numbers that require the changelog dialog to appear
		var buildNum = parseInt(persistObject.LastRunVersion.match(/^(\d+)\.(\d+)\.(\d+)/)[3], 10);
		if (buildNum <= 80509) // Put the latest build number to need an SQL patch here
		{
			needToShowChangeLog = true;
		}
	}

	if (persistObject && persistObject._needToExpireThreads)
	{
		persistObject.expireThreads();
		persistObject._needToExpireThreads = false;
	}

	if (needToShowChangeLog == true)
	{
		needToShowChangeLog = false;
		showChangelogWindow();
	}
}

// New and improved onload handler wrapper
// It waits until we visit Something Awful before adding the SA specific onload
// NOTE: This is fired on every page load and then some, plan accordingly

function SALR_windowOnload(e)
{
	var appcontent = document.getElementById("appcontent"); // browser
	var doc = e.originalTarget; // document

	if (persistObject.getPreference("showSAForumMenu") && (document.getElementById("salr-menu") == null))
	{
		SALR_buildForumMenu();
	}

	if (appcontent && doc.location && (doc.location.host.search(/^(forum|archive)s?\.somethingawful\.com$/i) == -1))
	{
		// Remove the context menu since we're not at Something Awful
		var cacm = document.getElementById("contentAreaContextMenu");
		var mopt = document.getElementById("salastread-context-menu");
		var moptsep = document.getElementById("salastread-context-menuseparator");
		if (mopt)
		{
			mopt.style.display = "none";
		}
		if (moptsep)
		{
			moptsep.style.display = "none";
		}
	}

	if (appcontent && doc.location && (doc.location.host.search(/^(forum|archive)s?\.somethingawful\.com$/i) > -1))
	{
		// Once we visit Something Awful, start doing Something Awful stuff
		appcontent.addEventListener("load", SALR_onLoad, true);
	}

}

// New and improved onload handler
// Designed to only load when we're at Something Awful, then load every page load there after
// Hopefully this will cut down on memory usage
// NOTE: This won't fire until Something Awful is visited, then it fires on every page load

function SALR_onLoad(e)
{
	// This if statement included to help debugging, change the pref value to disable without restarting
	if (persistObject.getPreference("disabled"))
	{
		return;
	}

	var doc = e.originalTarget;

	if (doc.location.host.search(/^(forum|archive)s?\.somethingawful\.com$/i) == -1)
	{
		// We're not at Something Awful
		return;
	}

	if (doc.__salastread_processed)
	{
		// We've already been here
		return;
	}

	try
	{
		// Set a listener on the context menu
		if (persistObject.getPreference("enableContextMenu"))
		{
			document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", SALR_ContextMenuShowing, false);
		}
		else
		{
			// The context menu is turned off, so remove it
			var cacm = document.getElementById("contentAreaContextMenu");
			var mopt = document.getElementById("salastread-context-menu");
			var moptsep = document.getElementById("salastread-context-menuseparator");
			if (mopt)
			{
				mopt.style.display = "none";
			}
			if (moptsep)
			{
				moptsep.style.display = "none";
			}
		}

		var pageHandler;
		var pageName = doc.location.pathname.match(/^\/(\w+)\.php/i);
		if (pageName)
		{
			switch(pageName[1])
			{
				case "index":
					pageHandler = handleIndex;
					break;

				case "usercp":
				case "bookmarkthreads":
					pageHandler = handleSubscriptions;
					break;

				case "account":
					pageHandler = handleAccount;
					break;

				case "forumdisplay":
					pageHandler = handleForumDisplay;
					break;

				case "showthread":
					pageHandler = handleShowThread;
					break;

				case "newreply":
					pageHandler = handleNewReply;
					break;

				case "editpost":
					pageHandler = handleEditPost;
					break;

				case "supportmail":
					pageHandler = handleSupport;
					break;

				case "misc":
					pageHandler = handleMisc;
					break;
			}
		}

		// Don't try to format the page if it's not supported
		if (pageHandler)
		{
			// Append custom CSS files to the head
			if (persistObject.getPreference("gestureEnable"))
			{
				SALR_insertCSS(doc, "chrome://salastread/content/css/gestureStyling.css");
			}
			if (persistObject.getPreference("removeHeaderAndFooter"))
			{
				SALR_insertCSS(doc, "chrome://salastread/content/css/removeHeaderAndFooter.css");
			}
			if (persistObject.getPreference("enablePageNavigator") || persistObject.getPreference("enableForumNavigator"))
			{
				SALR_insertCSS(doc, "chrome://salastread/content/css/pageNavigator.css");
			}

			// Insert our dynamic CSS into the head
			persistObject.insertDynamicCSS(doc, persistObject.generateDynamicCSS);

			// Insert a text link to open the options menu
			if (persistObject.getPreference('showTextConfigLink'))
			{
				SALR_insertConfigLink(doc);
			}

			// Remove the page title prefix/postfix
			if (persistObject.getPreference("removePageTitlePrefix"))
			{
				doc.title = SALR_getPageTitle(doc);
			}

			// Call the proper handler for this type of page
			pageHandler(doc);

			handleBodyClassing(doc);

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

				// Added by duz for testing events
				screl = doc.createElement("SCRIPT");
				screl.setAttribute("language","javascript");
				screl.setAttribute("src","chrome://salastread/content/salrevents.js");
				head.appendChild(screl);
			}

			SALR_IncTimer();
		}

		if (persistObject.getPreference('enableDebugMarkup'))
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

				if (!persistObject || !persistObject.getPreference('suppressErrors'))
				{
					alert("SALastRead application err: "+errstr);
				}
				else
				{
					if (!persistObject || !persistObject.getPreference('suppressErrors'))
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
}

function SALR_PageFinishedLoading(e)
{
	var doc = e.originalTarget;
	doc.__salastread_loading = false;
}

function salastread_windowOnBeforeUnload(e)
{
	if(e.originalTarget == window.__salastread_quotedoc)
	{
		if(quickQuoteSubmitting)
		{
			return true;
		}

		if(quickquotewin && !quickquotewin.closed)
		{
			quickquotewin.detachFromDocument();
		}
		return true;
	}
}

function salastread_windowOnUnload(e)
{
   if ( e.originalTarget == window.__salastread_quotedoc )
   {
      releaseQuickQuoteVars();
   }
   if ( e.originalTarget.__salastread_processed )
   {
      SALR_DecTimer();
      persistObject.SaveTimerValue();
   }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Page Handlers ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Do anything needed to the post list in a forum
function handleForumDisplay(doc)
{
	var failed, i, e;  // Little variables that'll get reused
	var forumid = persistObject.getForumID(doc);
	if (forumid === false)
	{
		// Can't determine forum id so stop
		return;
	}
	// The following forums have special needs that must be dealt with
	var flags = {
		"inFYAD" : persistObject.inFYAD(forumid),
		"inBYOB" : persistObject.inBYOB(forumid),
		"inDump" : persistObject.inDump(forumid),
		"inAskTell" : persistObject.inAskTell(forumid),
		"inGasChamber" : persistObject.inGasChamber(forumid),
		"inArchives" : (doc.location.host.search(/^archives\.somethingawful\.com$/i) > -1)
	};

	if (doc.getElementById('forum') == null) {
		// /!\ Forum table isn't there, abort! /!\
		return;
	}

	if (!persistObject.gotForumList)
	{
		// Replace this function once the AJAXified JSON is added to the forums
		// function will check timestamp which is stored in preferences
		 grabForumList(doc);
		 persistObject.gotForumList = true;
	}

	if (flags.inFYAD && !persistObject.getPreference("enableFYAD")) {
		// We're in FYAD and FYAD support has been turned off
		return;
	}

	// Start a transaction to try and reduce the likelihood of database corruption
	var ourTransaction = false;
	if (persistObject.database.transactionInProgress) {
		ourTransaction = true;
		persistObject.database.beginTransactionAs(persistObject.database.TRANSACTION_DEFERRED);
	}

	var pageList = persistObject.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
	if (pageList)
	{
		if (pageList.length >  1)
		{
			pageList = pageList[pageList.length-1];
		}
		else
		{
			pageList = pageList[0];
		}
		var numPages = pageList.innerHTML.match(/\((\d+)\)/);
		var curPage = persistObject.selectSingleNode(doc, doc, "//SPAN[contains(@class,'curpage')]");
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

	// Insert the forums paginator
	if (persistObject.getPreference("enableForumNavigator"))
	{
		persistObject.addPagination(doc);
	}
	if (persistObject.getPreference("gestureEnable"))
	{
		doc.__SALR_curPage = curPage;
		doc.__SALR_maxPage = numPages;
		doc.body.addEventListener('mousedown', SALR_PageMouseDown, false);
		doc.body.addEventListener('mouseup', SALR_PageMouseUp, false);
	}

	// Replace post button
	if (persistObject.getPreference("useQuickQuote") && !flags.inGasChamber)
	{
		var postbutton = persistObject.selectSingleNode(doc, doc, "//A[contains(@href,'action=newthread')]");
		if (postbutton)
		{
			attachQuickQuoteHandler(undefined,doc,persistObject.turnIntoQuickButton(doc, postbutton, forumid),"",0);
		}
	}

	// Snag Forum Moderators
	if (!flags.inGasChamber && !flags.inArchives)
	{
		var modarray = doc.getElementById('mods').getElementsByTagName('a');
		var modcount = modarray.length;
		for (i = 0; i < modcount; i++)
		{
			userid = modarray[i].href.match(/userid=(\d+)/i)[1];
			username = modarray[i].innerHTML;
			if (!persistObject.isMod(userid) && !persistObject.isAdmin(userid))
			{
				// TODO: Change this to create a array and then merge it with the mod list array
				// and if different, store it in the database
				persistObject.addMod(userid, username);
			}
		}
	}

	// Advanced thread filtering interface
	var prefAdvancedThreadFiltering = persistObject.getPreference("advancedThreadFiltering");
	if (prefAdvancedThreadFiltering && !flags.inDump && !flags.inArchives)
	{
		rebuildFilterBox(doc);
	}

	if (!flags.inDump)
	{
		// Capture and store the post icon # -> post icon filename relationship
		var filterIcons = doc.getElementById("filtericons");
		var iconNumber, iconFilename;
		var postIcons = persistObject.selectNodes(doc, filterIcons, "A[contains(@href,'posticon=')]");
		var divIcon, seperator, divClone, afIgnoredIcons, anyLeft, allIgnored, noneIgnored, searchString;
		var atLeastOneIgnored = false;
		var prefIgnoredPostIcons = persistObject.getPreference("ignoredPostIcons");
		var prefIgnoredKeywords = persistObject.getPreference("ignoredKeywords");

		for (i in postIcons)
		{
			if ((postIcons[i].href.search(/posticon=(\d+)/i) > -1) && (postIcons[i].firstChild.src.search(/posticons\/(.*)/i) > -1))
			{
			// TODO: Change this to store the icons as an array and merge them with the post icon list array
			// and if different, store it in the database
				iconNumber = parseInt(postIcons[i].href.match(/posticon=(\d+)/i)[1]);
				iconFilename = postIcons[i].firstChild.src.match(/posticons\/(.*)/i)[1];
				persistObject.addIcon(iconNumber, iconFilename);

				// Additional stuff for advanced thread filtering
				if (prefAdvancedThreadFiltering && !flags.inArchives)
				{
					// First move all the existing icons and their spacers into a div for easy handling
					divIcon = doc.createElement("div");
					postIcons[i].parentNode.insertBefore(divIcon,postIcons[i]);
					seperator = postIcons[i].nextSibling;
					divIcon.appendChild(postIcons[i]);
					divIcon.appendChild(seperator);
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
						persistObject.toggleVisibility(divIcon,true);
						atLeastOneIgnored = true;
					}
					else
					{
						persistObject.toggleVisibility(divClone,true);
					}

					// Add the appropriate click events
					postIcons[i].parentNode.addEventListener("click", clickToggleIgnoreIcon, false);
					divClone.addEventListener("click", clickToggleIgnoreIcon, false);
				}
			}
		}

		// Little bit of house cleaning after cycling through the icons
		if (prefAdvancedThreadFiltering && !flags.inArchives)
		{
			allIgnored = doc.getElementById("alliconsignored");
			noneIgnored = doc.getElementById("noiconsignored");

			// Hide or show the placeholder labels
			anyLeft = persistObject.selectSingleNode(doc, filterIcons, "DIV[contains(@style,'visibility: visible; display: inline;')]");
			if (!anyLeft && allIgnored.style.visibility == "hidden")
			{
				persistObject.toggleVisibility(allIgnored,true);
			}
			if (atLeastOneIgnored && noneIgnored.style.visibility == "visible")
			{
				persistObject.toggleVisibility(noneIgnored,true);
			}
		}
	}

	handleThreadList(doc, forumid, flags);

	if (ourTransaction)
	{
		// Finish off the transaction
		persistObject.database.commitTransaction();
	}
}

// Do anything needed to the subscribed threads list
function handleSubscriptions(doc)
{
	var cpusernav = persistObject.selectSingleNode(doc, doc, "//ul[contains(@id,'usercpnav')]");
	if (!cpusernav) {
		// Don't see the control panel menu so stop
		return;
	}

	if (persistObject.getPreference("username") == '')
	{
		var username = persistObject.selectSingleNode(doc,doc,"//div[contains(@class, 'breadcrumbs')]/b");
		if (username)
		{
			username = escape(username.textContent.substr(52));
			persistObject.setPreference("username", username);
		}
	}

	handleThreadList(doc, null, { "inUserCP" : true });
}

//handle highlighting of user cp/forum listings
function handleThreadList(doc, forumid, flags)
{
	//get preferences once
	var dontHighlightThreads = persistObject.getPreference("dontHighlightThreads");
	var disableNewReCount = persistObject.getPreference("disableNewReCount");
	var newPostCountUseOneLine = persistObject.getPreference("newPostCountUseOneLine");
	var disableGradients = persistObject.getPreference("disableGradients");
	var showUnvisitIcon = persistObject.getPreference("showUnvisitIcon");
	var swapIconOrder = persistObject.getPreference("swapIconOrder");
	var showGoToLastIcon = persistObject.getPreference("showGoToLastIcon");
	var alwaysShowGoToLastIcon = persistObject.getPreference("alwaysShowGoToLastIcon");
	var readWithNewLight = persistObject.getPreference("readWithNewLight");
	var readWithNewDark = persistObject.getPreference("readWithNewDark");
	var readLight = persistObject.getPreference("readLight");
	var readDark = persistObject.getPreference("readDark");
	var postedInThreadRe = persistObject.getPreference("postedInThreadRe");
	var modColor = persistObject.getPreference("modColor");
	var modBackground = persistObject.getPreference("modBackground");
	var adminColor = persistObject.getPreference("adminColor");
	var adminBackground = persistObject.getPreference("adminBackground");
	var highlightUsernames = persistObject.getPreference("highlightUsernames");
	var dontBoldNames = persistObject.getPreference("dontBoldNames");
	var showSALRIcons = persistObject.getPreference("showSALRIcons");
	var showTWNP = persistObject.getPreference('showThreadsWithNewPostsFirst');
	var showTWNPCP = persistObject.getPreference('showThreadsWithNewPostsFirstCP');
	var postsPerPage = persistObject.getPreference('postsPerPage');
	var advancedThreadFiltering = persistObject.getPreference("advancedThreadFiltering");
	var ignoredPostIcons = persistObject.getPreference("ignoredPostIcons");
	var ignoredKeywords = persistObject.getPreference("ignoredKeywords");

	// We'll need lots of variables for this
	var threadIconBox, threadTitleBox, threadTitleLink, threadAuthorBox, threadRepliesBox, threadLastPostBox;
	var threadTitle, threadId, threadOPId, threadRe, threadDetails;
	var threadLRCount, unvistIcon, lpIcon, lastPostName;
	var userPosterNote, lastLink, threadReCount, searchString;
	var starredthreads = persistObject.starList, ignoredthreads = persistObject.ignoreList;
	var iconlist = persistObject.iconList;
	var table = document.getElementById('forum');
	var threadDetails = new Array();

	// We need to reset this every time the page is fully loaded
	persistObject.setPreference("filteredThreadCount",0);

	// Here be where we work on the thread rows
	var threadlist = persistObject.selectNodes(doc, doc, "//table[@id='forum']/tbody/tr");

	// These are insertion points for thread sorting
	if ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP))
	{
		var anchorTop = persistObject.selectSingleNode(doc, doc, "//table[@id='forum']/tbody");

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

	// Does this thread listing have broken reply count links due to "&amp;"s in the JavaScript?
	//  Note: This can be removed when this is fixed forum-side. - RedKazan
	var brokenReplyCounts = persistObject.selectSingleNode(doc, doc, "HTML/HEAD/SCRIPT[contains(./text(),'&amp;action=whoposted&amp;')]");

	for (var i in threadlist)
	{
		var thread = threadlist[i];
		threadTitleBox = persistObject.selectSingleNode(doc, thread, "TD[contains(@class,'title')]");
		if (threadTitleBox.getElementsByTagName('a')[0].className.search(/announcement/i) > -1)
		{
			if ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP))
			{
				anchorTop.insertBefore(thread,anchorAnnouncement);
			}
			// It's an announcement so skip the rest
			continue;
		}

		threadTitleLink = persistObject.selectSingleNode(doc, threadTitleBox, "DIV/A[contains(@class, 'thread_title')]");
		if(!threadTitleLink)
		{
			threadTitleLink = persistObject.selectSingleNode(doc, threadTitleBox, "A[contains(@class, 'thread_title')]");
		}
		if(!threadTitleLink) continue;
		threadId = parseInt(threadTitleLink.href.match(/threadid=(\d+)/i)[1], 10);
		threadTitle = threadTitleLink.innerHTML;
		threadDetails = persistObject.getThreadDetails(threadId);
		if (threadDetails['ignore'])
		{
			// If thread is ignored might as well remove it and stop now
			thread.parentNode.removeChild(thread);
			// Update the title just incase we don't know what it is
			persistObject.setThreadTitle(threadId, threadTitle);
			continue;
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
					persistObject.toggleVisibility(thread,false);
					filteredThreadCount(doc,1);
					threadBeGone = true;
				}
			}
		}

		threadAuthorBox = persistObject.selectSingleNode(doc, thread, "TD[contains(@class, 'author')]");
		threadRepliesBox = persistObject.selectSingleNode(doc, thread, "TD[contains(@class, 'replies')]");
		threadOPLink = threadAuthorBox.getElementsByTagName('a');
		if (threadOPLink[0])
		{
			threadOPId = parseInt(threadOPLink[0].href.match(/userid=(\d+)/i)[1]);
		}

		// We may need to fix the reply count link for this thread
		//  Note: This can be removed when this is fixed forum-side. - RedKazan
		if (brokenReplyCounts)
		{
			threadRepliesBox.firstChild.href="javascript:void(window.open('misc.php?s=&action=whoposted&threadid=" + threadId + "', 'whoposted', 'toolbar=no,scrollbars=yes,resizable=yes,width=230,height=200'))";
		}

		lastLink = persistObject.selectSingleNode(doc, threadTitleBox, "DIV/DIV/A[./text() = 'Last']");
		if (lastLink)
		{
			threadReCount = parseInt(threadRepliesBox.textContent, 10) + 1;
			lastPageNum = Math.ceil(threadReCount / postsPerPage);
			lastLink.innerHTML += ' (' + lastPageNum + ')';
		}

		// So right click star/ignore works
		thread.className += " salastread_thread_" + threadId;

		// Replace the thread icon with a linked thread icon
		threadIconBox = persistObject.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]");
		if (flags && forumid && !flags.inDump && threadIconBox.firstChild.src.search(/posticons\/(.*)/i) > -1)
		{
			iconFilename = threadIconBox.firstChild.src.match(/posticons\/(.*)/i)[1];
			if (iconlist[iconFilename] != undefined)
			{
				iconGo = doc.createElement("a");
				iconGo.setAttribute("href", "/forumdisplay.php?forumid=" + forumid + "&posticon=" + iconlist[iconFilename]);
				iconGo.appendChild(threadIconBox.removeChild(threadIconBox.firstChild));
				iconGo.firstChild.style.border = "none";
				threadIconBox.appendChild(iconGo);
			}

			if (advancedThreadFiltering && !flags.inArchives&& !flags.inDump && !flags.inUserCP)
			{
				// Is this icon ignored?
				searchString = "(^|\\s)" + iconlist[iconFilename] + ",";
				searchString = new RegExp(searchString , "gi");
				if (ignoredPostIcons.search(searchString) > -1 && thread.style.visibility != "hidden")
				{
					persistObject.toggleVisibility(thread,false);
					filteredThreadCount(doc,1);
				}
			}
		}

		var divLastSeen = persistObject.selectSingleNode(doc, threadTitleBox, "div[contains(@class, 'lastseen')]");
		if (divLastSeen)
		{
			// Thread is read so lets work our magic
			var iconMarkUnseen = persistObject.selectSingleNode(doc, divLastSeen, "a[contains(@class, 'x')]");
			var iconJumpLastRead = persistObject.selectSingleNode(doc, divLastSeen, "a[contains(@class, 'count')]");

			// For thread sorting later
			if (iconJumpLastRead && ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP)))
			{
				thread.className += ' moveup';
			}

			if (showSALRIcons && !dontHighlightThreads && threadDetails['posted'])
			{
				// Don't think this is working right now
				threadRepliesBox.style.backgroundColor = postedInThreadRe;
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
						iconMarkUnseen.addEventListener("click", clickMarkUnseen, false);
					}
				}
			}

			//SALR replacing forums buttons
			if (!disableNewReCount && iconJumpLastRead)
			{
				threadRe = persistObject.selectSingleNode(doc, iconJumpLastRead, "B");
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

			// Remove the new replies count from the default box if we are showing the custom icon
			if (showGoToLastIcon && iconJumpLastRead)
			{
				threadRe = persistObject.selectSingleNode(doc, iconJumpLastRead, "B");
				iconJumpLastRead.removeChild(threadRe);
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
			var iAmASticky = persistObject.selectSingleNode(doc, thread, "TD[contains(@class, 'sticky')]");
			var iHaveNewPosts = (thread.className.search(/moveup/i) > -1);

			if (iAmASticky && iHaveNewPosts)
			{
				anchorTop.insertBefore(thread,anchorUnreadStickies);
			}
			else if (iAmASticky && !iHaveNewPosts)
			{
				anchorTop.insertBefore(thread,anchorReadStickies);
			}
			else if (!iAmASticky && iHaveNewPosts)
			{
				anchorTop.insertBefore(thread,anchorThreads);
			}
		}

		if (threadDetails['star'])
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

				if (persistObject.isMod(threadOPId))
				{
					posterColor = modColor;
					posterBG =  modBackground;
				}

				if (persistObject.isAdmin(threadOPId))
				{
					posterColor = adminColor;
					posterBG =  adminBackground;
				}

				userColoring = persistObject.isUserIdColored(threadOPId);
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
			threadLastPostBox = persistObject.selectSingleNode(doc, thread, "TD[contains(@class, 'lastpost')]");
			lastPostLink = threadLastPostBox.getElementsByTagName('a');
			if (lastPostLink[0])
			{
				lastPostId = persistObject.getUserId(lastPostLink[0].innerHTML);
			}

			if (lastPostId)
			{
				posterColor = false;
				posterBG = false;

				if (persistObject.isMod(lastPostId))
				{
					posterColor = modColor;
					posterBG =  modBackground;
				}

				if (persistObject.isAdmin(lastPostId))
				{
					posterColor = adminColor;
					posterBG =  adminBackground;
				}

				userColoring = persistObject.isUserIdColored(lastPostId);
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
}

function handleShowThread(doc)
{
	var failed, i, e; // Little variables that'll get reused
	if (doc.getElementById('thread') == null)
	{
		// If there is no thread div then abort since something's not right
		return;
	}

	try
	{
		var forumid = persistObject.getForumID(doc);
		var threadid = persistObject.getThreadID(doc);

		if (!forumid || !threadid)
		{	// Feel free to elaborate on this later
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
	var inFYAD = persistObject.inFYAD(forumid);
	var inBYOB = persistObject.inBYOB(forumid);
	var inDump = persistObject.inDump(forumid);
	var inAskTell = persistObject.inAskTell(forumid);
	var inGasChamber = persistObject.inGasChamber(forumid);
	var inArchives = (doc.location.host.search(/^archives\.somethingawful\.com$/i) > -1);
	var singlePost = (doc.location.search.search(/action=showpost/i) > -1);
	var username = unescape(persistObject.getPreference('username'));

	if (inFYAD && !persistObject.getPreference("enableFYAD"))
	{
		// We're in FYAD and FYAD support has been turned off
		return;
	}

	doc.body.className += " salastread_forum" + forumid;
	// used by the context menu to allow options for this thread
	doc.body.className += " salastread_thread_" + threadid;

	persistObject.iAmReadingThis(threadid);
	//var lastReadPostCount = persistObject.getLastReadPostCount(threadid);

	// Grab the thread title
	persistObject.setThreadTitle(threadid, SALR_getPageTitle(doc));

	// Grab the go to dropdown
	if (!persistObject.gotForumList && !singlePost)
	{
		grabForumList(doc);
		persistObject.gotForumList = true;
	}

	var pageList = persistObject.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
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
		var numPages = pageList.innerHTML.match(/\((\d+)\)/);
		var curPage = persistObject.selectSingleNode(doc, doc, "//SPAN[contains(@class,'curpage')]");
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

	// Insert the thread paginator
	if (persistObject.getPreference("enablePageNavigator"))
	{
		persistObject.addPagination(doc);
	}
	if (persistObject.getPreference("gestureEnable"))
	{
		doc.__SALR_curPage = curPage;
		doc.__SALR_maxPage = numPages;
		doc.body.addEventListener('mousedown', SALR_PageMouseDown, false);
		doc.body.addEventListener('mouseup', SALR_PageMouseUp, false);
	}

	// Grab threads/posts per page
	var perpage = persistObject.selectSingleNode(doc, doc, "//DIV[contains(@class,'pages')]//A[contains(@href,'perpage=')]");
	if (perpage)
	{
		perpage = perpage.href.match(/perpage=(\d+)/i)[1];
		persistObject.setPreference("postsPerPage", perpage);
	}
	else
	{
		perpage = 0;
	}

	// Check if the thread is closed
	if (persistObject.selectSingleNode(doc, doc, "//A[contains(@href,'action=newreply&threadid')]//IMG[contains(@src,'closed')]") == null)
	{
		var threadClosed = false;
	}
	else
	{
		var threadClosed = true;
	}

	// Replace post button
	if (persistObject.getPreference("useQuickQuote") && !inGasChamber)
	{
		var postbuttons = persistObject.selectNodes(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newthread')]");
		if (postbuttons.length > 0)
		{
			for (i in postbuttons)
			{
				attachQuickQuoteHandler(undefined,doc,persistObject.turnIntoQuickButton(doc, postbuttons[i], forumid),"",0);
			}
		}
		if (!threadClosed)
		{
			var replybuttons = persistObject.selectNodes(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newreply&threadid')]");
			if (replybuttons.length > 0)
			{
				for (i in replybuttons)
				{
					attachQuickQuoteHandler(threadid,doc,persistObject.turnIntoQuickButton(doc, replybuttons[i], forumid),"",0);
				}
			}
		}
	}

	if (persistObject.getPreference("replyCountLinkinThreads") && !singlePost)
	{
		var replyCountLink = doc.createElement("A");
		replyCountLink.href="javascript:void(window.open('misc.php?s=&action=whoposted&threadid=" + threadid + "#fromthread', 'whoposted', 'toolbar=no,scrollbars=yes,resizable=yes,width=230,height=200'))";
		replyCountLink.innerHTML = "Who posted?";
		replyCountLink.style.fontSize = "10px";
		replyCountLink.style.cssFloat = "left";
		replyCountLink.style.marginLeft = "8px";
		replyCountLink.style.color = "#FFFFFF";
		// Plug it in right after the "Search thread:" form
		var searchThis = persistObject.selectSingleNode(doc, doc, "//FORM[contains(@class,'threadsearch')]");
		if (searchThis)
		{
			searchThis.parentNode.insertBefore(replyCountLink,searchThis.nextSibling);
			searchThis.parentNode.insertBefore(doc.createTextNode(" "),searchThis.nextSibling);
		}
	}

	// get the posts to iterate through
	var postlist = persistObject.selectNodes(doc, doc, "//table[contains(@id,'post')]");

	var curPostId, colorDark = true, colorOfPost, postIdLink, resetLink, profileLink, posterId, postbody, postRow, f, linksUL, storeUserLink;
	var posterColor, posterBG, userNameBox, posterNote, posterImg, posterName, slink, quotebutton, editbutton, reportbutton;
	var userPosterColor, userPosterBG, userPosterNote, userQuote;

	// Group calls to the prefs up here so we aren't repeating them, should help speed things up a bit
	var hideEditButtons = persistObject.getPreference('hideEditButtons');
	var hideReportButtons = persistObject.getPreference('hideReportButtons');
	var useQuickQuote = persistObject.getPreference('useQuickQuote');
	var insertPostLastMarkLink = persistObject.getPreference("insertPostLastMarkLink");
	var insertPostTargetLink = persistObject.getPreference("insertPostTargetLink");
	var highlightUsernames = persistObject.getPreference("highlightUsernames");
	var dontHighlightPosts = persistObject.getPreference("dontHighlightPosts");
	var resizeCustomTitleText = persistObject.getPreference("resizeCustomTitleText");
	//post colors
	var seenPostDark = persistObject.getPreference("seenPostDark");
	var seenPostLight = persistObject.getPreference("seenPostLight");
	//standard user colors
	var modColor = persistObject.getPreference("modColor");
	var modBackground = persistObject.getPreference("modBackground");
	var modSubText = persistObject.getPreference("modSubText");
	var adminColor = persistObject.getPreference("adminColor");
	var adminBackground = persistObject.getPreference("adminBackground");
	var adminSubText = persistObject.getPreference("adminSubText");
	var opColor = persistObject.getPreference("opColor");
	var opBackground = persistObject.getPreference("opBackground");
	var opSubText = persistObject.getPreference("opSubText");

	doc.postlinks = new Array;

	// Loop through each post
	for (i in postlist)
	{
		var post = postlist[i];

		if (post.className.indexOf("ignored") > -1)
		{
			// User is ignored by the system so skip doing anything else
			continue;
		}

		curPostId = post.id.match(/post(\d+)/)[1];
		profileLink = persistObject.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//ul[contains(@class,'profilelinks')]//a[contains(@href,'userid=')]");
		posterId = profileLink.href.match(/userid=(\d+)/i)[1];
		if (!inFYAD)
		{
			userNameBox = persistObject.selectSingleNode(doc, post, "TBODY//TR/TD//DL//DT[contains(@class,'author')]");
		}
		else
		{
			userNameBox = persistObject.selectSingleNode(doc, post, "TBODY//DIV[contains(@class,'title')]//following-sibling::B");
		}
		titleBox = persistObject.selectSingleNode(doc, post, "tbody//dl[contains(@class,'userinfo')]//dd[contains(@class,'title')]");

		if (titleBox)
		{
			if (persistObject.isAvatarHidden(posterId))
			{
				// We hate this person's avatar and we want to banish it to the depths of Hell
				titleBox.style.display = "none";
			}
			else if (resizeCustomTitleText)
			{
				// Adds a scrollbar if they have a really wide custom title
				titleBox.style.overflow = "auto";
				titleBox.style.width = "159px";
				if (titleBox.getElementsByTagName('font').length > 0)
				{
					// They likely have a large, red custom title
					for(f = 0; f < titleBox.getElementsByTagName('font').length; f++)
					{
						titleBox.getElementsByTagName('font')[f].style.fontSize = "10px";
					}
				}
				// The new system uses spans but the old stuff hasn't been converted so both branches are needed
				if (titleBox.getElementsByTagName('span').length > 0)
				{
					// They likely have a large, red custom title
					for(f = 0; f < titleBox.getElementsByTagName('span').length; f++)
					{
						titleBox.getElementsByTagName('span')[f].style.fontSize = "10px";
					}
				}
			}
		}

		//Check to see if there's a mod or admin star
		posterImg = false;
		posterName = userNameBox.textContent.replace(/^\s+|\s+$/, '');
		if (userNameBox.getElementsByTagName('img').length > 0 && !inArchives)
		{
			posterImg = userNameBox.getElementsByTagName('img')[0].title;
			if (posterImg == 'Admin')
			{
				persistObject.addAdmin(posterId, posterName);
			}
			else if (posterImg == 'Moderator')
			{
				persistObject.addMod(posterId, posterName);
			}
		}

		posterColor = false;
		posterBG = false;
		posterNote = false;
		userPosterNote = false;

		//apply this to every post
		post.className += " salrPostBy" + posterId + " salrPostBy" + posterName;

		//apply custom user coloring
		if (userNameBox.className.search(/op/) > -1)
		{
			posterColor = opColor;
			posterBG = opBackground;
			posterNote = opSubText;
			post.className += " salrPostByOP";
		}
		if (persistObject.isMod(posterId))
		{
			if(posterImg == 'Moderator' || inArchives)
			{
				posterColor = modColor;
				posterBG = modBackground;
				posterNote = modSubText;
				post.className += " salrPostByMod";
			}
			else if (!inArchives)
			{
				persistObject.removeMod(posterId);
			}
		}
		if (persistObject.isAdmin(posterId))
		{
			if(posterImg == "Admin" || inArchives)
			{
				posterColor = adminColor;
				posterBG = adminBackground;
				posterNote = adminSubText;
				post.className += " salrPostByAdmin";
			}
			else if (!inArchives)
			{
				persistObject.removeAdmin(posterId);
			}
		}
		var dbUser = persistObject.isUserIdColored(posterId);
		if (dbUser)
		{
			if (!dbUser.username)
			{
				persistObject.setUserName(posterId, posterName);
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
			persistObject.colorPost(doc, posterBG, posterId);
		}

		// Check for quotes that need to be colored
		if (persistObject.getPreference('highlightQuotes'))
		{
			var userQuoted;
			var anyQuotes = persistObject.selectNodes(doc, post, "TBODY//TR/TD/DIV[contains(@class,'bbc-block')]");
			for (quote in anyQuotes)
			{
				userQuoted = anyQuotes[quote].textContent.match(/(.*) posted:/);
				if (userQuoted)
				{
					userQuoted = userQuoted[1];
					if (userQuoted == username)
					{
						anyQuotes[quote].className += ' salrQuoteOfSelf';
					}
					else
					{
						userQuotedDetails = persistObject.isUsernameColored(userQuoted);
						if (userQuotedDetails)
						{
							anyQuotes[quote].className += ' salrQuoteOf' + userQuotedDetails.userid;
							persistObject.colorQuote(doc, userQuotedDetails.background, userQuotedDetails.userid);
						}
					}
				}
			}
		}

		userPosterNote = persistObject.getPosterNotes(posterId);
		if (highlightUsernames && posterColor != false && posterColor != "0")
		{
			userNameBox.style.color = posterColor;
		}
		if (posterNote || userPosterNote)
		{
			newNoteBox = doc.createElement("p");
			newNoteBox.style.fontSize = "80%";
			newNoteBox.style.margin = "0";
			newNoteBox.style.padding = "0";
			newNoteBox.innerHTML = posterNote ? posterNote : '';
			newNoteBox.innerHTML += userPosterNote ? (((posterNote && userPosterNote) ? '<br />':'') + userPosterNote):'';
			userNameBox.appendChild(newNoteBox);
		}

		postIdLink = persistObject.selectSingleNode(doc, post, "tbody//td[contains(@class,'postdate')]//a[contains(@href,'#post')]");
		if (!postIdLink)
		{
			postIdLink = persistObject.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//a[contains(@href,'#post')]");
		}
		if (!postIdLink) continue;

		postid = postIdLink.href.match(/#post(\d+)/i)[1];
		if (insertPostTargetLink)
		{
			slink = doc.createElement("a");
			slink.href = "/showthread.php?action=showpost&postid="+postid+"&forumid="+forumid;
			slink.title = "Show Single Post";
			slink.innerHTML = "1";
			postIdLink.parentNode.insertBefore(slink, postIdLink);
			postIdLink.parentNode.insertBefore(doc.createTextNode(" "), postIdLink);
		}
		
		var userfilter = doc.location.href.match(/&userid=[0-9]+/);
		if (userfilter && postIdLink && postid)
		{
			// We are filtering this thread by userid, so lets change the ? link to take us back to this post in context
			var filterlink = persistObject.selectSingleNode(doc, postIdLink.parentNode, "A[contains(@href,'&userid=')]");
			if (filterlink)
			{
				filterlink.href = "?goto=post&postid=" + postid
			}
		}

		//grab this once up here to avoid repetition
		if (useQuickQuote || hideEditButtons)
		{
			editbutton = persistObject.selectSingleNode(doc, post, "tbody//ul[contains(@class,'postbuttons')]//li//a[contains(@href,'action=editpost')]");
		}

		if (hideEditButtons && editbutton)
		{
			if (posterName != username)
			{
				editbutton.parentNode.removeChild(editbutton);
				//so we don't try to add quickquote to non-existant edit buttons
				editbutton = null;
			}
		}

		if (useQuickQuote && !threadClosed)
		{
			quotebutton = persistObject.selectSingleNode(doc, post, "tbody//ul[contains(@class,'postbuttons')]//li//a[contains(@href,'action=newreply')]");
			if (quotebutton)
			{
				attachQuickQuoteHandler(threadid, doc, persistObject.turnIntoQuickButton(doc, quotebutton, forumid), posterName, 1, postid);
			}
			if (editbutton)
			{
				attachQuickQuoteHandler(threadid, doc, persistObject.turnIntoQuickButton(doc, editbutton, forumid), posterName, 1, postid, true);
			}
		}

		if (hideReportButtons)
		{
			if (posterName == username)
			{
				reportbutton = persistObject.selectSingleNode(doc, post, "tbody//ul[contains(@class,'postbuttons')]//li//a[contains(@href,'modalert.php')]");
				if(reportbutton)
				{
					reportbutton.parentNode.removeChild(reportbutton);
				}
			}
		}
		
		var userLinks = profileLink.parentNode.parentNode;

		// Add a link to the user's ban history
		var banHistLink = doc.createElement("li");
		var banHistAnchor = doc.createElement("a");
		banHistAnchor.href = "/banlist.php?userid=" + posterId;
		banHistAnchor.title = "Show poster's ban/probation history.";
		banHistAnchor.innerHTML = "Ban History";
		banHistLink.appendChild(banHistAnchor);
		userLinks.appendChild(doc.createTextNode(" "));
		userLinks.appendChild(banHistLink);

		// Add user coloring/note links
		if (highlightUsernames)
		{
			var li = doc.createElement("li");
			var a = doc.createElement("a");
			a.id = curPostId + "_" + posterId;
			a.href ="#" + posterName;
			a.innerHTML = "Add Coloring/Note";
			a.onclick = addHighlightedUser;
			li.appendChild(a);
			userLinks.appendChild(doc.createTextNode(" "));
			userLinks.appendChild(li);
		}
		
		// Add a link to hide/unhide the user's avatar
		var avLink = doc.createElement("li");
		var avAnch = doc.createElement("a");
		avAnch.href = "#ToggleAvatar#" + posterId + "#" + posterName;
		avAnch.title = "Toggle displaying this poster's avatar.";
		if (persistObject.isAvatarHidden(posterId))
		{
			avAnch.innerHTML = "Show Avatar";
		}
		else
		{
			avAnch.innerHTML = "Hide Avatar";
		}
		avAnch.addEventListener("click", clickToggleAvatar, false);
		avLink.appendChild(avAnch);
		userLinks.appendChild(doc.createTextNode(" "));
		userLinks.appendChild(avLink);

		postbody = persistObject.selectSingleNode(doc, post, "TBODY//TD[contains(@class,'postbody')]");
		persistObject.convertSpecialLinks(postbody, doc);
		persistObject.processImages(postbody, doc);
	}

	if (persistObject.getPreference('reanchorThreadOnLoad'))
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
	doc.__salastread_loading = true;
	window.addEventListener("load", SALR_PageFinishedLoading, true);

}

function handleEditPost(doc)
{
	var submitbtn = persistObject.selectNodes(doc, doc.body, "//INPUT[@type='submit'][@value='Save Changes']")[0];
	var tarea = persistObject.selectNodes(doc, doc.body, "//TEXTAREA[@name='message']")[0];
	if (submitbtn && tarea) {
		submitbtn.addEventListener("click", function() { parsePLTagsInEdit(tarea); }, true);
		submitbtn.style.backgroundColor = persistObject.getPreference('postedInThreadRe');
	}
}

function handleNewReply(doc)
{
	var threadlink = persistObject.selectSingleNode(doc, doc.body, "DIV[contains(@id, 'container')]/TABLE[1]/TBODY[1]/TR[1]/TD[1]/SPAN[1]/B/A[contains(@href,'showthread.php')][contains(@href,'threadid=')]");
	if (threadlink)
	{
		var tlmatch = threadlink.href.match( /threadid=(\d+)/ );
		if ( tlmatch )
		{
			var threadid = tlmatch[1];
			if ( salastread_needRegReplyFill )
			{
				var msgEl = persistObject.selectSingleNode(doc, doc.body, "//TEXTAREA[@name='message']");
				if (msgEl)
				{
					msgEl.value = salastread_savedQuickReply;
				}
				salastread_needRegReplyFill = false;
			}
			var postbtn = persistObject.selectNodes(doc, doc.body, "//FORM[@name='vbform'][contains(@action,'newreply.php')]//INPUT[@type='submit'][@name='submit']")[0];
			if (postbtn) {
				postbtn.addEventListener("click", function() { markThreadReplied(threadid); }, true);
				postbtn.style.backgroundColor = persistObject.getPreference('postedInThreadRe');
			}
		}
	}
	else
	{
		if (salastread_savedQuickReply!="")
		{
			var forgeCheck = persistObject.selectSingleNode(doc, doc.body, "TABLE/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[2]/TD[1]/FONT[contains(text(),'have been forged')]");
			if (forgeCheck)
			{
				persistObject.__cachedFormKey = "";
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
				regReplyLink.onclick = setRegReplyFillOn;
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
}

function handleIndex(doc)
{
	if (persistObject.getPreference("username") == '')
	{
		var username = persistObject.selectSingleNode(doc,doc,"//div[contains(@class, 'mainbodytextsmall')]//b");
		username = escape(username.textContent);
		persistObject.setPreference("username", username);
	}
}

function handleAccount(doc)
{
	var action;
	if ((action = doc.location.search.match(/action=(\w+)/i)) != null)
	{
		if (action[1] == "logout")
		{
			persistObject.setPreference("username", '');
			persistObject.setPreference("userId", 0);
		}
	}
	else
	{
		// There is no action specified, we may be logging in
		var div = doc.getElementById("main_wide");
		if (div)
		{
			var loginMsg = persistObject.selectSingleNode(doc, div, "DIV[contains(./text(),'GLUE')]");
			if (loginMsg)
			{
				var name = loginMsg.firstChild.textContent.match(/GLUE GLUEEEEE GLUUUUUUEEE, (.*)!  GLUUUEEE/);
				// Note that there are 2 spaces after the !, the extra space doesn't show up on the page but it's in the raw HTML
				if (name)
				{
					name = name[1];
					persistObject.setPreference("username", name);
				}
			}
		}
	}
}

function handleMisc(doc)
{
	var action;
	if ((action = doc.location.search.match(/action=(\w+)/i)) != null)
	{
		// Handle the "Who posted?" list window
		if (action[1] == "whoposted")
		{
			var posterTable = persistObject.selectSingleNode(doc,doc,"//DIV[@id='main_stretch']/DIV/TABLE/TBODY");
			var threadId = parseInt(doc.location.search.match(/threadid=(\d+)/i)[1], 10);
			if (posterTable && threadId)
			{
				var highlightUsernames = persistObject.getPreference("highlightUsernames");
				var sortReplyList = persistObject.getPreference("sortReplyList");

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
				var rows = persistObject.selectNodes(doc, posterTable, "TR");
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

						if (persistObject.isMod(posterId))
						{
							userPriority = 1;
						}
						if (persistObject.isAdmin(posterId))
						{
							userPriority = 2;
						}

						// Check for user-defined name coloring and/or mod/admin coloring
						if (highlightUsernames)
						{
							var userColoring = persistObject.isUserIdColored(posterId);
							if (userColoring)
							{
								if (userColoring.color && userColoring.color != "0")
								{
									row.childNodes[1].firstChild.style.color = userColoring.color;
									if (!persistObject.getPreference("dontBoldNames"))
									{
										row.childNodes[1].firstChild.style.fontWeight = "bold";
									}
								}

								userPriority = 3;
							}
							else if (userPriority == 1)
							{
								row.childNodes[1].firstChild.style.color = persistObject.getPreference("modColor");
								if (!persistObject.getPreference("dontBoldNames"))
								{
									row.childNodes[1].firstChild.style.fontWeight = "bold";
								}
							}
							else if (userPriority == 2)
							{
								row.childNodes[1].firstChild.style.color = persistObject.getPreference("adminColor");
								if (!persistObject.getPreference("dontBoldNames"))
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
					var closeLink = persistObject.selectSingleNode(doc, doc, "//A[contains(./text(),'show thread')]");
					closeLink.parentNode.innerHTML = "<a style=\"color: rgb(255, 255, 255) ! important;\" onclick=\"self.close();\" href=\"#\">" + closeLink.innerHTML + "</a>";
				}
			}
		}
	}
}

function handleSupport(doc)
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
	newLink.href = "https://salr.bountysource.com/development";
	newLink.innerHTML = "Click here to report a problem with SA Last Read instead";
	var supportTable = doc.getElementById('content').getElementsByTagName('div')[1];
	supportTable.parentNode.replaceChild(newImg, supportTable);
	newImg.parentNode.appendChild(newText);
	newImg.parentNode.appendChild(emptyP);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Utility Functions ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function showChangelogWindow()
{
	openDialog("chrome://salastread/content/newfeatures/newfeatures.xul", "SALR_newfeatures", "chrome,centerscreen,dialog=no");
}

function markThreadReplied(threadid)
{
	persistObject.iPostedHere(threadid);
}

function SALR_insertConfigLink(doc)
{
	var usercpnode = persistObject.selectSingleNode(doc, doc.body, "//UL[@id='navigation']/LI/A[contains(@href,'usercp.php')]");
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
		newlink.addEventListener("click", SALR_runConfig, true);
	}
}

function SALR_getPageTitle(doc)
{
	if (doc.title == "The Something Awful Forums")
	{
		return doc.title;
	}
	return doc.title.replace(/( \- )?The Something ?Awful Forums( \- )?/i, '');
}

function setRegReplyFillOn()
{
	salastread_needRegReplyFill = true;
}

function SALR_runConfig(page, args)
{
	//check a pref so the dialog has the proper constructor arguments
	var pref = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefBranch);

    var instantApply = pref.getBoolPref("browser.preferences.instantApply");
	var features = "chrome,titlebar,toolbar,centerscreen,resizable" + (instantApply ? ",dialog=no" : ",modal");

	openDialog("chrome://salastread/content/pref.xul", "Preferences", features, page, { "args" : args });
}

function addInternalDebugLog(msg)
{
	SALR_debugLog.push( (new Date()).toString() +": "+msg );
	if ( SALR_debugLog.length > 10 )
	{
		SALR_debugLog.shift();
	}
}

//add a user to the highlighting/note section by clicking on a post link
function addHighlightedUser(e)
{
	e.stopPropagation();
	e.preventDefault();

	var link = e.originalTarget;
	var userid = link.id.split("_")[1];
	var username = link.href.split("#")[1];

	SALR_runConfig('users', { "action" : "addUser", "userid" : userid, "username" : username });
}

// Function called by the onclick of the button that shows up for starred and archived threads
function unstarButtonPress(e)
{
	var archivedUnstarButtonInput = e.originalTarget;
	persistObject.toggleThreadStar(archivedUnstarButtonInput.id);
	archivedUnstarButtonInput.parentNode.parentNode.parentNode.removeChild(archivedUnstarButtonInput.parentNode.parentNode);
}

function SALR_IncTimer()
{
   SALR_PageTimerCount++;
}

function SALR_DecTimer()
{
   SALR_PageTimerCount--;
}

function SALR_TimerTick()
{
   if ( SALR_PageTimerCount > 0 && persistObject )
   {
      persistObject.PingTimer();
   }
}

function convertPLTag(message)
{
   return message.replace(/\[PL=(.*?)\](.*?)\[\/PL\]/g,"[URL=http://forums.somethingawful.com/showthread.php?s=&postid=$1#post$1]$2[/URL]");
}

function parsePLTagsInEdit(tarea)
{
   var xtxt = tarea.value;
   tarea.value = convertPLTag(xtxt);
}

function removeThread(evt) {
	var threadid = this.id.match(/unread_(\d+)/)[1];

	persistObject.removeThread(threadid);

	//head up from the link: div.newposts, div.title_links, div.title_rel, td.title, tr.thread
	var tr = this.parentNode.parentNode.parentNode.parentNode.parentNode;

	for (var i = 0; i < tr.childNodes.length;i++)
	{
		var node = tr.childNodes[i];
		if (node.nodeName != "#text")
		{
			node.style.backgroundColor = "";
			node.style.backgroundImage = "";
			node.style.backgroundRepeat = "";

			if(node.className == "replies")
			{
				node.innerHTML = node.innerHTML.replace(/\s\(\d+\)/i, "");
			}
		}
	}

	//remove div.newposts from div.title
	this.parentNode.parentNode.removeChild(this.parentNode);
}

// Event catcher for clicking on the Mark Unseen box
function clickMarkUnseen()
{
	var doc = this.ownerDocument;
	var thread = this.parentNode.parentNode.parentNode;
	var threadRepliesBox = persistObject.selectSingleNode(doc, thread, "TD[contains(@class, 'replies')]");

	// Remove the new replies count
	if (!persistObject.getPreference("disableNewReCount") && thread.className.search(/newposts/i) > -1)
	{
		while (threadRepliesBox.childNodes[1])
		{
			// Delete everything but the original link
			threadRepliesBox.removeChild(threadRepliesBox.childNodes[1]);
		}
	}
}

// Event catcher for clicking the "Hide Avatar" or "Unhide Avatar" links
function clickToggleAvatar()
{
	var doc = this.ownerDocument;
	var idToToggle = this.href.match(/\#ToggleAvatar\#(\d+)\#(.*)$/)[1];
	var nameToToggle = this.href.match(/\#ToggleAvatar\#(\d+)\#(.*)$/)[2];
	var alreadyHidden = persistObject.isAvatarHidden(idToToggle);
	var posts = persistObject.selectNodes(doc, doc, "//table[contains(@id,'post')]");
	var post, profileLink, posterId, titleBox, toggleLink;

	for (n in posts)
	{
		post = posts[n];
		profileLink = persistObject.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//ul[contains(@class,'profilelinks')]//a[contains(@href,'userid=')]");
		posterId = profileLink.href.match(/userid=(\d+)/i)[1];
		if (posterId == idToToggle)
		{
			titleBox = persistObject.selectSingleNode(doc, post, "tbody//dl[contains(@class,'userinfo')]//dd[contains(@class,'title')]");
			toggleLink = persistObject.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//a[contains(@href,'#ToggleAvatar#')]");
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
	persistObject.toggleAvatarHidden(idToToggle, nameToToggle);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CSS & Formatting Functions //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function handleBodyClassing(doc)
{
	var docbody = doc.body;
	var addclass = " somethingawfulforum";
	var phmatch = doc.location.href.match( /\/([^\/]*)\.php/ );
	if (phmatch)
	{
		addclass += " somethingawfulforum_"+phmatch[1]+"_php";
	}
	docbody.className += addclass;
}

function SALR_insertCSS(doc, url)
{
	var stylesheet = doc.createElement("link");
	stylesheet.rel = "stylesheet";
	stylesheet.type = "text/css";
	stylesheet.href = url;
	doc.getElementsByTagName('head')[0].appendChild(stylesheet);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Quick Quote/Post/Edit/Whatever Functions ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function attachQuickQuoteHandler(threadid,doc,quotebutton,postername,hasQuote,postid,isedit)
{
   quotebutton.__salastread_threadid = threadid;
   quotebutton.__salastread_postid = postid;
   quotebutton.__salastread_postername = postername;
   quotebutton.__salastread_hasQuote = hasQuote;
   if (isedit != undefined)
   {
		quotebutton.is_edit = true;
   }
   quotebutton.addEventListener("click", quickQuoteButtonClick, true);
}

function quickQuoteButtonClick(evt)
{
	var doc = evt.originalTarget.ownerDocument;
	var quotebutton = evt.originalTarget;
	var threadid = quotebutton.__salastread_threadid;
	var forumid = quotebutton.SALR_forumid;
	var postername = quotebutton.__salastread_postername;
	var hasQuote = quotebutton.__salastread_hasQuote;
	var is_edit = quotebutton.is_edit;

	if(persistObject.__QuickQuoteWindowObject && !persistObject.__QuickQuoteWindowObject.closed)
	{
		quickquotewin = persistObject.__QuickQuoteWindowObject;
	}

	window.__salastread_quotedoc = doc;

	//button pressed on a post (quote/edit)
	if(hasQuote)
	{
		window.__salastread_quotepostid = quotebutton.__salastread_postid;
	}
	else
	{
		window.__salastread_quotetext = "";
		window.__salastread_quotepostid = null;
	}

	//Has this person already posted in this thread?
	window.__salastread_alreadypostedinthread = persistObject.didIPostHere(threadid);

	//Has this person already bookmarked this thread?
	//Check for the bookmark/unbookmark button
	bookmarkbutton = persistObject.selectSingleNode(doc,doc,"//ul[contains(@class, 'postbuttons')]//a[contains(@href, 'action=remove')]");
	if (bookmarkbutton)
	{
	  window.__salastread_bookmarked = true;
	}
	else
	{
	  window.__salastread_bookmarked = false;
	}

	window.__salastread_quotethreadid = threadid;

	if(quickquotewin && !quickquotewin.closed)
	{
		try
		{
			//try to re-add the quote in case the quickquote window's attachment was lost
			if(hasQuote)
			{
				quickquotewin.addQuoteFromPost(window.__salastread_quotepostid);
			}
			quickquotewin.focus();
		}
		catch(ex)
		{
			quickquotewin = window.open("chrome://salastread/content/quickquote.xul", "quickquote", "chrome, resizable=yes, width=800, height=400");
		}
	}
	else
	{
		quickquotewin = window.open("chrome://salastread/content/quickquote.xul", "quickquote", "chrome, resizable=yes, width=800, height=400");
	}

	if (quickquotewin)
	{
		persistObject.__QuickQuoteWindowObject = quickquotewin;
		quickquotewin.__salastread_quickpost_forumid = forumid;
		quickquotewin.__salastread_is_edit = is_edit;
	}

	return false;
}

function quickQuoteSubmit(message, parseurl, subscribe, disablesmilies, signature, subtype, formkey, attachfile)
{
	try
	{
		message = convertPLTag(message);
		salastread_savedQuickReply = message;
		salastread_savedQuickReplyThreadId = window.__salastread_quotethreadid;

		var doc = window.__salastread_quotedoc;
		var newform = doc.createElement("FORM");
			newform.style.display = "none";
			newform.action = "http://forums.somethingawful.com/newreply.php";

		if(!window.__salastread_quotethreadid)
		{
			newform.action = "http://forums.somethingawful.com/newthread.php";
		}

		if (quickquotewin.__salastread_is_edit)
		{
			newform.action = "http://forums.somethingawful.com/editpost.php";
		}

		newform.method = "post";
		newform.enctype = "multipart/form-data";
		quickQuoteAddHidden(doc,newform,"s","");
		if(window.__salastread_quotethreadid)
		{
			if(quickquotewin.__salastread_is_edit)
			{
				quickQuoteAddHidden(doc, newform,"action", "updatepost");
				quickQuoteAddHidden(doc, newform, "postid", window.__salastread_quotepostid);
			}
			else
			{
				quickQuoteAddHidden(doc, newform,"action", "postreply");
				quickQuoteAddHidden(doc, newform,"threadid", window.__salastread_quotethreadid);
			}
		}
		else
		{
			quickQuoteAddHidden(doc, newform,"action", "postthread");
			quickQuoteAddHidden(doc, newform, "forumid",  quickquotewin.__salastread_quickpost_forumid);
			quickQuoteAddHidden(doc, newform, "iconid", quickquotewin.document.getElementById('posticonbutton').iconid);
			quickQuoteAddHidden(doc, newform, "subject", quickquotewin.document.getElementById('subject').value);
		}

		quickQuoteAddHidden(doc, newform,"parseurl", parseurl ? "yes" : "");
		quickQuoteAddHidden(doc, newform,"bookmark", subscribe ? "yes" : "");
		quickQuoteAddHidden(doc, newform,"disablesmilies", disablesmilies ? "yes" : "");
		quickQuoteAddHidden(doc, newform,"signature", signature ? "yes" : "");
		quickQuoteAddHidden(doc, newform,"message", message);
		quickQuoteAddHidden(doc, newform,"MAX_FILE_SIZE", "2097152");
		quickQuoteAddHidden(doc, newform,"formkey", formkey);

		if (attachfile!="")
		{
			quickQuoteAddFile(doc, newform,"attachment", attachfile);
		}
		newform.__submit = newform.submit;

		if (window.__salastread_quotethreadid)
		{
			if (subtype=="submit")
			{
				quickQuoteAddHidden(doc,newform,"submit","Submit Reply");
				markThreadReplied(window.__salastread_quotethreadid);
			}
			else
			{
				quickQuoteAddHidden(doc,newform,"preview","Preview Reply");
			}
		}
		else
		{
			quickQuoteAddHidden(doc,newform,"preview","Preview Post");
		}
		doc.body.appendChild(newform);
		quickQuoteSubmitting = true;
		newform.__submit();
		quickquotewin.close();
	}
	catch(e)
	{
		alert("err: " + e);
	}
}

function quickQuoteAddHidden(doc,form,name,value)
{
   var newel = doc.createElement("INPUT");
   newel.type = "hidden";
   newel.name = name;
   newel.value = value;
   form.appendChild(newel);
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
   quickquotewin.close();
}

function releaseQuickQuoteVars()
{
   window.__salastread_quotedoc = null;
   window.__salastread_quotetext = null;
   window.__salastread_quotethreadid = null;
   window.__salastread_quotepostid = null;
   window.__salastread_bookmarked = null;
   window.__salastread_alreadypostedinthread = null;
   window.__salastread_needretrieval = null;
   quickQuoteSubmitting = false;
   quickquotewin = null;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Navbar & Mouse Gesture Functions ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function SALR_DirectionalNavigate(doc, dir)
{
	var urlbase = doc.location.href.match(/.*\.somethingawful\.com/);
	var curPage = doc.__SALR_curPage;
	var perpage = "&perpage=" + persistObject.getPreference("postsPerPage");
	var forumid = doc.location.href.match(/forumid=[0-9]+/);
	var posticon = doc.location.href.match(/posticon=[0-9]+/);
	if (!posticon)
	{
		posticon = "&posticon=0";
	}
	var sortfield = doc.location.href.match(/&sortfield=[a-zA-Z0-9]+/);
	if (!sortfield)
	{
		sortfield = "&sortfield=lastpost";
	}
	var sortorder = doc.location.href.match(/&sortorder=[a-z]+/);
	if (!sortorder)
	{
		sortorder = "&sortorder=desc";
	}
	var daysprune = doc.location.href.match(/&daysprune=[0-9]+/);
	if (!daysprune)
	{
		daysprune = "&daysprune=30";
	}
	var userfilter = doc.location.href.match(/&userid=[0-9]+/);
	if (!userfilter)
	{
		userfilter = "";
	}

	if (dir == "top")
	{
		var threadForum = doc.__SALR_forumid;

		if(curPage == 1 && !threadForum)
		{
			doc.location = urlbase + "/index.php";
		}
		else
		{
			if (threadForum)
			{
				doc.location = urlbase + "/forumdisplay.php?s=&forumid=" + threadForum;
			}
			else
			{
				doc.location = urlbase + "/forumdisplay.php?s=&" + forumid + posticon;
			}
		}
	}
	else if (dir == "left")
	{
		if (curPage > 1)
		{
			var threadid = doc.__SALR_threadid;
			if (threadid)
			{
				doc.location = urlbase + "/showthread.php?s=&threadid=" + threadid + userfilter + perpage + "&pagenumber=" + (curPage - 1);
			}
			else
			{
				doc.location = urlbase + "/forumdisplay.php?" + forumid + daysprune + sortorder + sortfield + perpage + posticon + "&pagenumber=" + (curPage - 1);
			}
		}
	}
	else if (dir == "right")
	{
		var maxPage = doc.__SALR_maxPage;
		if (maxPage > curPage)
		{
			var threadid = doc.__SALR_threadid;
			if (threadid)
			{
				doc.location = urlbase + "/showthread.php?s=&threadid=" + threadid + userfilter + perpage + "&pagenumber=" + (curPage + 1);
			}
			else
			{
				doc.location = urlbase + "/forumdisplay.php?" + forumid + daysprune + sortorder + sortfield + perpage + posticon + "&pagenumber=" + (curPage + 1);
			}
		}
	}
}

function SALR_PageMouseUp(event)
{
	var targ = event.target;
	var doc = targ.ownerDocument;
	if (targ && targ.SALR_isGestureElement == true)
	{
		doc.body.addEventListener('contextmenu', SALR_GestureContextMenu, false);
		SALR_DirectionalNavigate(doc, targ.SALR_dir);
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
}

function SALR_GestureContextMenu(event)
{
	var targ = event.target;
	var doc = targ.ownerDocument;
		doc.body.removeEventListener('contextmenu', SALR_GestureContextMenu, false);
	if (event.preventDefault)
	{
		event.preventDefault();
	}
	return false;
}

function SALR_PageMouseDown(event)
{
	var doc = event.target.ownerDocument;
	var gn = doc.getElementById("salastread_gesturenavtop");
	if (gn)
	{
		return;
	}
	if (event.button == persistObject.getPreference('gestureButton') && persistObject.getPreference('gestureEnable'))
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
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Context Menu Functions //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function SALR_ShowContextMenuItem(id)
{
	var cacm = document.getElementById("contentAreaContextMenu");
	var mopt = document.getElementById("salastread-context-menu");
	var moptsep = document.getElementById("salastread-context-menuseparator");

	cacm.removeChild(mopt);
	cacm.removeChild(moptsep);

	if(persistObject.getPreference('contextMenuOnBottom') )
	{
		cacm.appendChild(moptsep);
		cacm.appendChild(mopt);
	}
	else
	{
		cacm.insertBefore(moptsep, cacm.firstChild);
		cacm.insertBefore(mopt, moptsep);
	}

	document.getElementById(id).style.display = "-moz-box";
	mopt.style.display = "-moz-box";
	moptsep.style.display = "-moz-box";
}

function SALR_HideContextMenuItems()
{
	document.getElementById("salastread-context-menu").style.display = "none";
	document.getElementById("salastread-context-menuseparator").style.display = "none";
	var pu = document.getElementById("salastread-context-menupopup");
	for (var i=0; i < pu.childNodes.length; i++)
	{
		pu.childNodes[i].style.display = "none";
		pu.childNodes[i].data = "";
	}
}

function SALR_ContextMenuShowing(e)
{
	if(e.originalTarget == document.getElementById("contentAreaContextMenu"))
	{
		SALR_HideContextMenuItems();
		try
		{

			var doc = document.getElementById("content").mCurrentBrowser.contentDocument;
			if (doc.wrappedJSObject) //FF3 fix
				doc = doc.wrappedJSObject; 

			if(doc.__salastread_processed == true)
			{
				SALR_ContextVis_IgnoreThisThread(doc);
				SALR_ContextVis_StarThisThread(doc);
			}
		}
		catch (e)
		{

		}
	}
}

function SALR_ContextVis_IgnoreThisThread(doc)
{
	var target = gContextMenu.target;
	var threadid = null;
	while (target) {
		if (target.className)
		{
			var tidmatch = target.className.match(/salastread_thread_(\d+)/);
			if (tidmatch)
			{
				threadid = tidmatch[1];

				SALR_ShowContextMenuItem("salastread-context-ignorethread");
				document.getElementById("salastread-context-ignorethread").data = threadid;
				document.getElementById("salastread-context-ignorethread").lpdtvalue = target.lpdtvalue;
				document.getElementById("salastread-context-ignorethread").target = target;
				document.getElementById("salastread-context-ignorethread").label = "Ignore This Thread (" + threadid + ")";
			}
		}

		target = target.parentNode;
	}
}

function SALR_ContextVis_StarThisThread(doc)
{
	var target = gContextMenu.target;
	var threadid = null;
	while (target)
	{
		if(target.className)
		{
			var tidmatch = target.className.match(/salastread_thread_(\d+)/);
			if (tidmatch)
			{
				threadid = tidmatch[1];
				SALR_ShowContextMenuItem("salastread-context-starthread");
				document.getElementById("salastread-context-starthread").data = threadid;
				document.getElementById("salastread-context-starthread").lpdtvalue = target.lpdtvalue;
				document.getElementById("salastread-context-starthread").target = target;

				document.getElementById("salastread-context-starthread").label = (persistObject.isThreadStarred(threadid) ? 'Unstar' : 'Star') + " This Thread (" + threadid + ")";
			}
		}
		target = target.parentNode;
	}
}

function SALR_StarThread()
{
	var threadid = document.getElementById("salastread-context-starthread").data;
	var lpdtvalue = document.getElementById("salastread-context-starthread").lpdtvalue;
	var target = document.getElementById("salastread-context-starthread").target;
	if (threadid)
	{
		var starStatus = persistObject.isThreadStarred(threadid);
		persistObject.toggleThreadStar(threadid);

		if (target.ownerDocument.location.href.search(/showthread.php/i) == -1)
		{
			target.ownerDocument.location = target.ownerDocument.location;
		}
		else
		{
			var startext = starStatus ? "unstarred" : "starred";
			alert("This thread is now " + startext + ".");
		}
	}
}

function SALR_IgnoreThread()
{
	var threadid = document.getElementById("salastread-context-ignorethread").data;
	var lpdtvalue = document.getElementById("salastread-context-ignorethread").lpdtvalue;
	var target = document.getElementById("salastread-context-ignorethread").target;
	if (threadid)
	{
		if (confirm("Are you sure you want to ignore thread #"+threadid+"?"))
		{
			var ignoreStatus = persistObject.isThreadIgnored(threadid);
			persistObject.toggleThreadIgnore(threadid);
			// todo: detect by if there is a "forum" node, to cover bookmark page and control panel
			if (target.ownerDocument.location.href.search(/showthread.php/i) == -1)
			{
				target.parentNode.removeChild(target);
			}
		}
	}
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
		SALR_menuItemGoTo(event,"http://forums.somethingawful.com/forumdisplay.php?s=&forumid="+el.getAttribute("forumnum"),target);
	}
}

function SALR_menuItemCommandGoToLastPost(event, el, etype, threadid)
{
	if (event.ctrlKey == true && event.shiftKey == true)
	{
		if (confirm("Do you want to unstar thread \"" + persistObject.getThreadTitle(threadid) + "\"?"))
		{
			persistObject.toggleThreadStar(threadid);
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

	if(etype=="command")
	{
		target = "current";
	}
	if(etype=="click")
	{
		if(event.button == 0)
		{
			target = "current";
		}
		else if(event.button == 2 || event.button == 1)
		{
			target = "newtab";
		}
	}

	var targeturl = "";
	if(typeof(el) == "string")
	{
		targeturl = el;
	}
	else
	{
		targeturl = el.getAttribute("targeturl");
	}

	if(target != "none")
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
		loadURI(url);
	}
}

function grabForumList(doc)
{
	var rowList = persistObject.selectNodes(doc, doc, "//select[@name='forumid']/option");
	var oDomParser = new DOMParser();
	var forumsDoc = oDomParser.parseFromString("<?xml version=\"1.0\"?>\n<forumlist></forumlist>", "text/xml");
	var targetEl = forumsDoc.documentElement;

	var forumsEl = forumsDoc.createElement("forums");
	forumsDoc.documentElement.appendChild(forumsEl);
	forumsDoc.documentElement.insertBefore(forumsDoc.createTextNode("\n"), forumsEl);

	for (var i=0; i < rowList.length; )
	{
		i = addForums(forumsDoc, rowList, i, forumsEl, 0);
	}

	persistObject.forumListXml = forumsDoc;
	if (persistObject.getPreference('showSAForumMenu'))
	{
		SALR_buildForumMenu();
	}
}

function addForums(forumsDoc, rowList, index, parentEl, depth)
{
	var thisEl = rowList[index];
	var forumTitle = thisEl.firstChild.nodeValue;
	var forumId = thisEl.getAttribute("value");

	forumId = parseInt(forumId);
	if (isNaN(forumId) || forumId < 0)
	{
		return index+1;
	}

	var elDepth = 0;
	while (true)
	{
		if(forumTitle.indexOf("--") != 0)
		{
			break;
		}

		forumTitle = forumTitle.substring(2);
		elDepth++;
	}
	forumTitle = forumTitle.replace(/^\s+|\s+$/g,"");
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
		var i = addForums(forumsDoc, rowList, index, fel, depth+1);

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

   var forums, foundforums = false
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
				if(persistObject.getPreference('useSAForumMenuBackground')) {
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

function SALR_buildForumMenu()
{
	// If there are any other SA menus, hide them.  Why? Who knows
	if (persistObject.getPreference('hideOtherSAMenus'))
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
		var iBefore = document.getElementById("bookmarks-menu");
		if (iBefore)
		{
			iBefore = iBefore.nextSibling;
		}
		else
		{
			iBefore = document.getElementById("main-menubar").lastChild;
		}
		var salrMenu = document.createElement("menu");
		salrMenu.id = "salr-menu";
		salrMenu.setAttribute("label", "SA");
		salrMenu.setAttribute("accesskey", persistObject.getPreference('menuAccessKey'));
		salrMenu.style.display = "none";
		menupopup = document.createElement("menupopup");
		menupopup.id = "menupopup_SAforums";
		menupopup.className = "lastread_menu";
		salrMenu.appendChild(menupopup);
		document.getElementById("main-menubar").insertBefore(salrMenu, iBefore);
		menupopup.addEventListener("popupshowing", SALR_SAMenuShowing, false);
	}

	if (persistObject.getPreference('useSAForumMenuBackground'))
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
	var forumsDoc = persistObject.forumListXml;
	var nested_menus = persistObject.getPreference('nestSAForumMenu');
	var salrMenu = document.createElement("menuitem");
	var pinnedForumNumbers = new Array();
	var pinnedForumElements = new Array();
	if (nested_menus && persistObject.getPreference('menuPinnedForums')) {
		pinnedForumNumbers = persistObject.getPreference('menuPinnedForums').split(",");
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
	lsalrMenu.setAttribute("oncommand", "SALR_runConfig('command');");

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
						salrMenu.setAttribute("label", persistObject.UnescapeMenuURL(umatch[1]));
						salrMenu.setAttribute("targeturl", persistObject.UnescapeMenuURL(umatch[2]));
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

		if(persistObject.getPreference('showMenuPinHelper')) {
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

function SALR_StarredThreadMenuShowing() {
	var menupopup = document.getElementById("salr_starredthreadmenupopup");
	while (menupopup.firstChild != null) {
		menupopup.removeChild(menupopup.firstChild);
	}
	var starred = persistObject.starList;

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
			menuel.setAttribute("label", "No have no threads starred.");
			menuel.setAttribute("disabled", "true");
		menupopup.appendChild(menuel);
	}
}

function SALR_SAMenuShowing() {
   if ( persistObject.getPreference('showMenuPinHelper') == false ) {
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
   persistObject.setPreference('showMenuPinHelper', false);

   SALR_runConfig("menu");
   alert("You may return to the menu settings at any time by choosing \"Configure SALastRead...\" from the SA menu, or by "+
         "clicking the \"Configure Last Read Extension\" link in the header of any forum page.");
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Advanced Thread Filtering Functions /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function rebuildFilterBox(doc)
{
	var afHidden = doc.getElementById("tags_hidden");
	var afMain = doc.getElementById("tags_showing");
	var afObject, afObject2; // Temp object storage for things that really only get handled once

	if (afHidden)
	{
		afObject = persistObject.selectSingleNode(doc, afHidden, "B");
		afObject.innerHTML = "Advanced thread filtering";
		afObject2 = doc.createElement("div");
		afObject2.id = "filteredthreadcount1";
		afObject2.style.fontSize = "80%";
		afObject2.style.fontWeight = "normal";
		afObject2.style.marginLeft = "6px";
		afObject2.appendChild(doc.createTextNode("(Currently ignoring "));
		afObject2.appendChild(doc.createTextNode("0"));
		afObject2.appendChild(doc.createTextNode(" threads.)"));
		persistObject.toggleVisibility(afObject2,true);
		afObject.appendChild(afObject2);
	}
	if (afMain) // Incoming wall of text
	{
		var afMainIcons, afIgnoredIcons, afIgnoredKeywords;
		var prefIgnoredPostIcons = persistObject.getPreference("ignoredPostIcons");
		var prefIgnoredKeywords = persistObject.getPreference("ignoredKeywords");

		afObject = persistObject.selectSingleNode(doc, afMain, "B");
		afObject.innerHTML = "Advanced thread filtering";
		afObject2 = doc.createElement("div");
		afObject2.id = "filteredthreadcount2";
		afObject2.style.fontSize = "80%";
		afObject2.style.fontWeight = "normal";
		afObject2.style.marginLeft = "6px";
		afObject2.appendChild(doc.createTextNode("(Currently ignoring "));
		afObject2.appendChild(doc.createTextNode("0"));
		afObject2.appendChild(doc.createTextNode(" threads.)"));
		persistObject.toggleVisibility(afObject2,true);
		afObject.appendChild(afObject2);
		afObject.appendChild(doc.createElement("br"));

		afMainIcons = doc.getElementById("filtericons");
		// Plug a bunch of stuff in before the main icon list
		afMain.insertBefore(doc.createTextNode("Show only this icon: ("), afMainIcons);
		afObject = persistObject.selectSingleNode(doc, afMain, "A[contains(@href,'/forumdisplay.php?forumid=')]");
		afObject.innerHTML = "Reset"
		afObject.style.fontSize = "75%";
		afObject.style.fontWeight = "bold";
		afMain.insertBefore(afObject, afMainIcons);
		afMain.insertBefore(doc.createTextNode(")"), afMainIcons);
		afMain.insertBefore(doc.createElement("br"), afMainIcons);

		// Add a message for when all the icons are ignored and hide it for now
		afObject = doc.createElement("div");
		afObject.id = "alliconsignored";
		afObject.appendChild(doc.createTextNode("You've ignored everything but shit posts you cretin!"));
		afObject.style.fontWeight = "bold";
		persistObject.toggleVisibility(afObject,true);
		afMainIcons.insertBefore(afObject,afMainIcons.firstChild);

		// Plug a bunch of stuff in after the main icon list
		afObject = doc.createElement("div");
		afObject.appendChild(doc.createTextNode("Ctrl click an icon to add to ignored list."));
		afObject.style.fontStyle = "italic";
		afObject.style.fontSize = "85%";
		afMain.appendChild(afObject);
		afMain.appendChild(doc.createElement("br"));

		// Now all the ignored icons
		afMain.appendChild(doc.createTextNode("Ignored icons:"));
		afMain.appendChild(doc.createElement("br"));
		afIgnoredIcons = doc.createElement("div");
		afIgnoredIcons.id = "ignoredicons";
		afObject = doc.createElement("div");
		afObject.id = "noiconsignored";
		afObject.appendChild(doc.createTextNode("None."));
		afObject.style.fontStyle = "italic";
		afObject.style.visibility = "visible";
		afObject.style.display = "inline";
		afIgnoredIcons.appendChild(afObject);
		afMain.appendChild(afIgnoredIcons);
		afMain.appendChild(doc.createElement("br"));

		// Now the ignored keywords
		afMain.appendChild(doc.createTextNode("Ignored keywords:"));
		afMain.appendChild(doc.createElement("br"));
		afObject = doc.createElement("input");
		afObject.id = "ignoredkeywords";
		afObject.type = "text";
		afObject.value = prefIgnoredKeywords;
		afObject.size = 75;
		afMain.appendChild(afObject);
		afMain.appendChild(doc.createTextNode(" "));
		afObject = doc.createElement("input");
		afObject.type = "button";
		afObject.value = "Save";
		afObject.addEventListener("click", clickIgnoreKeywordSave, false);
		afMain.appendChild(afObject);
		afMain.appendChild(doc.createElement("br"));
		afObject = doc.createElement("div");
		afObject.appendChild(doc.createTextNode("Separate strings with a pipe \"|\" symbol. Too many strings may affect performance."));
		afObject.style.fontStyle = "italic";
		afObject.style.fontSize = "85%";
		afMain.appendChild(afObject);
		afMain.appendChild(doc.createElement("br"));

		// TODO: ability to ignore shitposts even though they dont have an icon id
		// TODO: remove all the icon stuff for when viewing the dumps but keep the rest, maybe add star# filtering for those
		// TODO: thread rating filtering
	}
}

// Event catcher for ignoring post icons
function clickToggleIgnoreIcon(event)
{
	if (persistObject.getPreference("advancedThreadFiltering"))
	{
		var doc = this.ownerDocument;
		var afMain = doc.getElementById("tags_showing");

		if (afMain)
		{
			var afMainIcons, afIgnoredIcons, afShowMe, afHideMe, afIgnoring;
			var iconToIgnore, iconToIgnoreId, iconIgnored;
			var afObject; // Temp object storage for things that really only get handled once
			var prefIgnoredPostIcons = persistObject.getPreference("ignoredPostIcons");
			var prefIgnoredKeywords = persistObject.getPreference("ignoredKeywords");
			var anyLeft, anyLeftIn, searchString, threadBeGone;
			var threadList, thread, threadIcon, threadIconFile, iconList;

			afMainIcons = doc.getElementById("filtericons");
			afIgnoredIcons = doc.getElementById("ignoredicons");

			if (this.parentNode.id == "filtericons")
			{
				if (event.ctrlKey == false)
				{
					return; // Moving from the main icon list requires ctrl click
				}
				afIgnoring = true;
				afShowMe = "alliconsignored";
				afHideMe = "noiconsignored";
				anyLeftIn = afMainIcons;
				mirrorIcons = afIgnoredIcons;
			}
			else if (this.parentNode.id == "ignoredicons")
			{
				afIgnoring = false;
				afShowMe = "noiconsignored";
				afHideMe = "alliconsignored";
				anyLeftIn = afIgnoredIcons;
				mirrorIcons = afMainIcons;
			}
			else
			{
				return;
			}

			iconToIgnore = this.firstChild;
			iconToIgnoreId = parseInt(iconToIgnore.href.match(/posticon=(\d+)/i)[1]);
			iconIgnored = persistObject.selectSingleNode(doc, mirrorIcons, "DIV/A[contains(@href,'posticon=" + iconToIgnoreId + "')]");

			searchString = "(^|\\s)" + iconToIgnoreId + ",";
			searchString = new RegExp(searchString , "gi");

			if (!afMainIcons || !afIgnoredIcons || !iconIgnored || (afIgnoring && prefIgnoredPostIcons.search(searchString) > -1))
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
			persistObject.setPreference("ignoredPostIcons",prefIgnoredPostIcons);

			persistObject.toggleVisibility(this,true);
			afObject = doc.getElementById(afHideMe);
			if (afObject && afObject.style.visibility != "hidden")
			{
				persistObject.toggleVisibility(afObject,true);
			}

			persistObject.toggleVisibility(iconIgnored.parentNode,true);
			afObject = doc.getElementById(afShowMe);
			anyLeft = persistObject.selectSingleNode(doc, anyLeftIn, "DIV[contains(@style,'visibility: visible; display: inline;')]");
			if (!anyLeft && afObject && afObject.style.visibility == "hidden")
			{
				persistObject.toggleVisibility(afObject,true);
			}

			// Cycle through the threads and actively update their visibility
			threadList = persistObject.selectNodes(doc, doc, "//table[@id='forum']/tbody/tr");
			iconList = persistObject.iconList;

			for (var i in threadList)
			{
				thread = threadList[i];
				threadIcon = persistObject.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]//IMG");
				threadBeGone = false;
				iconMatch = false;

				if (threadIcon.src.search(/posticons\/(.*)/i) > -1)
				{
					threadIconFile = threadIcon.src.match(/posticons\/(.*)/i)[1];
					if (iconList[threadIconFile] == iconToIgnoreId)
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
					var threadTitleLink = persistObject.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/DIV/A[contains(@class, 'thread_title')]");
					if(!threadTitleLink)
					{
						threadTitleLink = persistObject.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/A[contains(@class, 'thread_title')]");
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
					persistObject.toggleVisibility(thread,false);
					filteredThreadCount(doc,1);
				}
				else if (!threadBeGone && thread.style.visibility == "hidden")
				{
					persistObject.toggleVisibility(thread,false);
					filteredThreadCount(doc,-1);
				}
			}
		}
	}
}

// Event catcher for keyword ignoring input box
function clickIgnoreKeywordSave(event)
{
	if (persistObject.getPreference("advancedThreadFiltering"))
	{
		var doc = this.ownerDocument;
		var afMain = doc.getElementById("tags_showing");

		if (afMain)
		{
			var afObject; // Temp object storage for things that really only get handled once
			var prefIgnoredKeywords = persistObject.getPreference("ignoredKeywords");
			var prefIgnoredPostIcons = persistObject.getPreference("ignoredPostIcons");
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

			persistObject.setPreference("ignoredKeywords",newKeywords);

			// Cycle through the threads and actively update their visibility
			threadList = persistObject.selectNodes(doc, doc, "//table[@id='forum']/tbody/tr");
			keywordList = newKeywords.split("|");

			for (var i in threadList)
			{
				thread = threadList[i];
				threadTitleLink = persistObject.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/DIV/A[contains(@class, 'thread_title')]");
				if(!threadTitleLink)
				{
					threadTitleLink = persistObject.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/A[contains(@class, 'thread_title')]");
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
					var iconList = persistObject.iconList;
					var threadIcon = persistObject.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]//IMG");

					if (threadIcon.src.search(/posticons\/(.*)/i) > -1)
					{
						threadIconFile = threadIcon.src.match(/posticons\/(.*)/i)[1];
						searchString = "(^|\\s)" + iconList[threadIconFile] + ",";
						searchString = new RegExp(searchString , "gi");

						if (prefIgnoredPostIcons.search(searchString) > -1)
						{
							threadBeGone = true;
						}
					}
				}

				if (threadBeGone && thread.style.visibility != "hidden")
				{
					persistObject.toggleVisibility(thread,false);
					filteredThreadCount(doc,1);
				}
				else if (!threadBeGone && thread.style.visibility == "hidden")
				{
					persistObject.toggleVisibility(thread,false);
					filteredThreadCount(doc,-1);
				}
			}
		}
	}
}

// To cut down on code elsewhere (for keeping track of the number of threads being filtered)
function filteredThreadCount(doc,amount)
{
	var count = persistObject.getPreference("filteredThreadCount");
	var afObject, afObject2; // Temp object storage for things that really only get handled once

	afObject = doc.getElementById("filteredthreadcount1");
	afObject2 = doc.getElementById("filteredthreadcount2");

	if (!afObject || !afObject2)
	{
		return;
	}

	count += amount;
	afObject.childNodes[1].textContent = count;
	afObject2.childNodes[1].textContent = count;

	if (count <= 0 && afObject.style.visibility != "hidden")
	{
		persistObject.toggleVisibility(afObject,true);
	}
	else if (afObject.style.visibility == "hidden")
	{
		persistObject.toggleVisibility(afObject,true);
	}

	if (count <= 0 && afObject2.style.visibility != "hidden")
	{
		persistObject.toggleVisibility(afObject2,true);
	}
	else if (afObject2.style.visibility == "hidden")
	{
		persistObject.toggleVisibility(afObject2,true);
	}

	persistObject.setPreference("filteredThreadCount",count);
}

