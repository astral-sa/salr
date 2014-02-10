var gSALRservice = null;
var rebuildCSS = true;
var needSAMenuToggle = false;
function SALR_Prefs_OnLoad(prefwindow)
{
	// Init pref window
	// TODO: Temporarily we're always rebuilding CSS on accept; need to use onchange handlers
	//		from individual, relevant prefs to set this variable to true
	gSALRservice = Components.classes['@evercrest.com/salastread/persist-object;1'].getService().wrappedJSObject;
	needSAMenuToggle = false;
}

function SALR_Prefs_Accept()
{
	if (rebuildCSS == true)
		gSALRservice.updateStyles();
	RebuildSAMenus();
	if (needSAMenuToggle === true)
	{
		needSAMenuToggle = false;
		doChangeSAMenuVis();
	}
	return true;
}

function SALR_Prefs_Close()
{
	// The prefwindow was closed or canceled, but instantApply was true
	// 		and we want some deferred actions.
	if (document.getElementById('salastreadpref').instantApply)
	{
		if (rebuildCSS == true)
			gSALRservice.updateStyles();
		RebuildSAMenus();
	}
}