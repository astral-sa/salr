/*

	Functions that deal with UI notifications

*/

// Called from UI
let {Utils} = require("utils");
let {Prefs} = require("prefs");

let Notifications = exports.Notifications =
{
	showChangelogAlert: function()
	{
		// Check user prefs to determine notification type
		switch (Prefs.getPref('updateNotificationMethod'))
		{
			case 1: // AlertService - corner
				Notifications.showASChangelogAlert();
				break;
			case 2: // PopupNotification - doorhanger
				Notifications.showPNChangelogAlert();
				break;
			case 0: // Nothing
				/* falls through */
			default:
				break;
		}
	},

	showPNChangelogAlert: function()
	{
		let rWin = Utils.getRecentWindow();
		let anchorId = "salr-notification-icon";
		let notification = rWin.PopupNotifications.show(rWin.gBrowser.selectedBrowser,
			"salr-update-popup", /* popup ID */
			"SALR extension updated!\r\nIf an SA forum page acts strangely, reload it!",
			anchorId, /* anchor ID */
			{
				label: "View changelog",
				accessKey: "V",
				callback: function() { Utils.runConfig("about"); }
			},
			[ /* secondary action(s) */
				{
					label: "Stop notifying me when SALR has updated",
					dismiss: true,
					accessKey: "S",
					callback: function() { Prefs.setPref('updateNotificationMethod', 0); }
				},
				{
					label: "Change how SALR notifies me about this in the future",
					accessKey: "C",
					callback: function() { Utils.runConfig("general"); }
				}
			],
			{ /* options */
				timeout: Date.now() + 500, // Prevent automatic dismissal for 5s
				//popupIconURL: "chrome://salastread/skin/sa-64.png", // Need to specify in CSS for older browsers
				//hideNotNow: true, // Requires a secondary item with 'dismiss' property
				//learnMoreURL: "", // if we put up an FAQ page about update notifications
				//persistWhileVisible: true, // persist across location changes
				//persistence: 2, // # of page loads for which the notification will persist
				removeOnDismissal: true, // dismissing notification removes it entirely
			}
		);
/* This could use an "If the user is not currently interacting with it" check,
		rWin.setTimeout(function()
		{
			notification.remove();
		}, 15000); // Remove the notification after 15s if not already dismissed
		*/
	},

	showASChangelogAlert: function()
	{
		let alertsService = Components.classes["@mozilla.org/alerts-service;1"].
                      getService(Components.interfaces.nsIAlertsService);
		try {
		  alertsService.showAlertNotification("chrome://salastread/skin/sa-64.png", 
									  "SALR extension updated!", "If an SA forum page acts strangely, reload it!\r\nClick here for the changelog.", 
									  true, "", Notifications.ASChangelogListener, "");
		} catch (e) {
			// This can fail on Mac OS X
		}
	},

	ASChangelogListener:
	{
		observe: function(subject, topic, data)
		{
			// User has requested changelog
			if (topic === "alertclickcallback")
			{
				Utils.runConfig("about");
			}
		},
	},

	showASNotification: function(alertTitle, alertText)
	{
		let alertsService = Components.classes["@mozilla.org/alerts-service;1"].
                      getService(Components.interfaces.nsIAlertsService);
		try {
		  alertsService.showAlertNotification("chrome://salastread/skin/sa-64.png", 
									  alertTitle, alertText);
		} catch (e) {
			// This can fail on Mac OS X
		}
	},

	// Deprecated
	openChangelogAsTab: function()
	{
		let rWin = Utils.getRecentWindow();
		rWin.gBrowser.selectedTab = rWin.gBrowser.addTab("chrome://salastread/content/changelog.html");
	},

};
