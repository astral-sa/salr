var gSALRservice = null;
var rebuildCSS = true;
function SALR_Prefs_OnLoad(prefwindow)
{
	// Init pref window
	// TODO: Temporarily we're always rebuilding CSS on accept; need to use onchange handlers
	//		from individual, relevant prefs to set this variable to true
	gSALRservice = Components.classes['@evercrest.com/salastread/persist-object;1'].getService().wrappedJSObject;
}

function SALR_Prefs_Accept()
{
	if (rebuildCSS == true)
		gSALRservice.updateStyles();
	RebuildSAMenus();
	return true;
}

function SALR_Prefs_Close()
{
	// The prefwindow was closed or canceled, but instantApply was true
	if (document.getElementById('salastreadpref').instantApply)
	{
		if (rebuildCSS == true)
			gSALRservice.updateStyles();
		RebuildSAMenus();
	}
}