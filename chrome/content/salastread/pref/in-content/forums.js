var gSALRForumsPane = {
	// Initialization
	init: function ()
	{
		this.toggleNewReCount();
		this.toggleUnvisitIcon();
		this.toggleLastReadIcon();
		this.togglePromoteStickiesInCP();
	},

	// the below functions enable/disable UI elements based upon preference settings
	toggleNewReCount: function()
	{
		if (document.getElementById("newReCount").checked && !document.getElementById("newReCount").disabled)
			document.getElementById("newReCountNewLine").disabled = false;
		else
			document.getElementById("newReCountNewLine").disabled = true;
	},

	toggleLastReadIcon: function()
	{
		if (document.getElementById("toggleLastReadIcon").checked) {
			//enable the others
			document.getElementById("lastReadIcon").disabled = false;
			document.getElementById("lastReadIconDefault").disabled = false;
		} else {
			//disable
			document.getElementById("lastReadIcon").disabled = true;
			document.getElementById("lastReadIconDefault").disabled = true;
		}
	},

	toggleUnvisitIcon: function()
	{
		if (document.getElementById("toggleUnvisitIcon").checked) {
			//enable
			document.getElementById("unvisitIcon").disabled = false;
			document.getElementById("unvisitIconDefault").disabled = false;
		} else {
			//disable
			document.getElementById("unvisitIcon").disabled = true;
			document.getElementById("unvisitIconDefault").disabled = true;
		}
	},

	togglePromoteStickiesInCP: function()
	{
		if (document.getElementById("showThreadsWNPCP").checked && !document.getElementById("showThreadsWNPCP").disabled)
			document.getElementById("promoteStickiesWNPCP").disabled = false;
		else
			document.getElementById("promoteStickiesWNPCP").disabled = true;
	},

	lastReadIconDefault: function()
	{
		try {
			var pref = document.getElementById("goToLastReadPost");
				pref.reset();
		} catch(e) {}

		pref.value = pref.valueFromPreferences;
	},

	unvisitIconDefault: function()
	{
		try {
			var pref = document.getElementById("markThreadUnvisited");
				pref.reset();
		} catch(e) {}

		pref.value = pref.valueFromPreferences;
	}
};
