/**
 * @fileOverview Frame side of the context menu.
 */

let {PageUtils} = require("pageUtils");
let {DB} = require("content/dbHelper");

let ContextMenuHelper = exports.ContextMenuHelper = 
{
	/**
	 * Sets up listeners for context menu messages from chrome.
	 */
	init: function()
	{
		addMessageListener("salastread:ContextMenuIgnoreThread", ContextMenuHelper.ignoreThread);
		addMessageListener("salastread:ContextMenuStarThread", ContextMenuHelper.starThread);
		addMessageListener("salastread:PromptInTab", PageUtils.promptInTab);
		onShutdown.add(() => {
			removeMessageListener("salastread:ContextMenuIgnoreThread", ContextMenuHelper.ignoreThread);
			removeMessageListener("salastread:ContextMenuStarThread", ContextMenuHelper.starThread);
			removeMessageListener("salastread:PromptInTab", PageUtils.promptInTab);
		});
	},

	/**
	 * Frame message handler for ignore thread messages.
	 *     Prompts user whether or not to ignore, then ignores if applicable.
	 * @param {Object} message               Ignored thread message.
	 * @param {string} message.data.threadId Thread ID to ignore.
	 */
	ignoreThread: function(message)
	{
		let doc = content.document;
		let threadId = message.data.threadId;
		let ignoreStatus = message.data.ignoreStatus;
		let threadTitle;
		let inThread = PageUtils.areWeInAThread(doc.location.pathname);
		let threadRow;

		if (inThread)
		{
			threadTitle = PageUtils.getCleanPageTitle(doc);
		}
		else
		{
			threadRow = doc.getElementById("thread" + threadId);
			if (!threadRow)
				return;

			threadTitle = ContextMenuHelper.getThreadTitleFromThreadRow(doc, threadRow);
		}
		try
		{
			let factory = Cc["@mozilla.org/prompter;1"]
								.getService(Ci.nsIPromptFactory);
			let prompt = factory.getPrompt(content, Ci.nsIPrompt);
			let bag = prompt.QueryInterface(Ci.nsIWritablePropertyBag2);
			bag.setPropertyAsBool("allowTabModal", true);
			let result = prompt.confirm.apply(null, ["SALR", "Are you sure you want to ignore thread #"+threadId+"?"]);
			if (!result)
				return;

			if (ignoreStatus === true)
				return;
			DB.toggleThreadIgnore(threadId);
			if (threadTitle)
				DB.setThreadTitle(threadId, threadTitle);

			// If we're in a threadlist, we need to remove the row.
			if (!inThread)
				threadRow.parentNode.removeChild(threadRow);
		}
		catch(e) {
			// Prevent exception if user closes the tab
		}
	},

	/**
	 * Frame message handler for star thread messages.
	 *    Finds associated thread title and updates the database.
	 * @param {Object} message               Starred thread message.
	 * @param {string} message.data.threadId Thread ID to star.
	 */
	starThread: function(message)
	{
		let doc = content.document;
		let threadId = message.data.threadId;
		let threadTitle;
		let inThread = PageUtils.areWeInAThread(doc.location.pathname);

		if (inThread)
		{
			threadTitle = PageUtils.getCleanPageTitle(doc);
		}
		else
		{
			let threadRow = doc.getElementById("thread" + threadId);
			if (!threadRow)
				return;

			threadTitle = ContextMenuHelper.getThreadTitleFromThreadRow(doc, threadRow);
			if (!threadTitle)
				return;
		}
		DB.setThreadTitle(threadId, threadTitle);
	},

	/**
	 * Helper function to get a thread title.
	 * @param {Element} doc       Document element to work in.
	 * @param {Element} threadRow Thread row to search in.
	 * @return {(string|boolean)} String thread title if found; false if not.
	 */
	getThreadTitleFromThreadRow: function(doc, threadRow)
	{
		let threadTitleLink = PageUtils.selectSingleNode(doc, threadRow, "TD[contains(@class,'title')]/DIV/DIV/A[contains(@class, 'thread_title')]");
		if (!threadTitleLink)
			threadTitleLink = PageUtils.selectSingleNode(doc, threadRow, "TD[contains(@class,'title')]/A[contains(@class, 'thread_title')]");
		if (!threadTitleLink)
			return false;

		return threadTitleLink.textContent;
	},

};

ContextMenuHelper.init();
