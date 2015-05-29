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
		var action;
		if ((action = doc.location.search.match(/action=(\w+)/i)) != null)
		{
			// Handle the "Who posted?" list window
			if (action[1] === "whoposted")
			{
				var posterTable = PageUtils.selectSingleNode(doc,doc,"//DIV[@id='main_stretch']/DIV/TABLE/TBODY");
				var threadId = parseInt(doc.location.search.match(/threadid=(\d+)/i)[1], 10);
				if (posterTable && threadId)
				{
					var highlightUsernames = Prefs.getPref("highlightUsernames");
					var sortReplyList = Prefs.getPref("sortReplyList");

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
					var rows = PageUtils.selectNodes(doc, posterTable, "TR");
					for (var i in rows)
					{
						var posterId;
						var row = rows[i];

						// Skip the labels
						if (row.className === "smalltext" || row.childNodes[1].className === "smalltext")
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

							if (DB.isMod(posterId))
							{
								userPriority = 1;
							}
							if (DB.isAdmin(posterId))
							{
								userPriority = 2;
							}

							// Check for user-defined name coloring and/or mod/admin coloring
							if (highlightUsernames)
							{
								var userColoring = DB.isUserIdColored(posterId);
								if (userColoring)
								{
									if (userColoring.color && userColoring.color != "0")
									{
										row.childNodes[1].firstChild.style.color = userColoring.color;
										if (!Prefs.getPref("dontBoldNames"))
										{
											row.childNodes[1].firstChild.style.fontWeight = "bold";
										}
										userPriority = 3;
									}
									if ((userColoring.background && userColoring.background != "0") || DB.getPosterNotes(posterId))
										userPriority = 3;
								}
								else if (userPriority === 1)
								{
									row.childNodes[1].firstChild.style.color = Prefs.getPref("modColor");
									if (!Prefs.getPref("dontBoldNames"))
									{
										row.childNodes[1].firstChild.style.fontWeight = "bold";
									}
								}
								else if (userPriority === 2)
								{
									row.childNodes[1].firstChild.style.color = Prefs.getPref("adminColor");
									if (!Prefs.getPref("dontBoldNames"))
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
						var closeLink = PageUtils.selectSingleNode(doc, doc, "//A[contains(./text(),'show thread')]");
						closeLink.parentNode.innerHTML = "<a style=\"color: rgb(255, 255, 255) ! important;\" onclick=\"self.close();\" href=\"#\">" + closeLink.innerHTML + "</a>";
					}
				}
			}
		}
	},

};
