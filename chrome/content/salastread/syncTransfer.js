var persistObject;

function winError() {
	Components.utils.reportError("Error");
	window.close();
}

function startTransfer() {
	persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
					.createInstance(Components.interfaces.nsISupports);
	persistObject = persistObject.wrappedJSObject;

	var res = persistObject.PerformRemoteSync(true, 
				function(s) { syncCallback(true, "Done.", s); }, 
				function(a) { syncCallback(false, a, 0); });
	
	if (res.bad) {
		Components.utils.reportError("Sync error:\n" + res.msg);
		window.close();
	}
}

function syncCallback(done, statusString, statusCode) {
	if (done) {
		if (statusCode == 0) {
			setTimeout(cbX, 10);
		}
		return;
	}
	document.getElementById("stat").setAttribute("value", statusString);
}

function cbX() {
	openDialog("chrome://salastread/content/closer.xul", "_blank");
	window.close();
}