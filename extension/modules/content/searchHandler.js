/*

	Handler for search and old search.

*/

let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");
let {Gestures} = require("gestures");

let SearchHandler = exports.SearchHandler =
{
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

			doc.__SALR_curPage = curPage;
			doc.__SALR_maxPage = numPages;

			Gestures.addGestureListeners(doc);
		}
	},

	handleSearch: function(doc)
	{
		// Add support for mouse gestures / pagination
		if (Prefs.getPref("gestureEnable"))
		{
			var pageList = PageUtils.selectNodes(doc, doc, "//DIV[contains(@class,'pager')]");
			var numPages;
			var curPage;
			if (pageList)
			{
				if (pageList.length >= 1)
					pageList = pageList[pageList.length-1];
				else
					return;
				numPages = pageList.textContent.match(/\((\d+)\)/);
				if (!numPages)
					return;
				curPage = PageUtils.selectSingleNode(doc, doc, "//a[contains(@class,'current')]");
				if (pageList.childNodes.length > 1) // Are there pages
				{
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

			Gestures.addGestureListeners(doc);
		}
	},

	handleOldSearch: function(doc)
	{
	},

};
