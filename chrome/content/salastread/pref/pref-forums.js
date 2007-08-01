function initForums() {
	toggleIconsSource();
	toggleNewReCount();
}

function toggleNewReCount() {
	if(document.getElementById("newReCount").checked && !document.getElementById("newReCount").disabled) {
		document.getElementById("newReCountNewLine").disabled = false;
	} else {
		document.getElementById("newReCountNewLine").disabled = true;
	}
}

function toggleIconsSource() {
	if(document.getElementById("toggleExtensionIcons").checked) {
		document.getElementById("toggleLastReadIcon").disabled = false;
		document.getElementById("toggleUnvisitIcon").disabled = false;
		document.getElementById("newReCountNewLine").disabled = false;
		document.getElementById("newReCount").disabled = false;
		
		toggleLastReadIcon();
		toggleUnvisitIcon();
		toggleNewReCount();
	} else {
		document.getElementById("toggleLastReadIcon").disabled = true;
		document.getElementById("lastReadIcon").disabled = true;
		document.getElementById("lastReadIconDefault").disabled = true;
		document.getElementById("alwayShowLastReadIcon").disabled = true;
		document.getElementById("toggleUnvisitIcon").disabled = true;
		document.getElementById("unvisitIcon").disabled = true;
		document.getElementById("unvisitIconDefault").disabled = true;
		document.getElementById("newReCountNewLine").disabled = true;
		document.getElementById("newReCount").disabled = true;
	}
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
