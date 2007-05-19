// Test protocol related
const kSCHEME = "x-salr-gradientpng";
const kPROTOCOL_NAME = "SALR Gradient PNG Protocol";
const kPROTOCOL_CONTRACTID = "@mozilla.org/network/protocol;1?name=" + kSCHEME;
const kPROTOCOL_CID = Components.ID("789409b9-2e3b-4682-a5d1-71ca80a76456");

// Mozilla defined
const kSIMPLEURI_CONTRACTID = "@mozilla.org/network/simple-uri;1";
const kIOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";
const nsISupports = Components.interfaces.nsISupports;
const nsIIOService = Components.interfaces.nsIIOService;
const nsIProtocolHandler = Components.interfaces.nsIProtocolHandler;
const nsIURI = Components.interfaces.nsIURI;

function Protocol()
{
}

Protocol.prototype =
{
  QueryInterface: function(iid)
  {
    if (!iid.equals(nsIProtocolHandler) &&
        !iid.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  },

  scheme: kSCHEME,
  defaultPort: -1,
  protocolFlags: nsIProtocolHandler.URI_NORELATIVE |
                 nsIProtocolHandler.URI_NOAUTH,
  
  allowPort: function(port, scheme)
  {
    return false;
  },

  newURI: function(spec, charset, baseURI)
  {
    var uri = Components.classes[kSIMPLEURI_CONTRACTID].createInstance(nsIURI);
    uri.spec = spec;
    return uri;
  },

  newChannel: function(aURI)
  {
    try {
    persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
                       .createInstance(Components.interfaces.nsISupports);
    persistObject = persistObject.wrappedJSObject;
    if (persistObject) {
       this._PNGCreator = persistObject._PNGCreator;
    }

    // aURI is a nsIUri, so get a string from it using .spec
    var uData = aURI.spec;

    // strip away the kSCHEME: part
    uData = uData.substring(uData.indexOf(":") + 1, uData.length);    
    uData = unescape(uData);

    var contentType = "text/plain";
    var contentData = "no PNG creator available";

    if ( this._PNGCreator != null ) {
       var vals = uData.split(",");
       var redVal = Math.floor(Number(vals[0]));
       var greenVal = Math.floor(Number(vals[1]));
       var blueVal = Math.floor(Number(vals[2]));
       var heightVal = Math.floor(Number(vals[3]));
       if ( redVal>=0 && redVal<=255 && greenVal>=0 && greenVal<=255 && blueVal>=0 && blueVal<=255 && heightVal>0 && heightVal<1000 ) {
          contentData = this._PNGCreator.CreatePNG(redVal, greenVal, blueVal, heightVal);
          contentType = "image/x-png";
       } else {
          contentType = "text/plain";
          contentData = "invalid creator parameters";
       }
    }

    /* create dummy nsIURI and nsIChannel instances */
    var ios = Components.classes[kIOSERVICE_CONTRACTID]
                        .getService(nsIIOService);

    return ios.newChannel("data:"+contentType+","+escape(contentData), null, null);
    } catch (e) {
       var ios = Components.classes[kIOSERVICE_CONTRACTID]
                           .getService(nsIIOService);
       var contentType = "text/plain";
       var contentData = "Unexpected error during generation: "+e;
       return ios.newChannel("data:"+contentType+","+escape(contentData), null, null);
    }
  },

  _PNGCreator: null,

  get wrappedJSObject() { return this; }
}

var ProtocolFactory = new Object();

ProtocolFactory.createInstance = function (outer, iid)
{
  if (outer != null)
    throw Components.results.NS_ERROR_NO_AGGREGATION;

  if (!iid.equals(nsIProtocolHandler) &&
      !iid.equals(nsISupports))
    throw Components.results.NS_ERROR_NO_INTERFACE;

  return new Protocol();
}


/**
 * JS XPCOM component registration goop:
 *
 * We set ourselves up to observe the xpcom-startup category.  This provides
 * us with a starting point.
 */

var TestModule = new Object();

TestModule.registerSelf = function (compMgr, fileSpec, location, type)
{
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(kPROTOCOL_CID,
                                  kPROTOCOL_NAME,
                                  kPROTOCOL_CONTRACTID,
                                  fileSpec, 
                                  location, 
                                  type);
}

TestModule.getClassObject = function (compMgr, cid, iid)
{
  if (!cid.equals(kPROTOCOL_CID))
    throw Components.results.NS_ERROR_NO_INTERFACE;

  if (!iid.equals(Components.interfaces.nsIFactory))
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    
  return ProtocolFactory;
}

TestModule.canUnload = function (compMgr)
{
  return true;
}

function NSGetModule(compMgr, fileSpec)
{
  return TestModule;
}

