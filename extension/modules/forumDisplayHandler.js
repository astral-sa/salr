/*

	Handler for thread lists (forum + usercp/bookmarks).

*/

// Called from old Overlay
let {DB} = require("db");
let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");
let {Navigation} = require("navigation");
let {Gestures} = require("gestures");
let {ThreadListHandler} = require("threadListHandler");
let {Styles} = require("styles");
let {AdvancedThreadFiltering} = require("advancedThreadFiltering");
let {QuickQuoteHelper} = require("quickQuoteHelper");

let ForumDisplayHandler = exports.ForumDisplayHandler =
{
	// Do anything needed to the post list in a forum
	handleForumDisplay: function(doc)
	{
		var i;  // Little variables that'll get reused
		var forumid = PageUtils.getForumId(doc);
		if (forumid === false)
		{
			// Can't determine forum id so stop
			return;
		}
		// The following forums have special needs that must be dealt with
		var flags = {
			"inFYAD" : PageUtils.inFYAD(forumid),
			"inDump" : PageUtils.inDump(forumid),
			//"inAskTell" : PageUtils.inAskTell(forumid),
			"inGasChamber" : PageUtils.inGasChamber(forumid),
			"inArchives" : (doc.location.host.search(/^archives\.somethingawful\.com$/i) > -1)
		};

		if (doc.getElementById('forum') === null) {
			// /!\ Forum table isn't there, abort! /!\
			return;
		}

		if (!DB.gotForumList)
		{
			// Replace this function if/when JSON is added to the forums
			PageUtils.grabForumList(doc);
		}

		if (flags.inFYAD && !Prefs.getPref("enableFYAD")) {
			// We're in FYAD and FYAD support has been turned off
			return;
		}

		// Add our thread list CSS for FYAD/BYOB
		PageUtils.insertDynamicCSS(doc, Styles.generateDynamicThreadListCSS(forumid));

		// Start a transaction to try and reduce the likelihood of database corruption
		var ourTransaction = false;
		if (DB.database.transactionInProgress) {
			ourTransaction = true;
			DB.database.beginTransactionAs(DB.database.TRANSACTION_DEFERRED);
		}

		var pageList = PageUtils.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
		var numPages;
		var curPage;
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
				numPages = pageList.lastChild.textContent.match(/(\d+)/);
				curPage = PageUtils.selectSingleNode(doc, pageList, "//OPTION[@selected='selected']");
				// Suppress a page-load error - possibly unnecessary with revised logic
				if (!numPages)
					return;
				numPages = parseInt(numPages[1], 10);
				curPage = parseInt(curPage.textContent, 10);
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
		if (Prefs.getPref("enableForumNavigator"))
		{
			Navigation.addPagination(doc);
		}
		if (Prefs.getPref("gestureEnable"))
		{
			Gestures.addGestureListeners(doc);
		}

		// Turn on keyboard navigation
		if (Prefs.getPref('quickPostJump'))
		{
			doc.addEventListener('keypress', Navigation.quickPostJump, false);
		}

		// Replace post button
		if (Prefs.getPref("useQuickQuote") && !flags.inGasChamber)
		{
			var postbutton = PageUtils.selectSingleNode(doc, doc, "//A[contains(@href,'action=newthread')]");
			if (postbutton)
			{
				QuickQuoteHelper.turnIntoQuickButton(doc, postbutton, forumid).addEventListener("click", QuickQuoteHelper.quickButtonClicked.bind(null, forumid, null), true);
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
				let username = modarray[i].textContent;
				if (!DB.isMod(userid) && !DB.isAdmin(userid))
				{
					DB.addMod(userid, username);
				}
			}
		}

		// Advanced thread filtering interface
		var prefAdvancedThreadFiltering = Prefs.getPref("advancedThreadFiltering");
		if (prefAdvancedThreadFiltering && !flags.inDump && !flags.inArchives)
		{
			AdvancedThreadFiltering.rebuildFilterBox(doc);
		}

		if (!flags.inDump)
		{
			// Capture and store the post icon # -> post icon filename relationship
			var filterDiv = doc.getElementById("filter");
			var tagsDiv = PageUtils.selectSingleNode(doc, filterDiv, "div[contains(@class, 'thread_tags')]");
			var iconNumber;
			var postIcons = PageUtils.selectNodes(doc, tagsDiv, "A[contains(@href,'posticon=')]");
			var divIcon, separator, divClone, afIgnoredIcons, allIgnored, noneIgnored, searchString;
			var atLeastOneIgnored = false;
			var prefIgnoredPostIcons = Prefs.getPref("ignoredPostIcons");

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
							PageUtils.toggleVisibility(divIcon,true);
							atLeastOneIgnored = true;
						}
						else
						{
							PageUtils.toggleVisibility(divClone,true);
						}

						// Add the appropriate click events
						postIcons[i].parentNode.addEventListener("click", AdvancedThreadFiltering.clickToggleIgnoreIcon, false);
						divClone.addEventListener("click", AdvancedThreadFiltering.clickToggleIgnoreIcon, false);
					}
				}
			}

			// Little bit of house cleaning after cycling through the icons
			if (prefAdvancedThreadFiltering && !flags.inArchives)
			{
				allIgnored = doc.getElementById("alliconsignored");
				noneIgnored = doc.getElementById("noiconsignored");

				// Hide or show the placeholder labels
				var anyLeft = PageUtils.selectSingleNode(doc, tagsDiv, "DIV[contains(@style,'visibility: visible; display: inline;')]");
				if (!anyLeft && allIgnored.style.visibility === "hidden")
				{
					PageUtils.toggleVisibility(allIgnored,true);
				}
				if (atLeastOneIgnored && noneIgnored.style.visibility === "visible")
				{
					PageUtils.toggleVisibility(noneIgnored,true);
				}
			}
		}

		ThreadListHandler.handleThreadList(doc, forumid, flags);

		if (ourTransaction)
		{
			// Finish off the transaction
			DB.database.commitTransaction();
		}
	},

};
