/*

	Utility functions that might be called while parsing threads, forums, etc.

*/

let PageUtils = exports.PageUtils =
{
	// Output some text to the browser console
	logToConsole: function(someText)
	{
		let dConsole = Components.classes["@mozilla.org/consoleservice;1"]
					.getService(Components.interfaces.nsIConsoleService);
		dConsole.logStringMessage(someText);
		/* Doesn't work on e10s
		try
		{
			let {console} = Cu.import("resource://gre/modules/devtools/Console.jsm");
			console.log(someText);
		}
		catch (e)
		{
			let dConsole = Components.classes["@mozilla.org/consoleservice;1"]
						.getService(Components.interfaces.nsIConsoleService);
			dConsole.logStringMessage(someText);			
		}
		*/
	},

	// Adds a hidden form input to a form. Used by showthreadHandler and Quick Quote
	addHiddenFormInput: function(doc, form, name, value)
	{
	   let newel = doc.createElement("INPUT");
	   newel.type = "hidden";
	   newel.name = name;
	   newel.value = value;
	   form.appendChild(newel);
	},

	// Used by overlay and preferences -> UI
	EscapeMenuURL: function(murl)
	{
		var res = murl.replace("&","&amp;");
		return res.replace(",","&comma;");
	},

	UnescapeMenuURL: function(murl)
	{
		var res = murl.replace("&comma;",",");
		return res.replace("&amp;","&");
	},

	// Used for gestureStyling, header/footer removal, and pageNavigator
	insertCSSAsLink: function(doc, url)
	{
		var stylesheet = doc.createElement("link");
		stylesheet.rel = "stylesheet";
		stylesheet.type = "text/css";
		stylesheet.href = url;
		doc.getElementsByTagName('head')[0].appendChild(stylesheet);
	},

	// Used for dynamically-generated CSS that would be too expensive to SSS
	// Probably can be converted to document-specific SSS eventually (would req FF 18+)
	insertDynamicCSS: function(doc, css)
	{
		var stylesheet = doc.createElement("style");
		stylesheet.type = "text/css";
		stylesheet.innerHTML = css;
		doc.getElementsByTagName("head")[0].appendChild(stylesheet);
	},

	// Toggles the visibility of something
	// @param: element, (bool) display inline?
	// @return: nothing
	toggleVisibility: function(element,inline)
	{
		if (element.style.visibility == "hidden" && element.style.display == "none")
		{
			element.style.visibility = "visible";
			if (inline)
			{
				element.style.display = "inline";
			}
			else
			{
				element.style.display = "";
			}
		}
		else
		{
			element.style.visibility = "hidden";
			element.style.display = "none";
		}
	},

	getCleanPageTitle: function(doc)
	{
		if (doc.title === "The Something Awful Forums")
		{
			return doc.title;
		}
		return doc.title.replace(/( \- )?The Something ?Awful Forums( \- )?/i, '');
	},

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
		let oDomParser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
             .createInstance(Components.interfaces.nsIDOMParser);
		let forumsDoc = oDomParser.parseFromString("<?xml version=\"1.0\"?>\n<forumlist></forumlist>", "text/xml");
		//var targetEl = forumsDoc.documentElement;

		let forumsEl = forumsDoc.createElement("forums");
		forumsDoc.documentElement.appendChild(forumsEl);
		forumsDoc.documentElement.insertBefore(forumsDoc.createTextNode("\n"), forumsEl);

		for (let i = 0; i < rowList.length; )
		{
			i = PageUtils._addForums(forumsDoc, rowList, i, forumsEl, 0, statsMenu);
		}

		let {DB} = require("db"); // Used only in grabForumList
		let {Menus} = require("menus"); // Used only in grabForumList

		DB.forumListXml = forumsDoc;
		DB.gotForumList = true;
		Menus.rebuildAllMenus();
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

		var dashes = '--', elDepth = 0;
		if (statsMenu)
		{
			dashes = '---';
		}
		while (true)
		{
			if (forumTitle.indexOf(dashes) !== 0)
			{
				break;
			}

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
			var i = PageUtils._addForums(forumsDoc, rowList, index, fel, depth+1, statsMenu);

			if (i == index)
			{
				return i;
			}

			index = i;
		}
		return index;
	},

	insertSALRConfigLink: function(doc)
	{
		var usercpnode = PageUtils.selectSingleNode(doc, doc.body, "//UL[@id='navigation']/LI/A[contains(@href,'usercp.php')]");
		if (usercpnode)
		{
			var containerLi = doc.createElement("LI");
			var sep = doc.createTextNode(" - ");
			var newlink = doc.createElement("A");
			containerLi.appendChild(sep);
			containerLi.appendChild(newlink);
			newlink.appendChild( doc.createTextNode("Configure SALR") );
			usercpnode.parentNode.parentNode.insertBefore(containerLi, usercpnode.parentNode.nextSibling);
			newlink.href = "#";
			newlink.addEventListener("click", function(e)
			{
				e.stopPropagation();
				e.preventDefault();
				PageUtils.runConfig();
			}, true);
		}
	},

	runConfig: function(paneID, args)
	{
		let {Utils} = require("utils"); // used for runConfig
		Utils.runConfig(paneID, args);
	},

	// Try to figure out the current forum we're in
	// @param: (document) The current page being viewed
	// @return: (int) Forum ID, or (bool) false if unable to determine
	getForumId: function(doc)
	{
		let fid;

		// Look in the location bar
		let intitle = doc.location.href.match(/forumid=(\d+)/i);
		if (intitle)
		{
			fid = PageUtils.validateId(intitle[1]);
			if (fid)
				return fid;
		}

		// Check for body data-forum or body classing
		let body = doc.body;
		if (body.dataset.forum)
		{
			fid = PageUtils.validateId(body.dataset.forum);
			if (fid)
				return fid;
		}

		let bodyClassMatch = body.className.match(/forum_(\d+)/i);
		if (bodyClassMatch)
		{
			fid = PageUtils.validateId(bodyClassMatch[1]);
			if (fid)
				return fid;
		}

		// Look in the link for the post button
		let postbutton = this.selectSingleNode(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'forumid=')]");
		if (postbutton)
		{
			let inpostbutton = postbutton.href.match(/forumid=(\d+)/i);
			if (inpostbutton)
			{
				fid = PageUtils.validateId(inpostbutton[1]);
				if (fid)
					return fid;
			}
		}

		// Look in the hash added to urls
		let inhash = doc.location.hash.match(/forum(\d+)/i);
		if (inhash)
		{
			fid = PageUtils.validateId(inhash[1]);
				if (fid)
					return fid;
		}

		return false;
	},

	// Try to figure out the current thread we're in
	// @param: (document) The current page being viewed
	// @return: (int) Thread ID, or (bool) false if unable to determine
	getThreadId: function(doc)
	{
		let tid;

		// Look in the location bar
		let intitle = doc.location.href.match(/threadid=(\d+)/i);
		if (intitle)
		{
			tid = PageUtils.validateId(intitle[1]);
			if (tid)
				return tid;
		}

		// Check for body data-thread or body classing
		let body = doc.body;
		if (body.dataset.thread)
		{
			tid = PageUtils.validateId(body.dataset.thread);
			if (tid)
				return tid;
		}

		let bodyClassMatch = body.className.match(/thread_(\d+)/i);
		if (bodyClassMatch)
		{

			tid = PageUtils.validateId(bodyClassMatch[1]);
			if (tid)
				return tid;
		}

		// Look in the ? Link in the first post
		let filterlink = this.selectSingleNode(doc, doc, "//TD[contains(@class,'postdate')]//A[contains(@href,'threadid=')]");
		if (filterlink)
		{
			let inlink = filterlink.href.match(/threadid=(\d+)/i);
			if (inlink)
			{
				tid = PageUtils.validateId(inlink[1]);
				if (tid)
					return tid;
			}
		}

		// Look in the link for the reply button
		let replybutton = this.selectSingleNode(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'threadid=')]");
		if (replybutton)
		{
			let inreplybutton = replybutton.href.match(/threadid=(\d+)/i);
			if (inreplybutton)
			{
				tid = PageUtils.validateId(inreplybutton[1]);
				if (tid)
					return tid;
			}
		}

		// Look in the hash added to urls
		let inhash = doc.location.hash.match(/thread(\d+)/i);
		if (inhash)
		{
			tid = PageUtils.validateId(inhash[1]);
				if (tid)
					return tid;
		}

		return false;
	},

	/**
	 * Validates a potential forum or thread ID
	 * @param  {?}                id The ID to validate.
	 * @return {(number|boolean)} Returns the ID if valid, false if invalid.
	 */
	validateId: function(id)
	{
		id = parseInt(id, 10);
		if (id === 0 || isNaN(id))
		{
			id = false;
		}
		return id;	
	},

	// Unused
	inArchives: function(doc)
	{
		return false;
	},

	// Several little functions to test if we're in a special needs forum
	inFYAD: function(forumid)
	{
		return (forumid == 26 || forumid == 154 || forumid == 115);
	},
	// Unused
	inBYOB: function(forumid)
	{
		return (forumid == 174 || forumid == 176 || forumid == 194 || forumid == 208|| forumid == 268);
	},
	inYOSPOS: function(forumid)
	{
		return (forumid == 219);
	},
	inDump: function(forumid)
	{
		return (forumid == 133 || forumid == 163);
	},
	inAskTell: function(forumid)
	{
		return (forumid == 158);
	},
	// Unused
	inGoldmine: function(forumid)
	{
		return (forumid == 21);
	},
	inGasChamber: function(forumid)
	{
		return (forumid == 25);
	},
	// Unused; probably not up to date
	hasNoRatingBox: function(forumid)
	{
		// Note: 78 & 79 no longer in live forums as of 05/21/2015
		return (forumid == 93 || forumid == 188 || forumid == 61 || forumid == 77 ||
		 forumid == 78 || forumid == 79 || forumid == 115 || forumid == 25);
	},

	/**
	 * Simple element creation function.
	 * @param {Element} doc        Document element to create in.
	 * @param {string}  tag        Tag name for the new element.
	 * @param {Object}  attributes Attributes to set on the element.
	 * @param {Object}  properties Properties to set on the element.
	 * @param {Array}   children   Children to append to the element.
	 */
	createElement: function(doc, tag, attributes, properties, children)
	{
		let element = doc.createElement(tag);
		if (attributes)
		{
			for (let attrName in attributes)
				if (attributes.hasOwnProperty(attrName))
					element.setAttribute(attrName, attributes[attrName]);
		}
		if (properties)
		{
			for (let propName in properties)
				if (properties.hasOwnProperty(propName))
					element[propName] = properties[propName];
		}
		if (children)
		{
			for (let child of children)
				element.appendChild(child);
		}
		return element;
	},

	// Applies the given XPath and returns the first resultant node
	// @param:
	// @return:
	selectSingleNode: function(doc, context, xpath)
	{
		if (doc === null || context === null || xpath === null)
			throw "SALR Xpath Error";
		var nodeList = doc.evaluate(xpath, context, null, 9 /* XPathResult.FIRST_ORDERED_NODE_TYPE */, null);
		return nodeList.singleNodeValue;
	},

	// Applies the given XPath and returns all the nodes in it
	// @param:
	// @return:
	selectNodes: function(doc, context, xpath)
	{
		var nodes = doc.evaluate(xpath, context, null, 7 /* XPathResult.ORDERED_NODE_SNAPSHOT_TYPE */, null);
		var result = new Array(nodes.snapshotLength);
		for (var i=0; i<result.length; i++)
		{
			result[i] = nodes.snapshotItem(i);
		}
		return result;
	},
};
