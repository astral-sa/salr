function initForums()
{
	toggleDependentPrefUI("newReCount","newReCountNewLine");
	toggleDependentPrefUI("showThreadsWNPCP","promoteStickiesWNPCP");
	toggleDependentPrefUI("toggleLastReadIcon","lastReadLabel","lastReadIcon","lastReadIconDefault");
	toggleDependentPrefUI("toggleUnvisitIcon","unvisitLabel","unvisitIcon","unvisitIconDefault");

	setEventListener("newReCount", "command", function() {
		toggleDependentPrefUI("newReCount","newReCountNewLine");});
	setEventListener("showThreadsWNPCP", "command", function() {
		toggleDependentPrefUI("showThreadsWNPCP","promoteStickiesWNPCP");});
	setEventListener("toggleLastReadIcon", "command", function() {
		toggleDependentPrefUI("toggleLastReadIcon","lastReadLabel","lastReadIcon","lastReadIconDefault");});
	setEventListener("toggleUnvisitIcon", "command", function() {
		toggleDependentPrefUI("toggleUnvisitIcon","unvisitLabel","unvisitIcon","unvisitIconDefault");});
	setEventListener("lastReadIconDefault", "command", lastReadIconDefault);
	setEventListener("unvisitIconDefault", "command", unvisitIconDefault);
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
