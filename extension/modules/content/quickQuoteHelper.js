/**
 * @fileOverview Page-related functions that support quick quote.
 */

let {PageUtils} = require("pageUtils");
let {Prefs} = require("content/prefsHelper");
let {DB} = require("content/dbHelper");

let QuickQuoteHelper = exports.QuickQuoteHelper = 
{
	/**
	 * Whether the page has been attached. Used by PLH so we aren't sending
	 *     a ton of CPOWs with page unloads.
	 * @type {boolean}
	 */
	pageWasAttached: false,

	/**
	 * Whether forge-checking function said we need to fill a reply page
	 *     with a saved quick reply.
	 * @type {boolean}
	 */
	needRegReplyFill: false,
	/**
	 * Converts post and reply buttons into quick buttons.
	 * @param {Element} doc          Document in which to convert buttons.
	 * @param {number}  forumid      Forum ID.
	 * @param {number}  threadid     Thread ID.
	 * @param {boolean} threadClosed Whether the thread is closed.
	 */
	makeQuickPostReplyButtons: function(doc, forumid, threadid, threadClosed)
	{
		let postbuttons = PageUtils.selectNodes(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newthread')]");
		if (postbuttons.length > 0)
		{
			for (let postbutton of postbuttons)
			{
				QuickQuoteHelper.turnIntoQuickButton(doc, postbutton, forumid).addEventListener("click", QuickQuoteHelper.quickButtonClicked.bind(null, forumid, threadid), true);
			}
		}
		if (threadClosed)
			return;
		let replybuttons = PageUtils.selectNodes(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newreply&threadid')]");
		if (replybuttons.length === 0)
			return;
		for (let replybutton of replybuttons)
		{
			QuickQuoteHelper.turnIntoQuickButton(doc, replybutton, forumid).addEventListener("click", QuickQuoteHelper.quickButtonClicked.bind(null, forumid, threadid), true);
		}
	},

	/**
	 * Takes a button and turns it into a quick button.
	 * @param {Element} doc     Document element to work in.
	 * @param {Node}    button  Node snapshot of button to convert.
	 * @param {number}  forumid Forum ID.
	 * @return {Element} quick button
	 */
	turnIntoQuickButton: function(doc, button, forumid)
	{
		var oldsrc = button.firstChild.src;
		var oldalt = button.firstChild.alt;
		button.firstChild.style.width = "12px";
		button.firstChild.style.height = "20px";
		button.firstChild.alt = "Normal " + oldalt;
		button.firstChild.title = "Normal " + oldalt;
		var quickbutton = doc.createElement("img");

		if (PageUtils.inBYOB(forumid))
		{
			button.firstChild.src = "chrome://salastread/skin/quickbutton-byob.gif";
		}
		else if (PageUtils.inYOSPOS(forumid))
		{
			button.firstChild.src = "chrome://salastread/skin/quickbutton.gif";
			button.firstChild.style.paddingBottom = "0px";
			quickbutton.style.backgroundImage = "none !important";
		}
		else
		{
			button.firstChild.src = "chrome://salastread/skin/quickbutton.gif";
		}
		quickbutton.src = oldsrc;
		quickbutton.alt = "Quick " + oldalt;
		quickbutton.title = "Quick " + oldalt;
		quickbutton.border = "0";
		quickbutton.style.cursor = "pointer";

		button.parentNode.insertBefore(quickbutton, button);
		return quickbutton;
	},

	/**
	 * Event handler for clicking a quick button.
	 * @param {number} forumid  ID of current forum.
	 * @param {number} threadid ID of current thread.
	 * @param {Event}  evt      The click event.
	 */
	quickButtonClicked: function(forumid, threadid, evt)
	{
		let quickbutton = evt.originalTarget;

		let newParams = {
			forumid: forumid,
			threadid: threadid,
		};
		QuickQuoteHelper.setNewParamsFromLink(quickbutton.nextSibling.href, newParams);

//content.alert("Clicked: quicktype: " + newParams.quicktype + " threadid " + newParams.threadid + " forumid " + newParams.forumid + " postid " + newParams.postid);
		// e10s - CPOW
		sendAsyncMessage("salastread:QuickButtonClicked", newParams, {doc: evt.originalTarget.ownerDocument});
		QuickQuoteHelper.pageWasAttached = true;
	},

	/**
	 * Determines type of quick button clicked + sets postid param if needed.
	 * @param {string} link      Link from normal version of button.
	 * @param {Object} newParams Parameters for handling the clicked button.
	 */
	setNewParamsFromLink: function(link, newParams)
	{
		newParams.quicktype = link.match(/action=(\w+)/i)[1];
		if (newParams.quicktype === 'newthread')
			return;
		if (newParams.quicktype === 'newreply')
		{
			if (link.match(/threadid=(\d+)/i))
			{
				newParams.quicktype = 'reply';
				return;
			}
			else
			{
				newParams.quicktype = 'quote';
			}
		}
		// 'editpost' and 'quote' need a post ID:
		newParams.postid = link.match(/postid=(\d+)/i)[1];
	},

	/**
	 * Handler for edit post pages.
	 * @param {Element} doc Document element to handle.
	 */
	handleEditPost: function(doc)
	{
		var submitbtn = PageUtils.selectNodes(doc, doc.body, "//INPUT[@type='submit'][@value='Save Changes']")[0];
		var tarea = PageUtils.selectNodes(doc, doc.body, "//TEXTAREA[@name='message']")[0];
		if (!submitbtn || !tarea)
			return;
		submitbtn.addEventListener("click", function() { QuickQuoteHelper.parsePLTagsInEdit(tarea); }, true);
		submitbtn.style.backgroundColor = Prefs.getPref('postedInThreadRe');
	},

	/**
	 * Helper function to convert PL tags to post links.
	 * @param  {string} message Message to convert PL tags in.
	 * @return {string} The converted message.
	 */
	convertPLTag: function(message)
	{
		return message.replace(/\[PL=(.*?)\](.*?)\[\/PL\]/g,"[URL=http://forums.somethingawful.com/showthread.php?s=&postid=$1#post$1]$2[/URL]");
	},

	/**
	 * Converts PL tags in a text area to post links.
	 * @param {Node} tarea Node snapshot of text area to process.
	 */
	parsePLTagsInEdit: function(tarea)
	{
		var xtxt = tarea.value;
		tarea.value = QuickQuoteHelper.convertPLTag(xtxt);
	},

	/**
	 * Handler for reply and quote pages.
	 * @param {Element} doc Document element to handle.
	 */
	handleNewReply: function(doc)
	{
		let threadlink = PageUtils.selectSingleNode(doc, doc.body, "DIV[contains(@id, 'container')]//div[@class='breadcrumbs']//A[contains(@href,'showthread.php')][contains(@href,'threadid=')]");
		if (!threadlink)
		{
			QuickQuoteHelper.handleNewReplyForgeAlert(doc);
			return;
		}
		var tlmatch = threadlink.href.match( /threadid=(\d+)/ );
		if (!tlmatch)
			return;
		let threadid = tlmatch[1];
		if (QuickQuoteHelper.needRegReplyFill)
		{
			let msgEl = PageUtils.selectSingleNode(doc, doc.body, "//TEXTAREA[@name='message']");
			if (msgEl)
			{
				msgEl.value = sendSyncMessage("salastread:QuickQuoteGetSavedQuickReply");
			}
			QuickQuoteHelper.needRegReplyFill = false;
		}
		let postbtn = PageUtils.selectSingleNode(doc, doc.body, "//FORM[@name='vbform']//INPUT[@name='submit']");
		if (postbtn)
		{
			postbtn.addEventListener("click", function() { DB.iPostedHere(threadid); }, true);
			postbtn.style.backgroundColor = Prefs.getPref('postedInThreadRe');
		}
	},

	/**
	 * Potentially not-working function to handle SA's forged post check.
	 * @param {Element} doc Document element to handle.
	 */
	handleNewReplyForgeAlert: function(doc)
	{
		if (sendSyncMessage("salastread:QuickQuoteGetSavedQuickReply") === "")
			return;

		var forgeCheck = PageUtils.selectSingleNode(doc, doc.body, "TABLE/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[2]/TD[1]/FONT[contains(text(),'have been forged')]");
		if (!forgeCheck)
		{
			sendAsyncMessage("salastread:QuickQuoteClearSavedQuickReply");
			return;
		}
		sendAsyncMessage("salastread:QuickQuoteClearCachedFormKey");

		var reqMsg = doc.createElement("P");
		reqMsg.style.fontFamily = "Verdana, Arial, Helvetica";
		reqMsg.style.fontSize = "80%";
		reqMsg.style.backgroundColor = "#fcfd99";
		reqMsg.style.border = "1px solid black";
		reqMsg.style.padding = "2px 2px 2px 2px";
		reqMsg.appendChild(
			doc.createTextNode("Message from SA Last Read: Quick Reply appears to have worked incorrectly. To open your reply in a regular forum reply page, click ")
		);
		var regReplyLink = doc.createElement("A");
		// TODO: This likely will need to be changed to an addeventlistener
		regReplyLink.onclick = function() { QuickQuoteHelper.needRegReplyFill = true; };
		regReplyLink.href = "http://forums.somethingawful.com/newreply.php?s=&action=newreply&threadid=" +
			sendSyncMessage("salastread:QuickQuoteGetSavedQuickReplyThreadID");
		regReplyLink.textContent = "here.";
		reqMsg.appendChild(regReplyLink);
		forgeCheck.parentNode.insertBefore(reqMsg, forgeCheck);
	},

};
