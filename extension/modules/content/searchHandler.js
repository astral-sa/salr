/**
 * @fileoverview Handler for search (query.php)
 */

let {Prefs} = require("./prefsHelper");
let {PageUtils} = require("../pageUtils");
let {Gestures} = require("./gestures");

let SearchHandler = exports.SearchHandler =
{
	/**
	 * The search handler.
	 * @param {HTMLDocument} doc Document to handle.
	 */
	handleQuery: function(doc)
	{
		// Add support for mouse gestures / pagination
		if (Prefs.getPref("gestureEnable"))
		{
			let curPage = PageUtils.selectSingleNode(doc, doc, "//span[contains(@class,'this_page')]");
			// Set a dummy value if there aren't any pages to allow upward nav
			if (!curPage)
				curPage = 1;
			else
				curPage = parseInt(curPage.textContent, 10);

			let numPages;
			let lastNode = PageUtils.selectSingleNode(doc, doc, "//UL[@class='pages']/LI[@class='last_page']/A");
			if (lastNode)
			{
				numPages = lastNode.href.match(/page=(\d+)/i)[1];
				numPages = parseInt(numPages, 10);
			}
			else
			{
				numPages = curPage;
			}

			let pages = {'total': numPages, 'current': curPage};
			Gestures.addGestureListeners(doc, pages);
		}
	},

};
