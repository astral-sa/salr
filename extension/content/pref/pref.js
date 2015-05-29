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
let {Notifications} = require("notifications");
let {UI} = require("ui");
let {Menus} = require("menus");

var rebuildCSS = true;
var needSAMenuToggle = false;

/* Function to toggle the disabled status of preferences
	that depend on the status of another preference.
	Supported controller types: checkbox, radio */
function toggleDependentPrefUI(controller)
{
	let totalArgs = arguments.length;
	if (totalArgs > 1)
	{
		let valToUse;
		let controlNode = document.getElementById(controller);
		if (controlNode.nodeName.toLowerCase() === "checkbox")
			valToUse = !controlNode.checked;
		else if (controlNode.nodeName.toLowerCase() === "radio")
			valToUse = !controlNode.selected;
		else return;
		for (let i = 1; i < totalArgs; i++)
			document.getElementById(arguments[i]).disabled = valToUse;
	}
}

/* Sets a specified event listener on a specified item with a specified callback. */
function setEventListener(aId, aEventType, aCallback)
{
	document.getElementById(aId)
	.addEventListener(aEventType, aCallback.bind(this));
}

function SALR_Prefs_OnLoad(prefwindow)
{
	// Init pref window
	// TODO: Temporarily we're always rebuilding CSS on accept; need to use onchange handlers
	//		from individual, relevant prefs to set this variable to true
	needSAMenuToggle = false;
}

function SALR_Prefs_Accept()
{
	if (rebuildCSS === true)
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
		if (rebuildCSS === true)
			Styles.updateStyles();
		RebuildSAMenus();
	}
}