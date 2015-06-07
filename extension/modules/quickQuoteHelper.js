/**
 * @fileOverview Page-related functions that support quick quote.
 */

let {DB} = require("db");
let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");

let QuickQuoteHelper = exports.QuickQuoteHelper = 
{
	// Quick Quote things

	quickquotewin: null,

	quickWindowParams: {
		quicktype: null,
		threadid: null,
		forumid: null,
		postid: null,
		doc: null,
	},

	needRegReplyFill: false,
	quickQuoteSubmitting: false,
	savedQuickReply: "",
	savedQuickReplyThreadId: "",

	handleEditPost: function(doc)
	{
		var submitbtn = PageUtils.selectNodes(doc, doc.body, "//INPUT[@type='submit'][@value='Save Changes']")[0];
		var tarea = PageUtils.selectNodes(doc, doc.body, "//TEXTAREA[@name='message']")[0];
		if (!submitbtn || !tarea)
			return;
		submitbtn.addEventListener("click", function() { QuickQuoteHelper.parsePLTagsInEdit(tarea); }, true);
		submitbtn.style.backgroundColor = Prefs.getPref('postedInThreadRe');
	},

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
				msgEl.value = QuickQuoteHelper.savedQuickReply;
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

	handleNewReplyForgeAlert: function(doc)
	{
		if (QuickQuoteHelper.savedQuickReply === "")
			return;
		// TODO: Check if this function is broken.
		var forgeCheck = PageUtils.selectSingleNode(doc, doc.body, "TABLE/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[2]/TD[1]/FONT[contains(text(),'have been forged')]");
		if (!forgeCheck)
		{
			QuickQuoteHelper.savedQuickReply = "";
			QuickQuoteHelper.savedQuickReplyThreadId = "";
			return;
		}
		DB.__cachedFormKey = "";
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
		QuickQuoteHelper.savedQuickReplyThreadId;
		regReplyLink.textContent = "here.";
		reqMsg.appendChild(regReplyLink);
		forgeCheck.parentNode.insertBefore(reqMsg, forgeCheck);
	},

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

	// Takes a button and turns it into a quick button
	// @param: (html element) doc, (html element) button, (int) forumid
	// @return: (html element) quick button
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
		var quickbutton = evt.originalTarget;
		let {Utils} = require("utils");
		let window = Utils.getRecentWindow();

		let newParams = {
			forumid: forumid,
			threadid: threadid,
			doc: evt.originalTarget.ownerDocument
		};
		QuickQuoteHelper.setNewParamsFromLink(quickbutton.nextSibling.href, newParams);

//window.alert("Clicked: quicktype: " + newParams.quicktype + " threadid " + newParams.threadid + " forumid " + newParams.forumid + " postid " + newParams.postid);

		// Do we already have a window?
		if (DB.__quickquotewindowObject && !DB.__quickquotewindowObject.closed)
		{
			QuickQuoteHelper.quickquotewin = DB.__quickquotewindowObject;
		}

		if (!QuickQuoteHelper.quickquotewin || QuickQuoteHelper.quickquotewin.closed)
		{
			QuickQuoteHelper.openNewQuickQuoteWindow(window, newParams);
			DB.__quickquotewindowObject = QuickQuoteHelper.quickquotewin;
			return;
		}
		try
		{
			// Clicked an edit button
			if (newParams.quicktype === 'editpost')
			{
				// There is already a quick window open. Is it an edit window?
				if (QuickQuoteHelper.quickWindowParams.quicktype === 'editpost')
				{
					// Is it the same post?
					if (QuickQuoteHelper.quickWindowParams.postid && QuickQuoteHelper.quickWindowParams.postid === newParams.postid)
					{
						// Attempt to reattach
						QuickQuoteHelper.reattachQuickQuoteWindow(newParams.doc);
					}
					else
					{
						if (window.confirm("You already have a quick edit window open, but it was attached to a different post.\nDo you want to change which post you're editing?"))
						{
							QuickQuoteHelper.convertQuickQuoteWindow(newParams);
						}
					}
				}
				else
				{
					if (window.confirm("You already have a quick window open. Press 'OK' to convert it to a quick edit window for this post, \nor press 'Cancel' to append this post to your quick window."))
					{
						QuickQuoteHelper.convertQuickQuoteWindow(newParams);
					}
					else
					{
						QuickQuoteHelper.reattachQuickQuoteWindow(newParams.doc);
						QuickQuoteHelper.quickquotewin.addQuoteFromPost(newParams.postid);
					}
				}
			}
			// Clicked a 'quote' button
			else if (newParams.quicktype === 'quote')
			{
				// Always add quotes when quote is clicked
				QuickQuoteHelper.reattachQuickQuoteWindow(newParams.doc);
				QuickQuoteHelper.quickquotewin.addQuoteFromPost(newParams.postid);
			}
			// Clicked a 'reply' button
			else if (newParams.quicktype === 'reply')
			{
				// Check if we need to reattach, otherwise offer to convert
				if (QuickQuoteHelper.quickWindowParams.quicktype && QuickQuoteHelper.quickWindowParams.quicktype === 'reply' && QuickQuoteHelper.quickWindowParams.threadid && QuickQuoteHelper.quickWindowParams.threadid === newParams.threadid)
				{
					QuickQuoteHelper.reattachQuickQuoteWindow(newParams.doc);
				}
				else
				{
					if (window.confirm("You already have a quick window open. Press 'OK' to convert it \nto a quick reply window for this thread, or press 'Cancel' to leave it alone."))
					{
						QuickQuoteHelper.convertQuickQuoteWindow(newParams);
					}				
				}
			}
			// Clicked anything else
			else
			{
				if (window.confirm("You already have a quick window open. Press 'OK' to convert it \nto a quick " + newParams.quicktype + " window, or press 'Cancel' to leave it alone."))
				{
					QuickQuoteHelper.convertQuickQuoteWindow(newParams);
				}
			}
			QuickQuoteHelper.quickquotewin.focus();
		}
		catch(ex)
		{
			//alert("Error communicating with the quick window: " + ex);
			QuickQuoteHelper.quickquotewin = window.openDialog("chrome://salastread/content/quickquote.xul", "quickquote", "chrome, resizable=yes, dialog=no, width=800, height=400");
		}

		if (QuickQuoteHelper.quickquotewin)
		{
			DB.__quickquotewindowObject = QuickQuoteHelper.quickquotewin;
		}
		return false;
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
	 * Opens a new quick quote window with specified paramters.
	 * @param {Window} window    Window from which to open the dialog.
	 * @param {Object} newParams New quick quote parameters.
	 */
	openNewQuickQuoteWindow: function(window, newParams)
	{
		QuickQuoteHelper.setQuickWindowParameters(newParams);
		QuickQuoteHelper.quickquotewin = window.openDialog("chrome://salastread/content/quickquote.xul", "quickquote", "chrome, resizable=yes, dialog=no, width=800, height=400");
	},

	/**
	 * Converts a quick quote window from an old set of parameters to a new set.
	 *     Attaches to the new SA document and imports the new quick quote data.
	 * @param {Object} newParams New quick quote parameters.
	 */
	convertQuickQuoteWindow: function(newParams)
	{
		QuickQuoteHelper.setQuickWindowParameters(newParams);
		QuickQuoteHelper.quickquotewin.reattach();
		QuickQuoteHelper.quickquotewin.importData();
	},

	/**
	 * Sets quick window parameters to a new set of parameters.
	 * @param {Object} newParams New quick quote parameters.
	 */
	setQuickWindowParameters: function(newParams)
	{
		QuickQuoteHelper.quickWindowParams.quicktype = newParams.quicktype;
		QuickQuoteHelper.quickWindowParams.threadid = newParams.threadid;
		QuickQuoteHelper.quickWindowParams.forumid = newParams.forumid;
		QuickQuoteHelper.quickWindowParams.postid = newParams.postid;
		QuickQuoteHelper.quickWindowParams.doc = newParams.doc;
	},

	/**
	 * Reattaches a detached quick quote window to a new document without
	 *     changing any other parameters.
	 * @param {Element} doc Document to attach to.
	 */
	reattachQuickQuoteWindow: function(doc)
	{
		if (!QuickQuoteHelper.quickquotewin.isDetached)
			return;
		QuickQuoteHelper.quickWindowParams.doc = doc;
		QuickQuoteHelper.quickquotewin.reattach();
	},


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Quick Quote/Post/Edit/Whatever Functions ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	// Quick quote / edit post util functions
	convertPLTag: function(message)
	{
		return message.replace(/\[PL=(.*?)\](.*?)\[\/PL\]/g,"[URL=http://forums.somethingawful.com/showthread.php?s=&postid=$1#post$1]$2[/URL]");
	},

	parsePLTagsInEdit: function(tarea)
	{
	   var xtxt = tarea.value;
	   tarea.value = QuickQuoteHelper.convertPLTag(xtxt);
	},

	quickQuoteSubmit: function(message, parseurl, subscribe, disablesmilies, signature, subtype, formkey, attachfile, form_cookie)
	{
		try
		{
			message = QuickQuoteHelper.convertPLTag(message);
			QuickQuoteHelper.savedQuickReply = message;
			QuickQuoteHelper.savedQuickReplyThreadId = QuickQuoteHelper.quickWindowParams.threadid;

			var doc = QuickQuoteHelper.quickWindowParams.doc;
			var newform = doc.createElement("FORM");
				newform.style.display = "none";
				newform.action = "http://forums.somethingawful.com/newreply.php";

			newform.method = "post";
			newform.enctype = "multipart/form-data";
			PageUtils.addHiddenFormInput(doc,newform,"s","");

			if (QuickQuoteHelper.quickWindowParams.quicktype === "newthread")
			{
				newform.action = "http://forums.somethingawful.com/newthread.php";
				PageUtils.addHiddenFormInput(doc, newform,"action", "postthread");
				PageUtils.addHiddenFormInput(doc, newform, "forumid",  QuickQuoteHelper.quickWindowParams.forumid);
				PageUtils.addHiddenFormInput(doc, newform, "iconid", QuickQuoteHelper.quickquotewin.document.getElementById('posticonbutton').iconid);
				PageUtils.addHiddenFormInput(doc, newform, "subject", QuickQuoteHelper.quickquotewin.document.getElementById('subject').value);
			}
			else if (QuickQuoteHelper.quickWindowParams.quicktype === "editpost")
			{
				newform.action = "http://forums.somethingawful.com/editpost.php";
				PageUtils.addHiddenFormInput(doc, newform,"action", "updatepost");
				PageUtils.addHiddenFormInput(doc, newform, "postid", QuickQuoteHelper.quickWindowParams.postid);
			}
			else if (QuickQuoteHelper.quickWindowParams.quicktype === "quote" || QuickQuoteHelper.quickWindowParams.quicktype === "reply")
			{
				PageUtils.addHiddenFormInput(doc, newform,"action", "postreply");
				PageUtils.addHiddenFormInput(doc, newform,"threadid", QuickQuoteHelper.quickWindowParams.threadid);
			}

			PageUtils.addHiddenFormInput(doc, newform,"parseurl", parseurl ? "yes" : "");
			PageUtils.addHiddenFormInput(doc, newform,"bookmark", subscribe ? "yes" : "");
			PageUtils.addHiddenFormInput(doc, newform,"disablesmilies", disablesmilies ? "yes" : "");
			PageUtils.addHiddenFormInput(doc, newform,"signature", signature ? "yes" : "");
			PageUtils.addHiddenFormInput(doc, newform,"message", message);
			PageUtils.addHiddenFormInput(doc, newform,"MAX_FILE_SIZE", "2097152");
			PageUtils.addHiddenFormInput(doc, newform,"formkey", formkey);

			if (form_cookie !== "")
			{
				PageUtils.addHiddenFormInput(doc, newform,"form_cookie", form_cookie);
			}
			if (attachfile !== "")
			{
				QuickQuoteHelper.quickQuoteAddFile(doc, newform,"attachment", attachfile);
			}
			newform.__submit = newform.submit;

			if (QuickQuoteHelper.quickWindowParams.quicktype !== "newthread")
			{
				if (subtype==="submit")
				{
					PageUtils.addHiddenFormInput(doc,newform,"submit","Submit Reply");
					DB.iPostedHere(QuickQuoteHelper.quickWindowParams.threadid);
				}
				else
				{
					PageUtils.addHiddenFormInput(doc,newform,"preview","Preview Reply");
				}
			}
			else
			{
				PageUtils.addHiddenFormInput(doc,newform,"preview","Preview Post");
			}
			doc.body.appendChild(newform);
			QuickQuoteHelper.quickQuoteSubmitting = true;
			newform.__submit();
			QuickQuoteHelper.quickquotewin.close();
		}
		catch(e)
		{
			Cu.warn("SALR Quick Window error: " + e);
		}
	},

	quickQuoteAddFile: function(doc,form,name,value)
	{
	   var newel = doc.createElement("INPUT");
	   newel.type = "file";
	   newel.name = name;
	   newel.value = value;
	   form.appendChild(newel);
	},

	releaseQuickQuoteVars: function()
	{
		QuickQuoteHelper.quickWindowParams.quicktype = null;
		QuickQuoteHelper.quickWindowParams.threadid = null;
		QuickQuoteHelper.quickWindowParams.forumid = null;
		QuickQuoteHelper.quickWindowParams.postid = null;
		QuickQuoteHelper.quickWindowParams.doc = null;
		QuickQuoteHelper.quickQuoteSubmitting = false;
		QuickQuoteHelper.quickquotewin = null;
	},

};
