function initGeneral() {
	toggleLastReadIcon();
	toggleUnvisitIcon();
}

function toggleLastReadIcon() {
	if(document.getElementById("toggleLastReadIcon").checked) {
		//enable the others
		document.getElementById("lastReadIcon").disabled = false;
		document.getElementById("lastReadIconDefault").disabled = false;
		document.getElementById("alwayShowLastReadIcon").disabled = false;
	} else {
		//disable
		document.getElementById("lastReadIcon").disabled = true;
		document.getElementById("lastReadIconDefault").disabled = true;
		document.getElementById("alwayShowLastReadIcon").disabled = true;
	}
}

function toggleUnvisitIcon() {
	if(document.getElementById("toggleUnvisitIcon").checked) {
		//enable
		document.getElementById("unvisitIcon").disabled = false;
		document.getElementById("unvisitIconDefault").disabled = false;
	} else {
		//disable
		document.getElementById("unvisitIcon").disabled = true;
		document.getElementById("unvisitIconDefault").disabled = true;
	}
}

function lastReadIconDefault() {
	try {
		var pref = document.getElementById("goToLastReadPost");
			pref.reset();
	} catch(e) {}
	
	pref.value = pref.valueFromPreferences;
}

function unvisitIconDefault() {
	try {
		var pref = document.getElementById("markThreadUnvisited");
			pref.reset();
	} catch(e) {}
	
	pref.value = pref.valueFromPreferences;
}