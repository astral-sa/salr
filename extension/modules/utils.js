/*

	Miscellaneous helpful utility functions

*/

Cu.import("resource://gre/modules/Services.jsm");

let Utils = exports.Utils =
{
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

	runConfig: function(paneID, args)
	{
		let window = Utils.getRecentWindow();
		function handleArgs(cWin)
		{
			if (args && args["action"] === "addUser" )
			{
				cWin.gSALRUsersPane.handleIncomingArgs(args);
				//let advancedPaneTabs = doc.getElementById("advancedPrefs");
				//advancedPaneTabs.selectedTab = doc.getElementById(args["advancedTab"]);
			}
		}

		let preferencesURL = "about:salr" + (paneID ? "#" + paneID : "");
		let newLoad = !window.switchToTabHavingURI(preferencesURL, true, {ignoreFragment: true});
		let browser = window.gBrowser.selectedBrowser;
		if (newLoad)
		{
			Services.obs.addObserver(function actionArgsLoadedObs(prefWin, topic, data)
			{
				if (!browser) {
					browser = window.gBrowser.selectedBrowser;
				}
				if (prefWin != browser.contentWindow) {
					return;
				}
				Services.obs.removeObserver(actionArgsLoadedObs, "action-args-loaded");
				handleArgs(browser.contentWindow);
				//handleArgs(browser.contentDocument);
			}, "action-args-loaded", false);
		}
		else
		{
			if (paneID)
			{
				browser.contentWindow.gotoPref(paneID);
			}
			handleArgs(browser.contentWindow);
			//handleArgs(browser.contentDocument);
		}
		//window.openUILinkIn(preferencesURL, "tab");

	},

	/**
	 * Simple element creation function.
	 * @param {Element} doc   Document element to create in.
	 * @param {string}  tag   Tag name for the new element.
	 * @param {Object}  attrs Attributes to set on the element.
	 */
	createElementWithAttrs: function(doc, tag, attrs)
	{
		let element = doc.createElement(tag);
		if (attrs)
		{
			for (let attrName in attrs)
				if (attrs.hasOwnProperty(attrName))
					element.setAttribute(attrName, attrs[attrName]);
		}
		return element;
	},

	forEachOpenWindow: function(todo)	// Apply a function to all open browser windows
	{
		var windows = Services.wm.getEnumerator("navigator:browser");
		while (windows.hasMoreElements())
			todo(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
	},

	getRecentWindow: function()
	{
		let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		                   .getService(Components.interfaces.nsIWindowMediator);
		let mainWindow = wm.getMostRecentWindow("navigator:browser");
		return mainWindow;
	},

	// Used by UI
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

};
