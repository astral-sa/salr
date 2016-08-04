/**
 * @fileOverview Interface functions that support quick quote.
 */

let {DB} = require("db");
let {PageUtils} = require("pageUtils");
let {Utils} = require("utils");

let QuickQuoteHelper = exports.QuickQuoteHelper = 
{
	/**
	 * Set up listeners for quick buttons and reply page handler.
	 */
	init: function()
	{
		let globalMM = Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);
		globalMM.addMessageListener("salastread:QuickButtonClicked", QuickQuoteHelper.quickButtonClicked);
		onShutdown.add(() => globalMM.removeMessageListener("salastread:QuickButtonClicked", QuickQuoteHelper.quickButtonClicked));
		globalMM.addMessageListener("salastread:QuickQuoteCheckUnload", QuickQuoteHelper.checkUnload);
		onShutdown.add(() => globalMM.removeMessageListener("salastread:QuickQuoteCheckUnload", QuickQuoteHelper.checkUnload));
		Utils.addFrameMessageListener("salastread:QuickQuoteGetSavedQuickReply", () => QuickQuoteHelper.savedQuickReply);
		Utils.addFrameMessageListener("salastread:QuickQuoteGetSavedQuickReplyThreadID", () => QuickQuoteHelper.savedQuickReplyThreadId);
		Utils.addFrameMessageListener("salastread:QuickQuoteClearSavedQuickReply", () => {
			QuickQuoteHelper.savedQuickReply = "";
			QuickQuoteHelper.savedQuickReplyThreadId = "";
		});
		Utils.addFrameMessageListener("salastread:QuickQuoteClearCachedFormKey", () => {
			DB.__cachedFormKey = "";
		});
	},

	// Quick Quote things

	quickquotewin: null,

	quickWindowParams: {
		quicktype: null,
		threadid: null,
		forumid: null,
		postid: null,
		targetMM: null,
		wasBookmarked: null
	},

	needCleanupCheck: false,
	quickQuoteSubmitting: false,
	savedQuickReply: "",
	savedQuickReplyThreadId: "",

	/**
	 * Message handler for clicking a quick button.
	 * @param {Object} message Message from frame script containing newParams
	 *                             and doc CPOW.
	 */
	quickButtonClicked: function(message)
	{
		let target = message.target.messageManager;
		let newParams = message.data.data;
		newParams.targetMM = target;

		let window = Utils.getRecentWindow();
//window.alert("Received: quicktype: " + newParams.quicktype + " threadid " + newParams.threadid + " forumid " + newParams.forumid + " postid " + newParams.postid);

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
						QuickQuoteHelper.reattachQuickQuoteWindow(newParams.targetMM);
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
						QuickQuoteHelper.reattachQuickQuoteWindow(newParams.targetMM);
						QuickQuoteHelper.quickquotewin.addQuoteFromPost(newParams.postid);
					}
				}
			}
			// Clicked a 'quote' button
			else if (newParams.quicktype === 'quote')
			{
				// Always add quotes when quote is clicked
				QuickQuoteHelper.reattachQuickQuoteWindow(newParams.targetMM);
				QuickQuoteHelper.quickquotewin.addQuoteFromPost(newParams.postid);
			}
			// Clicked a 'reply' button
			else if (newParams.quicktype === 'reply')
			{
				// Check if we need to reattach, otherwise offer to convert
				if (QuickQuoteHelper.quickWindowParams.quicktype && QuickQuoteHelper.quickWindowParams.quicktype === 'reply' && QuickQuoteHelper.quickWindowParams.threadid && QuickQuoteHelper.quickWindowParams.threadid === newParams.threadid)
				{
					QuickQuoteHelper.reattachQuickQuoteWindow(newParams.targetMM);
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
			QuickQuoteHelper._openQuickQuoteWin(window);
		}

		if (QuickQuoteHelper.quickquotewin)
		{
			DB.__quickquotewindowObject = QuickQuoteHelper.quickquotewin;
		}
		return false;
	},

	/**
	 * Message handler for checking if a page was attached before it unloads.
	 *     This is used to detach the quick quote window, if necessary.
	 * @param {Object} message Message from current tab's message manager.
	 */
	checkUnload: function(message)
	{
		let curTarget = message.target.messageManager;
		if (QuickQuoteHelper.quickWindowParams.targetMM && (curTarget === QuickQuoteHelper.quickWindowParams.targetMM))
		{
			// Bail if we're just submitting.
			if (QuickQuoteHelper.quickQuoteSubmitting)
				return true;

			// The attached page was closed - detach!
			if (QuickQuoteHelper.quickquotewin && !QuickQuoteHelper.quickquotewin.closed)
				QuickQuoteHelper.quickquotewin.detachFromDocument();
			return true;
		}
	},

	/**
	 * Cleans up quick quote window on addon shutdown.
	 */
	cleanupCheck: function()
	{
		// Bail if no open window
		if (QuickQuoteHelper.quickquotewin === null)
			return;

		// Close if detached (can't submit preview)
		if (QuickQuoteHelper.quickquotewin.isDetached)
		{
			QuickQuoteHelper.quickquotewin.close();
			return;
		}

		// Submit as preview
		QuickQuoteHelper.quickquotewin.doSubmit('preview');
	},

	/**
	 * Opens a new quick quote window with specified paramters.
	 * @param {Window} window    Window from which to open the dialog.
	 * @param {Object} newParams New quick quote parameters.
	 */
	openNewQuickQuoteWindow: function(window, newParams)
	{
		if (QuickQuoteHelper.needCleanupCheck === false)
		{
			QuickQuoteHelper.needCleanupCheck = true;
			onShutdown.add(function() { QuickQuoteHelper.cleanupCheck(); });
		}
		QuickQuoteHelper.setQuickWindowParameters(newParams);
		QuickQuoteHelper._openQuickQuoteWin(window);
	},

	/**
	 * Opens the quick quote window.
	 * @param {Window} window Window from which to open the dialog.
	 */
	_openQuickQuoteWin: function(window)
	{
		QuickQuoteHelper.quickquotewin = window.openDialog("chrome://salastread/content/quickquote.xul", "quickquote", "chrome, resizable=yes, dialog=no, width=800, height=400, left=" + window.screenX + ", top=" + window.screenY);
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
		QuickQuoteHelper.quickWindowParams.targetMM = newParams.targetMM;
		QuickQuoteHelper.quickWindowParams.wasBookmarked = newParams.wasBookmarked;
	},

	/**
	 * Reattaches a detached quick quote window to a browser tab without
	 *     changing any other parameters.
	 * @param {Object} targetMM Message manager to attach to.
	 */
	reattachQuickQuoteWindow: function(targetMM)
	{
		if (!QuickQuoteHelper.quickquotewin.isDetached)
			return;
		QuickQuoteHelper.quickWindowParams.targetMM = targetMM;
		QuickQuoteHelper.quickquotewin.reattach();
	},


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Quick Quote/Post/Edit/Whatever Functions ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


	// Quick quote / edit post util functions
	convertPLTag: function(message)
	{
		return message.replace(/\[PL=(.*?)\](.*?)\[\/PL\]/g,"[URL=https://forums.somethingawful.com/showthread.php?s=&postid=$1#post$1]$2[/URL]");
	},

	quickQuoteSubmit: function(message, parseurl, subscribe, disablesmilies, signature, subtype, formkey, attachfile, form_cookie)
	{
		try
		{
			message = QuickQuoteHelper.convertPLTag(message);
			QuickQuoteHelper.savedQuickReply = message;
			QuickQuoteHelper.savedQuickReplyThreadId = QuickQuoteHelper.quickWindowParams.threadid;

			let quickFormAction = "https://forums.somethingawful.com/newreply.php";
			let quickFormOptions = {
				s: ""
			};
			let quickAttachFile = null;

			if (QuickQuoteHelper.quickWindowParams.quicktype === "newthread")
			{
				quickFormAction = "https://forums.somethingawful.com/newthread.php";
				quickFormOptions.action = "postthread";
				quickFormOptions.forumid = QuickQuoteHelper.quickWindowParams.forumid;
				quickFormOptions.iconid = QuickQuoteHelper.quickquotewin.document.getElementById('posticonbutton').iconid;
				quickFormOptions.subject = QuickQuoteHelper.quickquotewin.document.getElementById('subject').value;
			}
			else if (QuickQuoteHelper.quickWindowParams.quicktype === "editpost")
			{
				quickFormAction = "https://forums.somethingawful.com/editpost.php";
				quickFormOptions.action = "updatepost";
				quickFormOptions.postid = QuickQuoteHelper.quickWindowParams.postid;
			}
			else if (QuickQuoteHelper.quickWindowParams.quicktype === "quote" || QuickQuoteHelper.quickWindowParams.quicktype === "reply")
			{
				quickFormOptions.action = "postreply";
				quickFormOptions.threadid = QuickQuoteHelper.quickWindowParams.threadid;
			}

			quickFormOptions.parseurl = parseurl ? "yes" : "";
			quickFormOptions.bookmark = subscribe ? "yes" : "";
			quickFormOptions.disablesmilies = disablesmilies ? "yes" : "";
			quickFormOptions.signature = signature ? "yes" : "";
			quickFormOptions.message = message;
			quickFormOptions.MAX_FILE_SIZE = "2097152";
			quickFormOptions.formkey = formkey;

			if (form_cookie !== "")
			{
				quickFormOptions.form_cookie = form_cookie;
			}
			if (attachfile !== "")
			{
				// Create a file object in chrome scope to send to content
				Cu.importGlobalProperties( [ "File" ] );
				quickAttachFile = new File(attachfile);
			}

			if (QuickQuoteHelper.quickWindowParams.quicktype !== "newthread")
			{
				if (subtype==="submit")
				{
					quickFormOptions.submit = "Submit Reply";
					DB.iPostedHere(QuickQuoteHelper.quickWindowParams.threadid);
				}
				else
				{
					quickFormOptions.preview = "Preview Reply";
				}
			}
			else
			{
				quickFormOptions.preview = "Preview Post";
			}

			QuickQuoteHelper.quickQuoteSubmitting = true;

			// Send message to frame script to submit with information
			QuickQuoteHelper.quickWindowParams.targetMM.sendAsyncMessage("salastread:QuickWindowSubmit", {
				quickFormAction: quickFormAction,
				quickFormOptions: quickFormOptions,
				quickAttachFile: quickAttachFile
			});
			QuickQuoteHelper.quickquotewin.close();
		}
		catch(ex)
		{
			PageUtils.logToConsole("SALR Quick Window error: " + ex);
			PageUtils.logToConsole("Filename: " + ex.fileName);
			PageUtils.logToConsole("Line: " + ex.lineNumber);
		}
	},

	releaseQuickQuoteVars: function()
	{
		QuickQuoteHelper.quickWindowParams.quicktype = null;
		QuickQuoteHelper.quickWindowParams.threadid = null;
		QuickQuoteHelper.quickWindowParams.forumid = null;
		QuickQuoteHelper.quickWindowParams.postid = null;
		QuickQuoteHelper.quickWindowParams.targetMM = null;
		QuickQuoteHelper.quickWindowParams.wasBookmarked = null;
		QuickQuoteHelper.quickQuoteSubmitting = false;
		QuickQuoteHelper.quickquotewin = null;
	},

};

QuickQuoteHelper.init();
