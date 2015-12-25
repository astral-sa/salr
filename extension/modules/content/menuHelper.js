/**
 * @fileOverview Grabs and stores forum list from content.
 */

let {PageUtils} = require("pageUtils");

let MenuHelper = exports.MenuHelper =
{
	grabForumList: function(doc)
	{
		var statsMenu = false;
		var rowList = PageUtils.selectNodes(doc, doc, "//select[@name='forumid']/option");
		if (!rowList || rowList.length === 0)
		{
			// Can't find the forum list so lets check the other location
			rowList = PageUtils.selectNodes(doc, doc, "//select[@name='t_forumid']/option");
			if (!rowList)
			{
				// Still couldn't find the forum list so let's stop now
				return;
			}
			statsMenu = true;
		}
		if (rowList.length < 15)
		{
			// There are way more then 15 forums so this menu is missing some
			return;
		}

		//let oDomParser = new DOMParser();
		let oDomParser = Cc["@mozilla.org/xmlextras/domparser;1"]
             .createInstance(Ci.nsIDOMParser);
		let forumsDoc = oDomParser.parseFromString("<?xml version=\"1.0\"?>\n<forumlist></forumlist>", "text/xml");
		//var targetEl = forumsDoc.documentElement;

		let forumsEl = forumsDoc.createElement("forums");
		forumsDoc.documentElement.appendChild(forumsEl);
		forumsDoc.documentElement.insertBefore(forumsDoc.createTextNode("\n"), forumsEl);

		for (let i = 0; i < rowList.length; )
		{
			i = MenuHelper._addForums(forumsDoc, rowList, i, forumsEl, 0, statsMenu);
		}

		// Send new forum list to database
		let oXmlSer = Cc["@mozilla.org/xmlextras/xmlserializer;1"]
							.createInstance(Ci.nsIDOMSerializer);
		let xmlstr = oXmlSer.serializeToString(forumsDoc);
		sendSyncMessage("salastread:ForumListUpdate", xmlstr);
		sendAsyncMessage("salastread:RebuildAllMenus");
	},

	_addForums: function(forumsDoc, rowList, index, parentEl, depth, statsMenu)
	{
		var thisEl = rowList[index];
		var forumTitle = thisEl.firstChild.nodeValue;
		var forumId = thisEl.getAttribute("value");

		forumId = parseInt(forumId);
		if (isNaN(forumId) || forumId < 0)
		{
			return index+1;
		}

		var dashes = (statsMenu) ? '---' : '--';
		var elDepth = 0;

		while (forumTitle.indexOf(dashes) === 0)
		{
			forumTitle = forumTitle.substring(dashes.length);
			elDepth++;
		}
		forumTitle = forumTitle.replace(/^\s+|\s+$/g, '');
		forumTitle = forumTitle.replace('(no posting)', '');
		if (elDepth < depth)
		{
			return index;
		}
		if (elDepth > depth)
		{
			// This can't fit in the tree
			return index+1;
		}

		var fel;
		if (depth === 0)
		{
			fel = forumsDoc.createElement("cat");
		}
		else
		{
			fel = forumsDoc.createElement("forum");
		}

		fel.setAttribute("id", forumId);
		fel.setAttribute("name", forumTitle);
		parentEl.appendChild(forumsDoc.createTextNode("\n"));
		parentEl.appendChild(fel);

		for (index++; index < rowList.length; )
		{
			var i = MenuHelper._addForums(forumsDoc, rowList, index, fel, depth+1, statsMenu);

			if (i == index)
			{
				return i;
			}

			index = i;
		}
		return index;
	},

};