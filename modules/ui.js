Cu.import("resource://gre/modules/Services.jsm");

let {DB} = require("db");
let {Prefs} = require("prefs");
let {Notifications} = require("notifications");
//let {Utils} = require("utils");

let CustomizableUI = null;

var WindowListener =
{
	onOpenWindow: function(xulWindow)
	{
		let window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
								.getInterface(Components.interfaces.nsIDOMWindow);
		function onWindowLoad()
		{
			window.removeEventListener("load",onWindowLoad);
			if (window.document.documentElement.getAttribute("windowtype") == "navigator:browser")
				loadIntoWindow(window);
		}
		window.addEventListener("load",onWindowLoad);
	},
	onCloseWindow: function(xulWindow) { },
	onWindowTitleChange: function(xulWindow, newTitle) { }
};

let UI = exports.UI =
{
	init: function()
	{
		let globalStyleSheets = ["chrome://salastread/content/chromeStyling.css"];
		// Load up our stylesheets
		let styleSheetService = Components.classes["@mozilla.org/content/style-sheet-service;1"]
										.getService(Components.interfaces.nsIStyleSheetService);
		for (let i = 0, len = globalStyleSheets.length; i < len; i++)
		{
			let styleSheetURI = Services.io.newURI(globalStyleSheets[i], null, null);
			styleSheetService.loadAndRegisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
		}
		onShutdown.add(function()
			{
				// Unload stylesheets
				let styleSheetService = Components.classes["@mozilla.org/content/style-sheet-service;1"]
										.getService(Components.interfaces.nsIStyleSheetService);
				for (let i = 0, len = globalStyleSheets.length; i < len; i++)
				{
					let styleSheetURI = Services.io.newURI(globalStyleSheets[i], null, null);
					if (styleSheetService.sheetRegistered(styleSheetURI, styleSheetService.AUTHOR_SHEET))
					{
						styleSheetService.unregisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
					}  
				}
			});
		// Load UI elements
		forEachOpenWindow(loadIntoWindow);
		Services.wm.addListener(WindowListener);
	},

	addToolbarButton: function(window)
	{
		try
		{
			CustomizableUI = Cu.import("resource:///modules/CustomizableUI.jsm", null).CustomizableUI;
			CustomizableUI.createWidget({
				id: "salr-toolbarbutton",
				type: "custom",
				defaultArea: CustomizableUI.AREA_NAVBAR,
				label: "SALR",
				tooltiptext: "Something Awful Last Read",
				onCommand: UI.onTBCommand.bind(UI),
				onBuild: function(aDocument)
				{
					let toolbarButton = aDocument.createElement("toolbarbutton");
					let props = 
					{
						id: "salr-toolbarbutton",
						label: "SALR",
						type: "menu",
						removable: "true",
						class: "toolbarbutton-1 chromeclass-toolbar-additional",
						tooltiptext: "Something Awful Last Read",
						oncommand: UI.onTBCommand.bind(UI),
						oncontextmenu: UI.onTBContextMenu.bind(UI),
					};
					for (let p in props)
					{
						if (props.hasOwnProperty(p))
							toolbarButton.setAttribute(p, props[p]);
					}
					toolbarButton.addEventListener("command", UI.onTBCommand.bind(UI), false);
					toolbarButton.addEventListener("contextmenu", UI.onTBContextMenu.bind(UI), false);
					let popup = aDocument.createElement("menupopup");
					popup.setAttribute("id", "salr-toolbar-popup");
					popup.addEventListener("popupshowing", UI.onTBMenuShowing, false);
					toolbarButton.appendChild(popup);
					return toolbarButton;
				},
			});
			onShutdown.add(CustomizableUI.destroyWidget.bind(CustomizableUI, "salr-toolbarbutton"));
		}
		catch (ex)
		{
			let doc = window.document;
			let toolbox = doc.getElementById("navigator-toolbox");
			if (toolbox)
			{
				let button = doc.createElement("toolbarbutton");
				button.setAttribute("id", "salr-toolbarbutton");
				button.setAttribute("label", "SALR");
				button.setAttribute("type", "menu");
				button.setAttribute("removable", "true");
				button.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
				button.setAttribute("tooltiptext", "Something Awful Last Read");
				let icon = "chrome://salastread/skin/sa-24.png";
				button.style.listStyleImage = "url(" + icon + ")";
				button.addEventListener("command", UI.onTBCommand.bind(UI), false);
				button.addEventListener("contextmenu", UI.onTBContextMenu.bind(UI), false);
				toolbox.palette.appendChild(button);
				let popup = doc.createElement("menupopup");
				popup.setAttribute("id", "salr-toolbar-popup");
				popup.addEventListener("popupshowing", UI.onTBMenuShowing, false);
				button.appendChild(popup);

				// move to saved toolbar position
				let toolbarId = Prefs.getPref("legacyToolbarId");
				let nextItemId = Prefs.getPref("legacyToolbarNextItemId");
				let toolbar = toolbarId && doc.getElementById(toolbarId);
				if (toolbar)
				{
					let nextItem = doc.getElementById(nextItemId);
				 	toolbar.insertItem("salr-toolbarbutton", nextItem &&
						 nextItem.parentNode.id == toolbarId &&
						 nextItem);
				}
				window.addEventListener("aftercustomization", UI.afterLegacyCustomize.bind(UI), false);
			}
			onShutdown.add(function() { UI.removeToolbarButton(window); });
		}
	},

	afterLegacyCustomize: function(e)
	{
		let toolbox = e.target;
		let button = toolbox.parentNode.querySelector("#salr-toolbarbutton");
		let toolbarId, nextItemId;
		if (button) {
			let parent = button.parentNode,
					nextItem = button.nextSibling;
			if (parent && parent.localName == "toolbar") {
				toolbarId = parent.id;
				nextItemId = nextItem && nextItem.id;
			}
		}
		Prefs.setPref("legacyToolbarId", toolbarId);
		Prefs.setPref("legacyToolbarNextItemId", nextItemId);
	},

	removeToolbarButton: function(window)
	{
//currently only called from legacy part
		let doc = window.document;
		let popup = doc.getElementById("salr-toolbar-popup");
		if (popup)
		{
			while (popup.firstChild)
				popup.removeChild(popup.firstChild);
			if (!CustomizableUI)
				popup.parentNode.removeChild(popup);
		}
		if (!CustomizableUI)
		{
			let button = doc.getElementById("salr-toolbarbutton");
			if (button)
				button.parentNode.removeChild(button);
		}
	},

	isToolbarIconVisible: function() /**Boolean*/
	{
		if (!CustomizableUI)
			return false;
		let placement = CustomizableUI.getPlacementOfWidget("salr-toolbarbutton");
		return !!placement;
	},

	onTBCommand: function(event)
	{
		if (event.target == this)
			UI.onTBClick(event);
	},
	onTBClick: function(e)
	{
		// The main portion of the SALR button has been clicked.
		// Just open the context menu, for now.
		UI.onTBContextMenu(e);
	},
	onTBContextMenu: function(e)
	{
		let tb = e.currentTarget;
		let popup = tb.firstChild;
		if (!popup || !popup.showPopup)
			return;
		e.preventDefault();
		popup.showPopup();
	},
	onTBMenuShowing: function(e)
	{
		// Build the menu if we need to.
		let doc = e.originalTarget.ownerDocument;
		let window = doc.defaultView;
		let menupopup = doc.getElementById("salr-toolbar-popup");
		if (menupopup && !menupopup.firstChild)
			window.gSALR.buildForumMenu('toolbar');
	},

	addPopupNotificationAnchor: function(window)
	{
		let doc = window.document;
		let popupBox = doc.getElementById('notification-popup-box');
		let newAnchor = doc.createElement('image');
		newAnchor.setAttribute('id', 'salr-notification-icon');
		newAnchor.setAttribute('class', 'notification-anchor-icon');
		newAnchor.setAttribute('role', 'button');
		newAnchor.style.listStyleImage = 'url(chrome://salastread/skin/sa.png)';
		popupBox.appendChild(newAnchor);
	},

	removePopupNotificationAnchor: function(window)
	{
		let doc = window.document;
		let ourAnchor = doc.getElementById('salr-notification-icon');
		if (ourAnchor)
			ourAnchor.parentNode.removeChild(ourAnchor);
	},

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
			let menuItem = doc.createElement('menuitem');
			menuItem.setAttribute('id', 'salastread-context-ignorethread');
			menuItem.setAttribute('label', 'Ignore This Thread');
			menuItem.setAttribute('accesskey', 'i');
			menuItem.setAttribute('hidden', 'true');
			menuItem.setAttribute('oncommand', 'window.gSALR.ignoreThread();');
			menuPopup.appendChild(menuItem);
			menuItem = doc.createElement('menuitem');
			menuItem.setAttribute('id', 'salastread-context-starthread');
			menuItem.setAttribute('label', 'Star This Thread');
			menuItem.setAttribute('accesskey', 's');
			menuItem.setAttribute('hidden', 'true');
			menuItem.setAttribute('oncommand', 'window.gSALR.starThread();');
			menuPopup.appendChild(menuItem);
			menuItem = doc.createElement('menuitem');
			menuItem.setAttribute('id', 'salastread-context-unreadthread');
			menuItem.setAttribute('label', 'Mark This Thread Unread');
			menuItem.setAttribute('accesskey', 'u');
			menuItem.setAttribute('hidden', 'true');
			menuItem.setAttribute('oncommand', 'window.gSALR.unreadThread();');
			menuPopup.appendChild(menuItem);
			let menuSep = doc.createElement('menuseparator');
			menuSep.setAttribute('id', 'salastread-context-menuseparator');
			menuSep.setAttribute('position', '2');
			menuSep.setAttribute('hidden', 'true');
			contentAreaContextMenu.appendChild(menuSep);

			// Add chrome listener for context menu events
			// e10s note - uses shim
			//contentAreaContextMenu.addEventListener('popupshowing',UI.contextMenuShowing,false);
		}
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
		//let contentAreaContextMenu = window.document.getElementById('contentAreaContextMenu');
		//contentAreaContextMenu.removeEventListener('popupshowing',UI.contextMenuShowing,false);
	},

};
UI.init();

function loadIntoWindow(window) {
	UI.addToolbarButton(window);
	UI.addContextMenu(window);
	UI.addPopupNotificationAnchor(window);

	if (DB._starterr)
		window.alert("DB._starterr =\n" + DB._starterr);

	// Load in the old overlay script for now
	window.gSALR = {};
	Services.scriptloader.loadSubScript("chrome://salastread/content/salastreadOverlay.js", window);
	if (Prefs.getPref("showSAForumMenu") && (window.document.getElementById("salr-menu") === null))
		window.gSALR.buildForumMenu('menubar');

	window.addEventListener('DOMContentLoaded', window.gSALR.onDOMLoad, true);
	window.addEventListener('beforeunload', window.gSALR.pageOnBeforeUnload, true);

	// Do we need to show the changelog in this window?
	if (DB.needToShowChangeLog === true)
	{
		DB.needToShowChangeLog = false;
		//openDialog("chrome://salastread/content/newfeatures/newfeatures.xul", "SALR_newfeatures", "chrome,centerscreen,dialog=no");
		// Delay a bit.
		window.setTimeout(Notifications.showChangelogAlert, 500);
	}

	// Set interval for 'Time spent on forums'
	window.gSALR.intervalId = window.setInterval(window.gSALR.timerTick, 1000);
}

function unloadFromWindow(window) {
	window.removeEventListener('DOMContentLoaded', window.gSALR.onDOMLoad, true);
	if (!CustomizableUI)
		window.removeEventListener("aftercustomization", UI.afterLegacyCustomize, false);
	UI.removeContextMenu(window);
	UI.removePopupNotificationAnchor(window);

	window.removeEventListener('beforeunload', window.gSALR.pageOnBeforeUnload, true);
	window.clearInterval(window.gSALR.intervalId);
	window.gSALR.removeForumMenu();
	if (window.gSALR)
		delete window.gSALR;
	// Close any about:salr tabs that might be open
	// e10s note: blanks the tab rather than closing it
	let tabs = window.gBrowser.tabs;
	for (let i = tabs.length - 1; i >= 0; i--)
	{
		let tab = tabs[i];
		let browser = window.gBrowser.getBrowserForTab(tab);
		if (browser.currentURI && browser.currentURI.spec.indexOf("about:salr") === 0)
			window.gBrowser.removeTab(tab);
	}
}

function forEachOpenWindow(todo)	// Apply a function to all open browser windows
{
	var windows = Services.wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements())
		todo(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
}

onShutdown.add(function()
{
	forEachOpenWindow(unloadFromWindow);
	Services.wm.removeListener(WindowListener);
	// Close any windows we may have opened here
});
