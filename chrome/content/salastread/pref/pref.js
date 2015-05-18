Components.utils.import("resource://gre/modules/Services.jsm");
function require(module)
{
  let result = {};
  result.wrappedJSObject = result;
  Services.obs.notifyObservers(result, "salr-require", module);
  return result.exports;
}
let {Prefs} = require("prefs");
let {DB} = require("db");
let {Styles} = require("styles");
let {PageUtils} = require("pageUtils");

var rebuildCSS = true;
var needSAMenuToggle = false;
function SALR_Prefs_OnLoad(prefwindow)
{
	// Init pref window
	// TODO: Temporarily we're always rebuilding CSS on accept; need to use onchange handlers
	//		from individual, relevant prefs to set this variable to true
	needSAMenuToggle = false;
}

function SALR_Prefs_Accept()
{
	if (rebuildCSS == true)
		Styles.updateStyles();
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
			Styles.updateStyles();
		RebuildSAMenus();
	}
}