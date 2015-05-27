var gSALRGeneralPane = {
	// Initialization
	init: function ()
	{
		function setEventListener(aId, aEventType, aCallback)
		{
			document.getElementById(aId)
			.addEventListener(aEventType, aCallback.bind(gSALRGeneralPane));
		}

		setEventListener("removeHeaderAndFooter", "change", Styles.updateStyles);
		setEventListener("testNotify", "command", gSALRGeneralPane.testNotify);
	},
	resetPref: function(myPrefName)
	{
		Prefs.resetPref(myPrefName);
	},

	testNotify: function()
	{
		Notifications.showChangelogAlert();
	},
};
