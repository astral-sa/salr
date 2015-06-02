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
		var modColor = Prefs.getPref("modColor");
		var modBackground = Prefs.getPref("modBackground");
		var adminColor = Prefs.getPref("adminColor");
		var adminBackground = Prefs.getPref("adminBackground");
		var highlightUsernames = Prefs.getPref("highlightUsernames");
		var dontBoldNames = Prefs.getPref("dontBoldNames");
		var showTWNP = Prefs.getPref('showThreadsWithNewPostsFirst');
		var showTWNPCP = Prefs.getPref('showThreadsWithNewPostsFirstCP');
		var showTWNPCPS = Prefs.getPref('showThreadsWithNewPostsFirstCPStickies');
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
		var lastLink, searchString;
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

		// These are insertion points for thread sorting
		if ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP))
		{
			var anchorTop = PageUtils.selectSingleNode(doc, forumTable, "tbody");

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
			threadTitleBox = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]");
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

			threadTitleLink = PageUtils.selectSingleNode(doc, threadTitleBox, "DIV/DIV/A[contains(@class, 'thread_title')]");
			if (!threadTitleLink)
			{
				threadTitleLink = PageUtils.selectSingleNode(doc, threadTitleBox, "A[contains(@class, 'thread_title')]");
			}
			if (!threadTitleLink) continue;
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

				// For thread sorting later
				if (iconJumpLastRead && ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP)))
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
						if (thread.className.match(/(^|\s)seen(\s|$)/i) == null)
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
			if ((showTWNP && !flags.inUserCP) || (showTWNPCP && flags.inUserCP))
			{
				var iAmASticky = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class, 'sticky')]");
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

			if (DB.isThreadStarred(threadId))
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

					if (DB.isMod(threadOPId))
					{
						posterColor = modColor;
						posterBG =  modBackground;
					}

					if (DB.isAdmin(threadOPId))
					{
						posterColor = adminColor;
						posterBG =  adminBackground;
					}

					userColoring = DB.isUserIdColored(threadOPId);
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

					if (posterBG != false && posterBG !== "0")
					{
						threadAuthorBox.style.backgroundColor = posterBG;
					}
					if (posterColor != false && posterColor !== "0")
					{
						threadAuthorBox.getElementsByTagName("a")[0].style.color = posterColor;
						if (!dontBoldNames)
						{
							threadAuthorBox.getElementsByTagName("a")[0].style.fontWeight = "bold";
						}
					}
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
					posterColor = false;
					posterBG = false;

					if (DB.isMod(lastPostId))
					{
						posterColor = modColor;
						posterBG =  modBackground;
					}

					if (DB.isAdmin(lastPostId))
					{
						posterColor = adminColor;
						posterBG =  adminBackground;
					}

					userColoring = DB.isUserIdColored(lastPostId);
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

					if (posterBG != false && posterBG !== "0")
					{
						threadLastPostBox.style.backgroundColor = posterBG;
					}
					if (posterColor != false && posterColor !== "0")
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
			if (flags.inUserCP)
				anchorTop.removeChild(anchorUnseenThreads);
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
