var gSALRGeneralPane = {
	// Initialization
	init: function ()
	{

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
