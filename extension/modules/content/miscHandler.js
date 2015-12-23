/**
 * @fileOverview Handles Misc -> "Who Posted" page
 */

let {Prefs} = require("prefs");
let {DB} = require("db");
let {PageUtils} = require("pageUtils");

let MiscHandler = exports.MiscHandler = 
{
	handleMisc: function(doc)
	{
		let action = doc.location.search.match(/action=(\w+)/i);
		if (action && action[1])
		{
			// Handle the "Who posted?" list window
			if (action[1] === "whoposted")
			{
				MiscHandler.handleWhoPosted(doc);
			}
		}
	},

	/**
	 * Handler for "Who Posted?" page.
	 * @param {Element} doc The document to work in.
	 */
	handleWhoPosted: function(doc)
	{
		let posterTable = PageUtils.selectSingleNode(doc,doc,"//DIV[@id='main_stretch']/DIV/TABLE/TBODY");
		let threadId = parseInt(doc.location.search.match(/threadid=(\d+)/i)[1], 10);
		if (!posterTable || !threadId)
			return;
		let flags = {
			highlightUsernames: Prefs.getPref("highlightUsernames"),
			sortReplyList: Prefs.getPref("sortReplyList")
		};

		// If we came here from a link inside the thread, we don't want the link at the bottom to take us back to page 1
		if (doc.location.hash.search(/fromthread/i) > -1)
		{
			let closeLink = PageUtils.selectSingleNode(doc, doc, "//A[contains(./text(),'show thread')]");
			closeLink.parentNode.innerHTML = "<a style=\"color: #fff!important;\" onclick=\"self.close();\" href=\"#\">" + closeLink.innerHTML + "</a>";
		}

		if (!flags.highlightUsernames && !flags.sortReplyList)
			return;

		let headers;
		if (flags.sortReplyList)
			headers = MiscHandler.createWhoPostedSortHeaders(posterTable);

		let rows = PageUtils.selectNodes(doc, posterTable, "TR");
		for (let row of rows)
		{
			MiscHandler.processWhoPostedRow(posterTable, row, flags, headers);
		}

		// If we didn't sort any users to a particular header, remove it
		if (flags.sortReplyList)
		{
			MiscHandler.sortCleanup(posterTable, headers);
		}
	},

	/**
	 * Make some headers for sorting users by importance.
	 *     Order: custom colored users, then admins, then mods
	 * @param  {Node}   posterTable Node snapshot of the table.
	 * @return {Object}             Headers for each category.
	 */
	createWhoPostedSortHeaders: function(posterTable)
	{
		let headers = {};
		headers.Users = posterTable.firstChild;
		headers.Users.firstChild.textContent = "Normal Users";

		headers.Mods = posterTable.firstChild.cloneNode(true);
		headers.Mods.firstChild.textContent = "Moderators";
		posterTable.insertBefore(headers.Mods,posterTable.firstChild);

		headers.Admins = posterTable.firstChild.cloneNode(true);
		headers.Admins.firstChild.textContent = "Administrators";
		posterTable.insertBefore(headers.Admins,posterTable.firstChild);

		headers.Custom = posterTable.firstChild.cloneNode(true);
		headers.Custom.firstChild.textContent = "Users of Interest";
		posterTable.insertBefore(headers.Custom,posterTable.firstChild);

		return headers;
	},

	/**
	 * Gets sorting priority any required coloring for a user.
	 * @param   {number}  posterId    User ID to lookup.
	 * @param   {boolean} checkColors Whether to check colors (highlightUsernames from prefs)
	 * @returns {Object}  A user info object with two properties:
	 *                           {number} priority Sort priority for user.
	 *                           {string} color    Color for user.
	 */
	getUserInfo: function(posterId, checkColors)
	{
		let userInfo = { priority: 0 };
		if (DB.isMod(posterId))
		{
			userInfo.priority = 1;
		}
		if (DB.isAdmin(posterId))
		{
			userInfo.priority = 2;
		}
		if (!checkColors)
			return userInfo;

		// Apply standard colors
		if (userInfo.priority === 2)
		{
			userInfo.color = Prefs.getPref("adminColor");
		}
		else if (userInfo.priority === 1)
		{
			userInfo.color = Prefs.getPref("modColor");
		}

		// Check user colors
		let userColoring = DB.isUserIdColored(posterId);
		if (!userColoring)
			return userInfo;

		if (userColoring.color && userColoring.color !== "0")
		{
			userInfo.color = userColoring.color;
			userInfo.priority = 3;
		}
		else if ((userColoring.background && userColoring.background !== "0") || DB.getPosterNotes(posterId))
		{
			userInfo.priority = 3;
		}
		return userInfo;
	},

	/**
	 * Processes each row of the "Who posted?" table.
	 * @param {Node}   posterTable Node snapshot of the table.
	 * @param {Node}   row         Node snapshot of a row to process.
	 * @param {Object} flags       Whether we need to sort and/or color.
	 * @param {Object} headers     Header elements for each category.
	 */
	processWhoPostedRow: function(posterTable, row, flags, headers)
	{
		// Skip the labels
		if (row.className === "smalltext" || row.childNodes[1].className === "smalltext")
			return;

		let posterLink = row.childNodes[1].firstChild;
		let posterId = parseInt(posterLink.href.match(/userid=(\d+)/i)[1], 10);
		if (!posterId)
			return;

		let userInfo = MiscHandler.getUserInfo(posterId, flags.highlightUsernames);
		if (userInfo.color)
		{
			posterLink.style.color = userInfo.color;
			if (!Prefs.getPref("dontBoldNames"))
			{
				posterLink.style.fontWeight = "bold";
			}
		}

		if (flags.sortReplyList)
		{
			MiscHandler.sortWhoPostedRow(posterTable, row, userInfo, headers);
		}
	},

	/**
	 * [sortWhoPostedRow description]
	 * @param {Node}   posterTable Node snapshot of the table.
	 * @param {Node}   row         Node snapshot of a row to process.
	 * @param {Object} userInfo    A user info object containing color and priority information.
	 * @param {Object} headers     Header elements and their in-use status for each category.
	 */
	sortWhoPostedRow: function(posterTable, row, userInfo, headers)
	{
		switch (userInfo.priority)
		{
			// Note for clarity: we are inserting the user BEFORE the headers referenced below,
			//   not after, thats why header and bool check names don't match up
			case 1:
				posterTable.insertBefore(row, headers.Users);
				headers.modPosted = true;
				break;
			case 2:
				posterTable.insertBefore(row, headers.Mods);
				headers.adminPosted = true;
				break;
			case 3:
				posterTable.insertBefore(row, headers.Admins);
				headers.customPosted = true;
				break;
		}
	},

	/**
	 * Removes any unused sort headers.
	 * @param {Node}   posterTable Node snapshot of the table.
	 * @param {Object} headers     Header elements and their in-use status for each category.
	 */
	sortCleanup: function(posterTable, headers)
	{
		if (!headers.customPosted)
		{
			posterTable.removeChild(headers.Custom);
		}
		if (!headers.adminPosted)
		{
			posterTable.removeChild(headers.Admins);
		}
		if (!headers.modPosted)
		{
			posterTable.removeChild(headers.Mods);
		}
	},

};
