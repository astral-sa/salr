/**
 * @fileOverview Everything to do with the SALR context menu.
 */

let {DB} = require("db");
let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");

let ContextMenu = exports.ContextMenu = 
{
	addContextMenu: function(window)
	{
		let doc = window.document;
		let contentAreaContextMenu = doc.getElementById('contentAreaContextMenu');
		if (!contentAreaContextMenu)
			return;

		let menu = doc.createElement('menu');
		let props = 
		{
			id: "salastread-context-menu",
			label: "SA Last Read Options",
			image: "chrome://salastread/skin/sa.png",
			class: "menu-iconic salastread_context_menu",
			position: "1",
			hidden: true,
		};
		for (let p in props)
		{
			if (props.hasOwnProperty(p))
				menu.setAttribute(p, props[p]);
		}
		contentAreaContextMenu.appendChild(menu);
		let menuPopup = doc.createElement('menupopup');
		menuPopup.setAttribute('id', 'salastread-context-menupopup');
		menu.appendChild(menuPopup);
		ContextMenu.addContextMenuItem(doc, menuPopup, {
			id: 'salastread-context-ignorethread',
			label: 'Ignore This Thread',
			accesskey: 'i'
		}, ContextMenu.ignoreThread);
		ContextMenu.addContextMenuItem(doc, menuPopup, {
			id: 'salastread-context-starthread',
			label: 'Star This Thread',
			accesskey: 's'
		}, ContextMenu.starThread);
		ContextMenu.addContextMenuItem(doc, menuPopup, {
			id: 'salastread-context-unreadthread',
			label: 'Mark This Thread Unread',
			accesskey: 'u'
		}, ContextMenu.unreadThread);
		let menuSep = doc.createElement('menuseparator');
		menuSep.setAttribute('id', 'salastread-context-menuseparator');
		menuSep.setAttribute('position', '2');
		menuSep.setAttribute('hidden', 'true');
		contentAreaContextMenu.appendChild(menuSep);

		// Add chrome listener for context menu events
		contentAreaContextMenu.addEventListener('popupshowing', ContextMenu.contextMenuShowing, false);
	},

	/**
	 * Adds a new context menu item to a context menu popup.
	 * @param {Element}  doc          Document element to create in.
	 * @param {Element}  contextPopup Popup to append to.
	 * @param {Object}   attrs        Attributes to set on the new menu item.
	 * @param {function} callback     Callback to execute when item is activated.
	 */
	addContextMenuItem: function(doc, contextPopup, attrs, callback)
	{
		if (!doc || !contextPopup || !attrs || !callback)
			return;
		let element = doc.createElement('menuitem');
		for (let attrName in attrs)
			if (attrs.hasOwnProperty(attrName))
				element.setAttribute(attrName, attrs[attrName]);
		element.setAttribute('hidden', 'true');
		element.addEventListener('command', callback, false);
		contextPopup.appendChild(element);
	},

	removeContextMenu: function(window)
	{
		let doc = window.document;
		let menu = doc.getElementById("salastread-context-menu");
		while (menu.firstChild)
			menu.removeChild(menu.firstChild);
		menu.parentNode.removeChild(menu);
		let menuSep = doc.getElementById('salastread-context-menuseparator');
		menuSep.parentNode.removeChild(menuSep);

		let contentAreaContextMenu = window.document.getElementById('contentAreaContextMenu');
		contentAreaContextMenu.removeEventListener('popupshowing', ContextMenu.contextMenuShowing, false);
	},

	showContextMenuItems: function(document, showunread)
	{
		var cacm = document.getElementById("contentAreaContextMenu");
		var mopt = document.getElementById("salastread-context-menu");
		var moptsep = document.getElementById("salastread-context-menuseparator");

		if (Prefs.getPref('contextMenuOnBottom') )
		{
			cacm.appendChild(moptsep);
			cacm.appendChild(mopt);
		}
		else
		{
			cacm.insertBefore(moptsep, cacm.firstChild);
			cacm.insertBefore(mopt, moptsep);
		}

		mopt.setAttribute('hidden', false);
		moptsep.setAttribute('hidden', false);
		document.getElementById("salastread-context-ignorethread").setAttribute('hidden', false);
		document.getElementById("salastread-context-starthread").setAttribute('hidden', false);
		if (showunread)
			document.getElementById("salastread-context-unreadthread").setAttribute('hidden', false);
	},

	hideContextMenuItems: function(e)
	{
		let document = e.currentTarget.ownerDocument.defaultView.document;
		document.getElementById("salastread-context-menu").setAttribute('hidden', true);
		document.getElementById("salastread-context-menuseparator").setAttribute('hidden', true);
		document.getElementById("salastread-context-ignorethread").setAttribute('hidden', true);
		document.getElementById("salastread-context-starthread").setAttribute('hidden', true);
		document.getElementById("salastread-context-unreadthread").setAttribute('hidden', true);
	},

	contextMenuShowing: function contextMenuShowing(e)
	{
		let window = e.currentTarget.ownerDocument.defaultView;
		let document = window.document;
		// Clean up event listener
		if (Prefs === null)
		{
			e.originalTarget.removeEventListener('popupshowing', contextMenuShowing, false);
			return;
		}

		if (e.originalTarget === document.getElementById("contentAreaContextMenu"))
		{
			ContextMenu.hideContextMenuItems(e);
			try
			{
				if (ContextMenu.onSAPage(window.gContextMenuContentData.docLocation))
				{
					if (Prefs.getPref("enableContextMenu"))
						ContextMenu.contextVis(e.target);
				}
			}
			catch (ex) {
				// Do nothing
			}
		}
	},

	/**
	 * Make sure we're on an SA page before examining elements for context.
	 */
	onSAPage: function(aLocation)
	{
		return (aLocation.search(/^https?\:\/\/(?:forum|archive)s?\.somethingawful\.com/i) !== -1);
	},

	/**
	 * Decides whether or not to show the various SALR context menu items.
	 * @param {Element} popup Context menu popup.
	 */
	contextVis: function(popup)
	{
		let document = popup.ownerDocument;
		let window = document.defaultView;

		let target = window.gContextMenu.target;
		let pageName = window.gContextMenuContentData.documentURIObject.path.match(/^\/(\w+)\.php/i);
		if (!pageName)
			return;

		let threadid;
		if (pageName[1] === "showthread")
			threadid = PageUtils.getThreadId(target.ownerDocument);
		else
			threadid = ContextMenu.getThreadIdFromElementOrAncestor(target);
		if (!threadid)
			return;

		let ignoreThread = document.getElementById("salastread-context-ignorethread");
		ignoreThread.data = threadid;
		ignoreThread.setAttribute('label','Ignore This Thread (' + threadid + ')');
		let starThread = document.getElementById("salastread-context-starthread");
		starThread.data = threadid;
		starThread.setAttribute('label',(DB.isThreadStarred(threadid) ? 'Unstar' : 'Star') + ' This Thread (' + threadid + ')');
		let unreadThread = document.getElementById("salastread-context-unreadthread");
		unreadThread.data = threadid;
		unreadThread.setAttribute('label','Mark This Thread Unread (' + threadid + ')');

		ContextMenu.showContextMenuItems(document, (pageName[1] === "showthread") ? true : false);
	},

	/**
	 * Checks for a thread ID element ID in an element and its ancestors.
	 * @param {Element} element Target element to check.
	 * @return {boolean|string} Returns false if no thread ID, else thread ID as string.
	 */
	getThreadIdFromElementOrAncestor: function(element)
	{
		let threadid = false;
		while (element)
		{
			threadid = ContextMenu.getThreadIdFromId(element);
			if (!threadid)
			{
				element = element.parentNode;
				continue;
			}
			return threadid;
		}
		return false;
	},

	/**
	 * Examines an element's id to determine if it has a thread ID.
	 * @param {HTMLElement} element Target element to check.
	 * @return {boolean|string} Returns false if no thread ID, else thread ID as string.
	 */
	getThreadIdFromId: function(element)
	{
		if (!element.id)
			return false;

		let tidmatch = element.id.match(/thread(\d+)/);
		if (!tidmatch)
			return false;

		return tidmatch[1];
	},

	starThread: function(event)
	{
		let document = event.target.ownerDocument;
		let window = document.defaultView;

		var threadid = document.getElementById("salastread-context-starthread").data;
		if (!threadid)
			return;

		let starStatus = DB.isThreadStarred(threadid);
		DB.toggleThreadStar(threadid);
		if (starStatus === false) // we just starred it
		{
			let browserMM = window.gBrowser.selectedBrowser.messageManager;
			browserMM.sendAsyncMessage("salastread:ContextMenuStarThread", {threadId: threadid});
		}
	},

	ignoreThread: function(event)
	{
		let document = event.target.ownerDocument;
		let window = document.defaultView;

		let threadid = document.getElementById("salastread-context-ignorethread").data;
		if (!threadid)
			return;

		let browserMM = window.gBrowser.selectedBrowser.messageManager;
		browserMM.sendAsyncMessage("salastread:ContextMenuIgnoreThread", {threadId: threadid, ignoreStatus: DB.isThreadIgnored(threadid)});
	},

	unreadThread: function(event)
	{
		let document = event.target.ownerDocument;
		let window = document.defaultView;

		let threadid = document.getElementById("salastread-context-unreadthread").data;
		if (!threadid)
			return;

		let xhr = new XMLHttpRequest();
		let xhrparams = "json=1&action=resetseen&threadid="+threadid;
		xhr.open("POST", "https://forums.somethingawful.com/showthread.php", true);
		// Ensure this flag is set to prevent issues with third-party cookies being disabled
		xhr.channel.QueryInterface(Ci.nsIHttpChannelInternal).forceAllowThirdPartyCookie = true;
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.setRequestHeader("Content-length", xhrparams.length);
		xhr.setRequestHeader("Connection", "close");
		xhr.onreadystatechange = function()
		{
			if (xhr.readyState === 4 && xhr.status === 200)
			{
				let result;
				if (xhr.responseText.match(/threadid/))
					result = "SALR:\n Thread #" + threadid + " marked as unread.";
				else
					result = "SALR:\n Something went wrong marking thread #" + threadid + "\n as unread! Please try again.";
				try
				{
					let browserMM = window.gBrowser.selectedBrowser.messageManager;
					browserMM.sendAsyncMessage("salastread:PromptInTab", {msg: result});
				}
				catch(e) {
					// Do nothing
				}
			}
		};
		xhr.send(xhrparams);
	},

};
