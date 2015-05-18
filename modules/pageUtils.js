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

	// Try to figure out the current forum we're in
	// @param: (document) The current page being viewed
	// @return: (int) Forum ID, or (bool) false if unable to determine
	getForumId: function(doc)
	{
		var fid = 0;

		while (true) // Not actually going to loop, I just want to be able to break out
		{
			// Look in the location bar
			var intitle = doc.location.href.match(/forumid=(\d+)/i);
			if (intitle)
			{
				fid = parseInt(intitle[1],10);
				if (!isNaN(fid)) break;
			}

			// Look in the link for the post button
			var postbutton = this.selectSingleNode(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'forumid=')]");
			if (postbutton)
			{
				var inpostbutton = postbutton.href.match(/forumid=(\d+)/i);
				if (inpostbutton)
				{
					fid = parseInt(inpostbutton[1],10);
					if (!isNaN(fid)) break;
				}
			}

			// Look in the hash added to urls
			var inhash = doc.location.hash.match(/forum(\d+)/i);
			if (inhash)
			{
				fid = parseInt(inhash[1],10);
				if (!isNaN(fid)) break;
			}

			break;
		}

		if (fid == 0 || isNaN(fid))
		{
			fid = false;
		}
		return fid;
	},

	// Try to figure out the current thread we're in
	// @param: (document) The current page being viewed
	// @return: (int) Thread ID, or (bool) false if unable to determine
	getThreadId: function(doc)
	{
		var tid = 0;

		while (true) // Not actually going to loop, I just want to be able to break out
		{
			// Look in the location bar
			var intitle = doc.location.href.match(/threadid=(\d+)/i);
			if (intitle)
			{
				tid = parseInt(intitle[1],10);
				if (!isNaN(tid)) break;
			}

			// Look in the ? Link in the first post
			var filterlink = this.selectSingleNode(doc, doc, "//TD[contains(@class,'postdate')]//A[contains(@href,'threadid=')]");
			if (filterlink)
			{
				var inlink = filterlink.href.match(/threadid=(\d+)/i);
				if (inlink)
				{
					tid = parseInt(inlink[1],10);
					if (!isNaN(tid)) break;
				}
			}

			// Look in the link for the reply button
			var replybutton = this.selectSingleNode(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'threadid=')]");
			if (replybutton)
			{
				var inreplybutton = replybutton.href.match(/threadid=(\d+)/i);
				if (inreplybutton)
				{
					tid = parseInt(inreplybutton[1],10);
					if (!isNaN(tid)) break;
				}
			}

			// Look in the hash added to urls
			var inhash = doc.location.hash.match(/thread(\d+)/i);
			if (inhash)
			{
				tid = parseInt(inhash[1],10);
				if (!isNaN(tid)) break;
			}

			break;
		}

		if (tid == 0 || isNaN(tid))
		{
			tid = false;
		}
		return tid;
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
		return (forumid == 93 || forumid == 188 || forumid == 61 || forumid == 77 ||
		 forumid == 78 || forumid == 79 || forumid == 115 || forumid == 25);
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
