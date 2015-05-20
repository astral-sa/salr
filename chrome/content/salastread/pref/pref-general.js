function generalPane_resetPref(myPrefName)
{
	Prefs.resetPref(myPrefName);
	let myPref = document.getElementById(myPrefName);
	myPref.value = myPref.valueFromPreferences;
}
function generalPane_testNotify()
{
	if (Prefs.getPref('updateNotificationMethod') === 2) // Doorhanger notification
	{
		if (document.getElementById('salastreadpref').instantApply || window.confirm("This method requires the pref window to close.\n Have you saved all your preference changes?"))
		{
			window.opener.setTimeout(Notifications.showChangelogAlert, 250);
			window.close();
		}
	}
	else
	{
		Notifications.showChangelogAlert();
	}
}
