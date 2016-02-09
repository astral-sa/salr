/*

	Handler for logging in/logging out of the forums.

*/

let {Prefs} = require("./prefsHelper");
let {PageUtils} = require("../pageUtils");

let AccountHandler = exports.AccountHandler =
{
	handleAccount: function(doc)
	{
		var action;
		if ((action = doc.location.search.match(/action=(\w+)/i)) != null)
		{
			if (action[1] === "logout")
			{
				Prefs.setPref("username", '');
				Prefs.setPref("userId", 0);
			}
		}
		else
		{
			// There is no action specified, we may be logging in
			var div = doc.getElementById("main_wide");
			if (div)
			{
				var loginMsg = PageUtils.selectSingleNode(doc, div, "DIV[contains(./text(),'GLUE')]");
				if (loginMsg)
				{
					var name = loginMsg.firstChild.textContent.match(/GLUE GLUEEEEE GLUUUUUUEEE, (.*)! {2}GLUUUEEE/);
					// Note that there are 2 spaces after the !, the extra space doesn't show up on the page but it's in the raw HTML
					if (name)
					{
						name = name[1];
						Prefs.setPref("username", name);
					}
				}
			}
		}
	},

};
