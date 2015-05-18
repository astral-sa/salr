/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

let {addonRoot, addonName} = require("info");
let branchName = "extensions." + addonName + ".";
let branch = Services.prefs.getBranch(branchName);

var prefTypeMap = (function()
{
    var map = {}, br = Ci.nsIPrefBranch;
    map["string"] = map[br.PREF_STRING] = "CharPref";
    map["boolean"] = map[br.PREF_BOOL] = "BoolPref";
    map["number"] = map[br.PREF_INT] = "IntPref";
    return map;
})();

function getIntPref(branch, pref) branch.getIntPref(pref)
function setIntPref(branch, pref, newValue) branch.setIntPref(pref, newValue)

function getBoolPref(branch, pref) branch.getBoolPref(pref)
function setBoolPref(branch, pref, newValue) branch.setBoolPref(pref, newValue)

function getCharPref(branch, pref) branch.getComplexValue(pref, Ci.nsISupportsString).data
function setCharPref(branch, pref, newValue)
{
	let str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
	str.data = newValue;
	branch.setComplexValue(pref, Ci.nsISupportsString, str);
}

function getJSONPref(branch, pref) JSON.parse(getCharPref(branch, pref))
function setJSONPref(branch, pref, newValue) setCharPref(branch, pref, JSON.stringify(newValue))

function init()
{
	// Load default preferences and set up properties for them
	let defaultBranch = Services.prefs.getDefaultBranch(branchName);
	let scope =
	{
		pref: function(prefName, defaultValue)
		{
			if (prefName.substr(0, branchName.length) != branchName)
			{
				Cu.reportError(new Error("Ignoring default preference " + prefName + ", wrong branch."));
				return;
			}
			prefName = prefName.substr(branchName.length);
			// setter mappings for different preference types
			let typeMap =
			{
				boolean: setBoolPref,
				number: setIntPref,
				string: setCharPref,
				object: setJSONPref
			};
			let setter = typeMap[typeof defaultValue];
			setter(defaultBranch, prefName, defaultValue);
		}
	};
	Services.scriptloader.loadSubScript(addonRoot + "defaults/preferences/salastread.js", scope);
}

// Expose functions to get&set preferences
let Prefs = exports.Prefs =
{
	setPref: function(prefName, prefValue)
	{
		let type = prefTypeMap[branch.getPrefType(prefName)];
		if (type)
			prefValue = branch["set" + type](prefName, prefValue);
		return prefValue;
	},
	getPref: function(prefName)
	{
		let type = prefTypeMap[branch.getPrefType(prefName)];
    	return type ? branch["get" + type](prefName) : null;
	},
	resetPref: function(prefName)
	{
		if (branch.prefHasUserValue(prefName))
			branch.clearUserPref(prefName);
	},
	forceSave: function()
	{
		Services.prefs.savePrefFile(null);
	}
};

init();
