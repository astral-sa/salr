/*

	Handler for usercp/bookmarks.

*/

let {Prefs} = require("./prefsHelper");
let {PageUtils} = require("../pageUtils");
let {ThreadListHandler} = require("./threadListHandler");

let BookmarkedThreadsHandler = exports.BookmarkedThreadsHandler =
{
	// Do anything needed to the subscribed threads list
	handleBookmarkedThreads: function(doc)
	{
		var cpusernav = PageUtils.selectSingleNode(doc, doc, "//ul[contains(@id,'usercpnav')]");
		if (!cpusernav) {
			// Don't see the control panel menu so stop
			return;
		}

		let oldUsername = Prefs.getPref("username");
		if (oldUsername === '' || oldUsername === 'Not%20cookied%3F')
		{
			var username = PageUtils.selectSingleNode(doc,doc,"//div[contains(@class, 'breadcrumbs')]/b");
			if (username)
			{
				username = escape(username.textContent.substr(52));
				if (username !== 'Not%20cookied%3F')
					Prefs.setPref("username", username);
			}
		}

		ThreadListHandler.handleThreadList(doc, null, { "inUserCP" : true });
	},

};
