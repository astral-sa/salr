/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

//Cu.import("resource://gre/modules/Services.jsm");
//Cu.importGlobalProperties(["atob", "btoa"]);
// importGlobalProperties requires Gecko 27, so instead...
let {Services, atob, btoa} = Cu.import("resource://gre/modules/Services.jsm", null);
let XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");

let addonData = null;
function startup(data,reason) {
	addonData = data;

	Services.obs.addObserver(RequireObserver, "salr-require", true);
	onShutdown.add(function() Services.obs.removeObserver(RequireObserver, "salr-require"));

	require("main");
}
let shutdownHandlers = [];
function shutdown(data,reason) {
	if (reason == APP_SHUTDOWN)
		return;
	onShutdown.done = true;
	for (let i = shutdownHandlers.length - 1; i >= 0; i --)
	{
		try
		{
			shutdownHandlers[i]();
		}
		catch (e)
		{
			Cu.reportError(e);
		}
	}
	shutdownHandlers = null;

	// Release our ties to the modules
	for (let key in require.scopes)
	{
		let scope = require.scopes[key];
		let list = Object.keys(scope);
		for (let i = 0; i < list.length; i++)
			scope[list[i]] = null;
	}
	require.scopes = null;
	addonData = null;
	// HACK WARNING: The Addon Manager does not properly clear all addon related caches on update;
	//							 in order to fully update images and locales, their caches need clearing here
	Services.obs.notifyObservers(null, "chrome-flush-caches", null);
}
function install(data,reason) { }
function uninstall(data,reason) { }

let onShutdown =
{
	done: false,
	add: function(handler)
	{
		if (shutdownHandlers.indexOf(handler) < 0)
			shutdownHandlers.push(handler);
	},
	remove: function(handler)
	{
		let index = shutdownHandlers.indexOf(handler);
		if (index >= 0)
			shutdownHandlers.splice(index, 1);
	}
};

function require(module)
{
	let scopes = require.scopes;
	if (!(module in scopes))
	{
		if (module == "info")
		{
			//let applications = {"{a23983c0-fd0e-11dc-95ff-0800200c9a66}": "fennec", "toolkit@mozilla.org": "toolkit", "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}": "firefox", "dlm@emusic.com": "emusic", "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}": "seamonkey", "{aa3c5121-dab2-40e2-81ca-7ea25febc110}": "fennec2", "{a79fe89b-6662-4ff4-8e88-09950ad4dfde}": "conkeror", "{aa5ca914-c309-495d-91cf-3141bbb04115}": "midbrowser", "songbird@songbirdnest.com": "songbird", "prism@developer.mozilla.org": "prism", "{3550f703-e582-4d05-9a08-453d09bdfdc6}": "thunderbird"};
			let appInfo = Services.appinfo;

			scopes[module] = {};
			scopes[module].exports =
			{
				addonID: addonData.id,
				addonVersion: addonData.version,
				addonRoot: addonData.resourceURI.spec,
				addonName: "salastread",
				//application: (appInfo.ID in applications ? applications[appInfo.ID] : "other"),
				applicationVersion: appInfo.version,
				platform: "gecko",
				platformVersion: appInfo.platformVersion
			};
		}
		else
		{
			let url = addonData.resourceURI.spec + "modules/" + module + ".js";
			scopes[module] = {
				Cc: Cc,
				Ci: Ci,
				Cr: Cr,
				Cu: Cu,
				atob: atob,
				btoa: btoa,
				//File: File,
				require: require,

				onShutdown: onShutdown,

				XMLHttpRequest: XMLHttpRequest,

				exports: {}
			};
			Services.scriptloader.loadSubScript(url, scopes[module]);
		}
	}
	return scopes[module].exports;
}
require.scopes = {__proto__: null};
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
let RequireObserver =
{
	observe: function(subject, topic, data)
	{
		if (topic == "salr-require")
		{
			subject.wrappedJSObject.exports = require(data);
		}
	},
	QueryInterface: XPCOMUtils.generateQI([Ci.nsISupportsWeakReference, Ci.nsIObserver])
};
