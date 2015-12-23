/*

	Handler for main forum index.

*/

let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");

let IndexHandler = exports.IndexHandler =
{

	handleIndex: function(doc)
	{
		let oldUsername = Prefs.getPref("username");
		if (oldUsername === '' || oldUsername === 'Not%20cookied%3F')
		{
			var username = PageUtils.selectSingleNode(doc,doc,"//div[contains(@class, 'mainbodytextsmall')]//b");
			username = escape(username.textContent);
			if (username !== 'Not%20cookied%3F')
				Prefs.setPref("username", username);
		}
	},

};
