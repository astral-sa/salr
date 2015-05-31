/**
 * @fileOverview Everything to do with the SALR context menu.
 */

let {DB} = require("db");
let {Prefs} = require("prefs");
//let {Notifications} = require("notifications");
let {PageUtils} = require("pageUtils");

let ContextMenu = exports.ContextMenu = 
{
	addContextMenu: function(window)
	{
		let contentAreaContextMenu = window.document.getElementById('contentAreaContextMenu');
		if (contentAreaContextMenu)
		{
			let doc = window.document;
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
			// e10s note - uses shim
			contentAreaContextMenu.addEventListener('popupshowing',ContextMenu.contextMenuShowing,false);
		}
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

		// e10s note - related
		let contentAreaContextMenu = window.document.getElementById('contentAreaContextMenu');
		contentAreaContextMenu.removeEventListener('popupshowing',ContextMenu.contextMenuShowing,false);
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

	contextMenuShowing: function(e)
	{
		let document = e.currentTarget.ownerDocument.defaultView.document;
		// Clean up event listener - need an eventual better way to do this
		if (Prefs === null)
		{
			e.originalTarget.removeEventListener('popupshowing', arguments.callee, false);
			return;
		}

		if (e.originalTarget === document.getElementById("contentAreaContextMenu"))
		{
			ContextMenu.hideContextMenuItems(e);
			try
			{
				var doc = document.getElementById("content").mCurrentBrowser.contentDocument;
				if (doc.__salastread_processed === true)
				{
					if (Prefs.getPref("enableContextMenu"))
						ContextMenu.contextVis(e.target);
				}
			}
			catch (ex) {}
		}
	},

	contextVis: function(popup)
	{
		let document = popup.ownerDocument;
		let window = document.defaultView;
		var target = window.gContextMenu.target;

		var threadid = null;

		while (target)
		{
			if (target.className)
			{
				var tidmatch = target.className.match(/salastread_thread_(\d+)/);
				if (tidmatch)
				{
					threadid = tidmatch[1];
					document.getElementById("salastread-context-ignorethread").data = threadid;
					document.getElementById("salastread-context-ignorethread").target = target;
					document.getElementById("salastread-context-ignorethread").setAttribute('label','Ignore This Thread (' + threadid + ')');
					document.getElementById("salastread-context-starthread").data = threadid;
					document.getElementById("salastread-context-starthread").target = target;
					document.getElementById("salastread-context-starthread").setAttribute('label',(DB.isThreadStarred(threadid) ? 'Unstar' : 'Star') + ' This Thread (' + threadid + ')');
					document.getElementById("salastread-context-unreadthread").data = threadid;
					document.getElementById("salastread-context-unreadthread").target = target;
					document.getElementById("salastread-context-unreadthread").setAttribute('label','Mark This Thread Unread (' + threadid + ')');
					var pageName = target.ownerDocument.location.pathname.match(/^\/(\w+)\.php/i);
					if (pageName)
					{
						switch(pageName[1])
						{
							case "showthread":
								ContextMenu.showContextMenuItems(document, true);
								break;
							default:
								ContextMenu.showContextMenuItems(document, false);
						}
					}
				}
			}
			target = target.parentNode;
		}
	},

	starThread: function(event)
	{
		let document = event.target.ownerDocument.defaultView.document;
		var threadid = document.getElementById("salastread-context-starthread").data;
		var target = document.getElementById("salastread-context-starthread").target;
		if (!threadid)
			return;
		var threadTitle;
		 // Snag the title we saved earlier
		if (target.ownerDocument.location.href.search(/showthread.php/i) === -1)
		{
			threadTitle = target.__salastread_threadtitle;
		}
		else
			threadTitle = PageUtils.getCleanPageTitle(target.ownerDocument);

		var starStatus = DB.isThreadStarred(threadid);
		DB.toggleThreadStar(threadid);

		if (starStatus === false) // we just starred it
			DB.setThreadTitle(threadid, threadTitle);
	},

	ignoreThread: function(event)
	{
		let window = event.target.ownerDocument.defaultView;
		let document = window.document;
		let threadid = document.getElementById("salastread-context-ignorethread").data;
		let target = document.getElementById("salastread-context-ignorethread").target;
		if (!threadid)
			return;
		let threadTitle;
		 // Snag the title we saved earlier
		if (target.ownerDocument.location.href.search(/showthread.php/i) === -1)
		{
			threadTitle = target.__salastread_threadtitle;
		}
		else
			threadTitle = PageUtils.getCleanPageTitle(target.ownerDocument);

		try
		{
			// e10s note: this will change if we're in a frame script
			let factory = Components.classes["@mozilla.org/prompter;1"]
								.getService(Components.interfaces.nsIPromptFactory);
			let prompt = factory.getPrompt(window.gBrowser.contentWindow, Components.interfaces.nsIPrompt);
			let bag = prompt.QueryInterface(Components.interfaces.nsIWritablePropertyBag2);
			bag.setPropertyAsBool("allowTabModal", true);
			let result = prompt.confirm.apply(null, ["SALR", "Are you sure you want to ignore thread #"+threadid+"?"]);
			if (!result)
				return;
			let ignoreStatus = DB.isThreadIgnored(threadid);
			if (ignoreStatus === true)
				return;
			DB.toggleThreadIgnore(threadid);
			DB.setThreadTitle(threadid, threadTitle);
			if (target.ownerDocument.location.href.search(/showthread.php/i) === -1)
			{
				target.parentNode.removeChild(target);
			}
		}
		catch(e) { } // Prevent exception if user closes the tab
	},

	unreadThread: function(event)
	{
		let window = event.target.ownerDocument.defaultView;
		let document = window.document;
		let threadid = document.getElementById("salastread-context-unreadthread").data;
		//let target = document.getElementById("salastread-context-unreadthread").target;
		if (!threadid)
			return;
		let xhr = new XMLHttpRequest();
		let xhrparams = "json=1&action=resetseen&threadid="+threadid;
		xhr.open("POST", "http://forums.somethingawful.com/showthread.php", true);
		// Ensure this load flag is set to prevent issues with third-party cookies being disabled
		xhr.channel.loadFlags |= Components.interfaces.nsIChannel.LOAD_DOCUMENT_URI;
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
					// e10s note: this will change if we're in a frame script
					let factory = Components.classes["@mozilla.org/prompter;1"]
										.getService(Components.interfaces.nsIPromptFactory);
					let prompt = factory.getPrompt(window.gBrowser.contentWindow, Components.interfaces.nsIPrompt);
					let bag = prompt.QueryInterface(Components.interfaces.nsIWritablePropertyBag2);
					bag.setPropertyAsBool("allowTabModal", true);
					prompt.alert.apply(null, ["SALR Alert", result]);
				}
				catch(e) { }
			}
		};
		xhr.send(xhrparams);
	},

};
