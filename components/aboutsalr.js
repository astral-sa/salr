const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function AboutSALR() { }
AboutSALR.prototype = {
  classDescription: "about:salr",
  contractID: "@mozilla.org/network/protocol/about;1?what=salr",
  classID: Components.ID("{db00d3c6-41cc-47cd-aca9-c156c297e8ae}"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  
  getURIFlags: function(aURI) {
    return Ci.nsIAboutModule.ALLOW_SCRIPT;
  },
  
  newChannel: function(aURI) {
    let ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    let channel = ios.newChannel("chrome://salastread/content/pref/in-content/salrpref.xul", null, null);
    channel.originalURI = aURI;
    return channel;
  }
};
const NSGetFactory = XPCOMUtils.generateNSGetFactory([AboutSALR]);