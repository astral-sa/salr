Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

registerAboutSALR();
require("db");
require("ui");
require("timer");
require("quickQuoteInterface");

function AboutSALR() { }
AboutSALR.prototype = {
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
	getURIFlags: function(aURI) {
		return Ci.nsIAboutModule.ALLOW_SCRIPT;
	},
	newChannel: function(aURI, aSecurity_or_aLoadInfo) {
		var channel;
		var aboutPage_page = "chrome://salastread/content/pref/in-content/salrpref.xul";
		if (Services.vc.compare(Services.appinfo.version, '47.*') > 0) {
			let uri = Services.io.newURI(aboutPage_page, null, null);
			// greater than or equal to firefox48 so aSecurity_or_aLoadInfo is aLoadInfo
			channel = Services.io.newChannelFromURIWithLoadInfo(uri, aSecurity_or_aLoadInfo); 
		} else {
			// less then firefox48 aSecurity_or_aLoadInfo is aSecurity
			channel = Services.io.newChannel(aboutPage_page, null, null);
		}
		channel.originalURI = aURI;
		return channel;
	}
};

function registerAboutSALR()
{
	let AboutSALRFactory = Object.freeze({
		createInstance: function (aOuter, aIID) {
			if (aOuter) {  throw Components.results.NS_ERROR_NO_AGGREGATION; }
			return new AboutSALR();
			//return AboutSALR.QueryInterface(aIID);
		},
		lockFactory: function (aLock) { /* unused */ },
		QueryInterface: XPCOMUtils.generateQI([Ci.nsIFactory])
	});
	let classDescription = "about:salr";
	let contractID = "@mozilla.org/network/protocol/about;1?what=salr";
	let classID = Components.ID("{db00d3c6-41cc-47cd-aca9-c156c297e8ae}");

	let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
	registrar.registerFactory(classID, classDescription, contractID, AboutSALRFactory);

	onShutdown.add(function()
	{
		registrar.unregisterFactory(classID, AboutSALRFactory);
	});
}
