/*

	Utility functions that might be called while parsing threads, forums, etc.

*/

let PageUtils = exports.PageUtils =
{
	// Output some text to the browser console
	logToConsole: function(someText)
	{
		let dConsole = Cc["@mozilla.org/consoleservice;1"]
					.getService(Ci.nsIConsoleService);
		dConsole.logStringMessage(someText);
	},

	/**
	 * Handle a message from Chrome to make a tab-modal prompt.
	 * This function should only be called from a frame script.
	 */
	promptInTab: function(message)
	{
		let msg = message.data.msg;
		let factory = Cc["@mozilla.org/prompter;1"].getService(Ci.nsIPromptFactory);
		let prompt = factory.getPrompt(content, Ci.nsIPrompt); // eslint-disable-line no-undef
		let bag = prompt.QueryInterface(Ci.nsIWritablePropertyBag2);
		bag.setPropertyAsBool("allowTabModal", true);
		prompt.alert.apply(null, ["SALR Alert", msg]);
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
		stylesheet.textContent = css;
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

	/**
	 * Inserts "Configure SALR" link into a page header.
	 * This function should only be called from a frame script.
	 */
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
				sendAsyncMessage("salastread:RunConfig"); // eslint-disable-line no-undef
			}, true);
		}
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
		let postbutton = PageUtils.selectSingleNode(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'forumid=')]");
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
		let filterlink = PageUtils.selectSingleNode(doc, doc, "//TD[contains(@class,'postdate')]//A[contains(@href,'threadid=')]");
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
		let replybutton = PageUtils.selectSingleNode(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'threadid=')]");
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

	/**
	 * Attempts to determine the number of pages in a document.
	 * @param  {Element} doc Document element to check.
	 * @return {Object} Object containing total number of pages and current page.
	 */
	getPagesForDoc: function(doc)
	{
		// For some reason the last child of pages top and pages bottom is different in threads
		let pageList = doc.querySelector("div.pages.bottom");
		// Handle no page list
		if (!pageList)
			return {'total': 1, 'current': 1};
		// Check if there's only one page
		if (pageList.childNodes.length <= 1)
			return {'total': 1, 'current': 1};
		if (!pageList.lastChild || !pageList.lastChild.textContent)
			return {'total': 1, 'current': 1};
		let numPages = pageList.lastChild.textContent.match(/(\d+)/);
		let curPage = PageUtils.selectSingleNode(doc, pageList, ".//OPTION[@selected='selected']");
		return {'total': parseInt(numPages[1], 10), 'current': parseInt(curPage.textContent, 10)};
	},

	/**
	 * Checks if a thread is closed.
	 * @param {Element} doc Document element to check in.
	 * @return {boolean} Whether the thread is closed.
	 */
	isThreadClosed: function(doc)
	{
		if (PageUtils.selectSingleNode(doc, doc, "//A[contains(@href,'action=newreply&threadid')]//IMG[contains(@src,'closed')]") === null)
			return false;
		else
			return true;
	},

	/**
	 * Checks if we're in a thread.
	 * @param {string} pathname The pathname to check.
	 * @return {boolean} Whether we're in a thread.
	 */
	areWeInAThread: function(pathname)
	{
		return(pathname.search(/^\/showthread.php/i) === 0);
	},

	/**
	 * Checks if a thread is in the archives.
	 *		NOTE: As of 05/21/2015, archives can currently be detected by a
	 *		thread lacking a bookmark star and the thread rate box lacking
	 *		proper children. Before changing how this is determined,
	 *		make sure to test:
	 *			- Threads from live forums
	 *			- Threads from forums which lack a rate box
	 *			- Threads 'locked for archiving'
	 *			- Archived threads
	 * @param {Element} doc Document element to check in.
	 */
	isThreadInArchives: function(doc)
	{
		let threadRateBox = PageUtils.selectSingleNode(doc, doc, "//DIV[@class='threadrate']");
		let bookmarkStar = PageUtils.selectSingleNode(doc, doc, "//img[contains(@class,'thread_bookmark')]");
		return (!bookmarkStar && !!threadRateBox && !threadRateBox.firstChild.nextSibling);
	},

	// Deprecated
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
