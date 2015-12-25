Cu.import("resource://gre/modules/Services.jsm");

let {DB} = require("db");
let {Prefs} = require("prefs");
let {Notifications} = require("notifications");
let {Menus} = require("menus");
let {Utils} = require("utils");
let {ToolbarButton} = require("toolbarButton");
let {ContextMenu} = require("contextMenu");
let {Styles} = require("styles");

var WindowListener =
{
	onOpenWindow: function(xulWindow)
	{
		let window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
								.getInterface(Components.interfaces.nsIDOMWindow);
		function onWindowLoad()
		{
			window.removeEventListener("load",onWindowLoad);
			if (window.document.documentElement.getAttribute("windowtype") === "navigator:browser")
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

		// Set up frame script
		let info = require("info");
		let globalMM = Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);
		Utils.addFrameMessageListener("salastread:GetInfo", () => info);
		let frameScript = info.addonRoot + "modules/content/frameScript.js?" + Math.random();
		globalMM.loadFrameScript(frameScript, true);

		// Add config listeners
		Utils.addFrameMessageListener("salastread:RunConfig", Utils.runConfig);
		Utils.addFrameMessageListener("salastread:RunConfigAddUser", function({userid, username}) {
			Utils.runConfig('users', { "action" : "addUser", "userid" : userid, "username" : username });
		});

		onShutdown.add(function()
			{
				// Unload frame scripts
				globalMM.broadcastAsyncMessage("salastread:Shutdown", frameScript);
				globalMM.removeDelayedFrameScript(frameScript);

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

};
UI.init();

function loadIntoWindow(window) {
	ToolbarButton.addToolbarButton(window);
	ContextMenu.addContextMenu(window);
	UI.addPopupNotificationAnchor(window);

	if (DB._starterr)
		window.alert("DB._starterr =\n" + DB._starterr);

	if (Prefs.getPref("showSAForumMenu") && (window.document.getElementById("salr-menu") === null))
		Menus.buildForumMenu(window, 'menubar');

	//window.addEventListener('DOMContentLoaded', PageLoadHandler.onDOMLoad, true);
	//window.addEventListener('beforeunload', PageLoadHandler.pageOnBeforeUnload, true);

	// Do we need to show the changelog in this window?
	if (DB.needToShowChangeLog === true)
	{
		DB.needToShowChangeLog = false;
		//openDialog("chrome://salastread/content/newfeatures/newfeatures.xul", "SALR_newfeatures", "chrome,centerscreen,dialog=no");
		// Delay a bit.
		window.setTimeout(function() { Notifications.showChangelogAlert(); }, 500);
	}
}

function unloadFromWindow(window) {
	//window.removeEventListener('DOMContentLoaded', PageLoadHandler.onDOMLoad, true);
	ContextMenu.removeContextMenu(window);
	UI.removePopupNotificationAnchor(window);

	//window.removeEventListener('beforeunload', PageLoadHandler.pageOnBeforeUnload, true);

	Menus.removeForumMenu(window);

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
