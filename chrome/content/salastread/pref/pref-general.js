function generalPane_resetPref(myPrefName)
{
	Prefs.resetPref(myPrefName);
	let myPref = document.getElementById(myPrefName);
	myPref.value = myPref.valueFromPreferences;
}
