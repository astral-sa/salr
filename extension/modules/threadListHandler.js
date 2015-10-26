/*

	Handler for thread lists (forum + usercp/bookmarks).

*/

let {DB} = require("db");
let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");
let {AdvancedThreadFiltering} = require("advancedThreadFiltering");

let ThreadListHandler = exports.ThreadListHandler =
{
	//handle highlighting of user cp/forum listings
	handleThreadList: function(doc, forumid, flags)
	{
		//get preferences once
		var dontHighlightThreads = Prefs.getPref("dontHighlightThreads");
		var disableNewReCount = Prefs.getPref("disableNewReCount");
		var newPostCountUseOneLine = Prefs.getPref("newPostCountUseOneLine");
		var showUnvisitIcon = Prefs.getPref("showUnvisitIcon");
		var swapIconOrder = Prefs.getPref("swapIconOrder");
		var showGoToLastIcon = Prefs.getPref("showGoToLastIcon");
		var alwaysShowGoToLastIcon = Prefs.getPref("alwaysShowGoToLastIcon");
		let goToLastInBlank = Prefs.getPref("goToLastInBlank");

		var highlightUsernames = Prefs.getPref("highlightUsernames");
		let userHighlightingPrefs = {
			modColor: Prefs.getPref("modColor"),
			modBackground: Prefs.getPref("modBackground"),
			adminColor: Prefs.getPref("adminColor"),
			adminBackground: Prefs.getPref("adminBackground"),
			dontBoldNames: Prefs.getPref("dontBoldNames")
		};

		let threadSortingInfo = {
			showTWNP: Prefs.getPref('showThreadsWithNewPostsFirst'),
			showTWNPCP: Prefs.getPref('showThreadsWithNewPostsFirstCP'),
			showTWNPCPS: Prefs.getPref('showThreadsWithNewPostsFirstCPStickies')
		};

		var postsPerPage = Prefs.getPref('postsPerPage');
		var advancedThreadFiltering = Prefs.getPref("advancedThreadFiltering");
		var ignoredPostIcons = Prefs.getPref("ignoredPostIcons");
		var ignoredKeywords = Prefs.getPref("ignoredKeywords");
		var superIgnoreUsers = Prefs.getPref("superIgnore");

		// This should eventually be redone and moved to the flags section.
		if (typeof(flags.inUserCP) === typeof undefined)
			flags.inUserCP = false;

		// We'll need lots of variables for this
		var threadIconBox, threadTitleBox, threadTitleLink, threadAuthorBox, threadRepliesBox, threadLastPostBox;
		var threadTitle, threadId, threadOPId, threadRe;
		var lastLink;
		//var starredthreads = DB.starList;
		//var ignoredthreads = DB.ignoreList;
		var forumTable = doc.getElementById('forum');

		if (!forumTable) // something is very wrong; abort!
			return;

		// We need to reset this every time the page is fully loaded
		if (advancedThreadFiltering)
			Prefs.setPref("filteredThreadCount",0);

		// Here be where we work on the thread rows
		var threadlist = PageUtils.selectNodes(doc, forumTable, "tbody/tr");

		// Set up insertion points for thread sorting if we need to
		ThreadListHandler.threadSortingSetup(doc, threadlist[0], threadSortingInfo, flags.inUserCP);

		for (let thread of threadlist)
		{
			threadTitleBox = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]");
			if (!threadTitleBox)
			{
				// Either the page didn't finish loading or SA didn't send the full page.
				return;
			}
			var ttb_a0 = threadTitleBox.getElementsByTagName('a')[0];
			if (ttb_a0 && ttb_a0.className.search(/announcement/i) > -1)
			{
				ThreadListHandler.sortAnnouncement(thread, threadSortingInfo, flags.inUserCP);
				// It's an announcement so skip the rest
				continue;
			}

			threadTitleLink = PageUtils.selectSingleNode(doc, threadTitleBox, "DIV/DIV/A[contains(@class, 'thread_title')]");
			if (!threadTitleLink)
			{
				threadTitleLink = PageUtils.selectSingleNode(doc, threadTitleBox, "A[contains(@class, 'thread_title')]");
			}
			if (!threadTitleLink)
				continue;
			threadId = parseInt(threadTitleLink.href.match(/threadid=(\d+)/i)[1], 10);
			threadTitle = threadTitleLink.textContent;
			if (DB.isThreadIgnored(threadId))
			{
				// If thread is ignored might as well remove it and stop now
				thread.parentNode.removeChild(thread);
				// Update the title just incase we don't know what it is
				DB.setThreadTitle(threadId, threadTitle);
				continue;
			}

			threadAuthorBox = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'author')]");
			threadRepliesBox = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'replies')]");
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
				if (superIgnoreUsers && DB.isUserIgnored(threadOPId))
				{
					thread.parentNode.removeChild(thread);
					continue;
				}
			}

			if (advancedThreadFiltering && !flags.inArchives && !flags.inDump && !flags.inUserCP)
			{
				// Check for ignored keywords
				let threadBeGone = AdvancedThreadFiltering.isThreadTitleKeywordFiltered(threadTitle, ignoredKeywords);
				if (threadBeGone && thread.style.visibility !== "hidden")
				{
					PageUtils.toggleVisibility(thread, false);
					AdvancedThreadFiltering.filteredThreadCount(doc, 1);
				}
			}

			lastLink = PageUtils.selectSingleNode(doc, threadTitleBox, "DIV/DIV/DIV/A[./text() = 'Last']");
			if (lastLink && postsPerPage > 0)
			{
				let threadReCount = parseInt(threadRepliesBox.textContent, 10) + 1;
				let lastPageNum = Math.ceil(threadReCount / postsPerPage);
				lastLink.textContent += ' (' + lastPageNum + ')';
			}

			// So right click star/ignore works
			thread.className += " salastread_thread_" + threadId;
			// So ignore/star can get a title immediately
			thread.__salastread_threadtitle = threadTitle;

			// Is this icon ignored?
			threadIconBox = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]");
			if (flags && forumid && advancedThreadFiltering && !flags.inArchives && !flags.inDump && !flags.inUserCP && threadIconBox.firstChild.firstChild.src.search(/posticons\/(.*)/i) > -1)
			{
				if (AdvancedThreadFiltering.isThreadIconFiltered(threadIconBox.firstChild.firstChild, ignoredPostIcons) && thread.style.visibility !== "hidden")
				{
					PageUtils.toggleVisibility(thread,false);
					AdvancedThreadFiltering.filteredThreadCount(doc,1);
				}
			}

			var divLastSeen = PageUtils.selectSingleNode(doc, threadTitleBox, "DIV/DIV[contains(@class, 'lastseen')]");
			if (divLastSeen)
			{
				// Thread is read so let's work our magic
				var iconMarkUnseen = PageUtils.selectSingleNode(doc, divLastSeen, "a[contains(@class, 'x')]");
				var iconJumpLastRead = PageUtils.selectSingleNode(doc, divLastSeen, "a[contains(@class, 'count')]");

				// Experimental: open in new window/tab with preference
				// TODO: options to do so only in ucp and/or forums +
				// option for open-in-background similar to middleclicking
				if (goToLastInBlank && iconJumpLastRead)
				{
					iconJumpLastRead.setAttribute('target', '_blank');
				}

				// For thread sorting later
				if (iconJumpLastRead && ((threadSortingInfo.showTWNP && !flags.inUserCP) || 
					(threadSortingInfo.showTWNPCP && flags.inUserCP)))
				{
					thread.className += ' moveup';
				}

				if (DB.didIPostHere(threadId))
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
						if (thread.className.match(/(^|\s)seen(\s|$)/i) === null)
						{
							thread.className += ' seen';
						}
						// And to make sure it removes the post count properly
						if (!disableNewReCount)
						{
							iconMarkUnseen.addEventListener("click", ThreadListHandler.clickMarkUnseen, false);
						}
					}
				}

				//SALR replacing forums buttons
				if (!disableNewReCount && iconJumpLastRead)
				{
					threadRe = PageUtils.selectSingleNode(doc, iconJumpLastRead, "B");
					threadRe = threadRe.cloneNode(true);
					threadRe.style.fontWeight = "normal";
					threadRe.style.fontSize = "9px";
					threadRe.textContent = "(" + threadRe.textContent + ")";
					if (newPostCountUseOneLine)
					{
						threadRepliesBox.textContent += "&nbsp;";
					}
					else
					{
						let reBr = doc.createElement('br');
						threadRepliesBox.appendChild(reBr);
					}
					threadRepliesBox.appendChild(threadRe);
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
						threadRe.textContent = "0";
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
			ThreadListHandler.sortThread(doc, thread, threadSortingInfo, flags.inUserCP);

			if (DB.isThreadStarred(threadId))
			{
				threadTitleBox.className += ' starred';
			}

			if (highlightUsernames)
			{
				var lastPostId;

				// First color the Author column
				if (threadOPId)
				{
					ThreadListHandler.colorUsernameBox(threadOPId, threadAuthorBox, userHighlightingPrefs);
				}

				// Then color the Killed By column
				threadLastPostBox = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'lastpost')]");
				if (!threadLastPostBox)
				{
					// Either the page didn't finish loading or SA didn't send the full page.
					return;
				}
				let lastPostLink = threadLastPostBox.getElementsByTagName('a');
				if (lastPostLink[0])
				{
					lastPostId = DB.getUserId(lastPostLink[0].textContent);
				}

				if (lastPostId)
				{
					ThreadListHandler.colorUsernameBox(lastPostId, threadLastPostBox, userHighlightingPrefs);
				}
			}
		}

		// Clean up insertion points from thread sorting
		ThreadListHandler.threadSortingCleanup(threadSortingInfo, flags.inUserCP);
	},

	/**
	 * Checks if we need to sort threads.
	 * @param {Object}  threadSortingInfo Various thread-sorting information.
	 * @param {boolean} inUserCP          Whether we're in the user control panel.
	 * @return {boolean} Whether we're sorting threads.
	 */
	areWeSortingThreads: function(threadSortingInfo, inUserCP)
	{
		return ((threadSortingInfo.showTWNP && !inUserCP) || 
			(threadSortingInfo.showTWNPCP && inUserCP));
	},

	/**
	 * Sets up thread sorting for a thread list page.
	 * @param {Node}    doc               Node snapshot of document element.
	 * @param {Element} firstThread       Place to insert our sort rows before.
	 * @param {boolean} threadSortingInfo Various thread-sorting information.
	 * @param {boolean} inUserCP          Whether we're in the user control panel.
	 */
	threadSortingSetup: function(doc, firstThread, threadSortingInfo, inUserCP)
	{
		if (!ThreadListHandler.areWeSortingThreads(threadSortingInfo, inUserCP))
			return;
		let forumTable = doc.getElementById('forum');
		threadSortingInfo.anchorTop = PageUtils.selectSingleNode(doc, forumTable, "tbody");
		if (!threadSortingInfo.anchorTop)
		{
			// Oh dear there are no threads to sort!
			// Change these options for now so that it doesn't error later
			threadSortingInfo.showTWNP = false;
			threadSortingInfo.showTWNPCP = false;
			return;
		}

		threadSortingInfo.anchorAnnouncement = doc.createElement("tr");
		threadSortingInfo.anchorTop.insertBefore(threadSortingInfo.anchorAnnouncement, firstThread);
		threadSortingInfo.anchorUnreadStickies = doc.createElement("tr");
		threadSortingInfo.anchorTop.insertBefore(threadSortingInfo.anchorUnreadStickies, firstThread);
		threadSortingInfo.anchorReadStickies = doc.createElement("tr");
		threadSortingInfo.anchorTop.insertBefore(threadSortingInfo.anchorReadStickies, firstThread);
		threadSortingInfo.anchorThreads = doc.createElement("tr");
		threadSortingInfo.anchorTop.insertBefore(threadSortingInfo.anchorThreads, firstThread);
		if (inUserCP)
		{
			threadSortingInfo.anchorUnseenThreads = doc.createElement("tr");
			threadSortingInfo.anchorTop.insertBefore(threadSortingInfo.anchorUnseenThreads, firstThread);
		}
	},

	/**
	 * Cleans up a thread list page after thread sorting.
	 * @param {boolean} threadSortingInfo Various thread-sorting information.
	 * @param {boolean} inUserCP          Whether we're in the user control panel.
	 */
	threadSortingCleanup: function(threadSortingInfo, inUserCP)
	{
		if (!ThreadListHandler.areWeSortingThreads(threadSortingInfo, inUserCP))
			return;
		threadSortingInfo.anchorTop.removeChild(threadSortingInfo.anchorAnnouncement);
		threadSortingInfo.anchorTop.removeChild(threadSortingInfo.anchorUnreadStickies);
		threadSortingInfo.anchorTop.removeChild(threadSortingInfo.anchorReadStickies);
		threadSortingInfo.anchorTop.removeChild(threadSortingInfo.anchorThreads);
		if (inUserCP)
			threadSortingInfo.anchorTop.removeChild(threadSortingInfo.anchorUnseenThreads);
	},

	/**
	 * Sorts an announcement thread into its proper category.
	 * @param {Element} thread            Announcement thread row to sort.
	 * @param {boolean} threadSortingInfo Various thread-sorting information.
	 * @param {boolean} inUserCP          Whether we're in the user control panel.
	 */
	sortAnnouncement: function(thread, threadSortingInfo, inUserCP)
	{
		if (!ThreadListHandler.areWeSortingThreads(threadSortingInfo, inUserCP))
			return;
		threadSortingInfo.anchorTop.insertBefore(thread, threadSortingInfo.anchorAnnouncement);
	},

	/**
	 * Sorts a thread into its proper category.
	 * @param {Node}    doc               Node snapshot of document element.
	 * @param {Element} thread            Thread row to sort.
	 * @param {boolean} threadSortingInfo Various thread-sorting information.
	 * @param {boolean} inUserCP          Whether we're in the user control panel.
	 */
	sortThread: function(doc, thread, threadSortingInfo, inUserCP)
	{
		if (!ThreadListHandler.areWeSortingThreads(threadSortingInfo, inUserCP))
			return;
		let iAmASticky = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'sticky')]");
		let iHaveNewPosts = (thread.className.search(/moveup/i) > -1);

		if (iAmASticky)
		{
			if (iHaveNewPosts)
			{
				if (inUserCP && !threadSortingInfo.showTWNPCPS)
					threadSortingInfo.anchorTop.insertBefore(thread,threadSortingInfo.anchorThreads);
				else
					threadSortingInfo.anchorTop.insertBefore(thread,threadSortingInfo.anchorUnreadStickies);
			}
			else if (!inUserCP)
			{
				threadSortingInfo.anchorTop.insertBefore(thread,threadSortingInfo.anchorReadStickies);
			}
		}
		else if (iHaveNewPosts)
		{
			threadSortingInfo.anchorTop.insertBefore(thread,threadSortingInfo.anchorThreads);
		}
		else if (inUserCP && thread.className.search(/seen/i) === -1)
		{
			threadSortingInfo.anchorTop.insertBefore(thread,threadSortingInfo.anchorUnseenThreads);
		}
	},

	/**
	 * Applies user highlighting settings to a specified user in a specified TD.
	 * @param {number} userId     ID of user to color.
	 * @param {Node}   userBox    Node snapshot of TD with user name to color.
	 * @param {Object} colorPrefs Color settings from preferences.
	 */
	colorUsernameBox: function(userId, userBox, colorPrefs)
	{
		let posterColor = false;
		let posterBG = false;

		if (DB.isMod(userId))
		{
			posterColor = colorPrefs.modColor;
			posterBG = colorPrefs.modBackground;
		}
		if (DB.isAdmin(userId))
		{
			posterColor = colorPrefs.adminColor;
			posterBG = colorPrefs.adminBackground;
		}

		let userColoring = DB.isUserIdColored(userId);
		if (userColoring)
		{
			if (userColoring.color && userColoring.color !== "0")
			{
				posterColor = userColoring.color;
			}
			if (userColoring.background && userColoring.background !== "0")
			{
				posterBG = userColoring.background;
			}
		}

		if (posterBG !== false && posterBG !== "0")
		{
			userBox.style.backgroundColor = posterBG;
		}
		if (posterColor !== false && posterColor !== "0")
		{
			userBox.getElementsByTagName("a")[0].style.color = posterColor;
			if (!colorPrefs.dontBoldNames)
			{
				userBox.getElementsByTagName("a")[0].style.fontWeight = "bold";
			}
		}
	},

	// Event catcher for clicking on the Mark Unseen box from a thread list
	clickMarkUnseen: function clickMarkUnseen()
	{
		// Clean up event listener if we've shut down.
		if (PageUtils === null)
		{
			this.removeEventListener("click", clickMarkUnseen, false);
			return;
		}
		let doc = this.ownerDocument;
		let thread = this.parentNode.parentNode.parentNode.parentNode;
		if (!thread)
			return;
		let threadRepliesBox = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'replies')]");
		if (!threadRepliesBox)
			return;
		// Remove the new replies count
		if (!Prefs.getPref("disableNewReCount") && thread.className.search(/newposts/i) > -1)
		{
			while (threadRepliesBox.childNodes[1])
			{
				// Delete everything but the original link
				threadRepliesBox.removeChild(threadRepliesBox.childNodes[1]);
			}
		}
	},

/*
	// Unused
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
				retNewPostCount = parseInt(countElement.textContent);
			} catch (e) { }
		}

		return retNewPostCount;
	},

	// Unused
	// Inserts the star
	// @param: doc, TD
	// @return: nothing
	insertStar: function(doc, titleBox)
	{
		try
		{
			var starIcon = doc.createElement("img");
			starIcon.setAttribute("src", "chrome://salastread/skin/star.png");
			starIcon.style.cssFloat = "left";
			starIcon.style.marginRight = "3px";
			starIcon.style.marginLeft = "3px";
			starIcon.style.border = "none";
			titleBox.insertBefore(starIcon, titleBox.getElementsByTagName('a')[0]);
			starIcon.style.marginTop = ((titleBox.clientHeight - 21) / 2) + "px";
		} catch (e) { }
	},
*/

};
