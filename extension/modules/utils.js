/*

	Miscellaneous helpful utility functions

*/

Cu.import("resource://gre/modules/Services.jsm");

let Utils = exports.Utils =
{
	logToConsole: function(someText)
	{
		let dConsole = Cc["@mozilla.org/consoleservice;1"]
						.getService(Ci.nsIConsoleService);
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

	/**
	 * Adds a message handler that will respond to sync+async messages.
	 * @param {string}   topic  name of the message to listen to
	 * @param {Function} handler  handler to be called with the message data.
	 *                            Its return value will be sent back.
	 */
	addFrameMessageListener: function(topic, handler)
	{
		let globalMM = Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);
		let wrapper = (message) => {
			let {callbackID, data} = message.data;
			let response = undefined;
			try
			{
				response = handler(data);
			}
			catch (e)
			{
				Cu.reportError(e);
			}

			if (callbackID)
			{
				//let target = message.target.QueryInterface(Ci.nsIMessageSender);
				let target = message.target.messageManager;
				if (target)
				{
					target.sendAsyncMessage("salastread:Response", {
						callbackID,
						response
					});
				}
			}
			else
				return response;
		};
		globalMM.addMessageListener(topic, wrapper);
		onShutdown.add(() => globalMM.removeMessageListener(topic, wrapper));
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
			todo(windows.getNext().QueryInterface(Ci.nsIDOMWindow));
	},

	getRecentWindow: function()
	{
		let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
		                   .getService(Ci.nsIWindowMediator);
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
