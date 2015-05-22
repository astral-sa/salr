var gSALRForumsPane = {
	// Initialization
	init: function()
	{
		function setEventListener(aId, aEventType, aCallback)
		{
			document.getElementById(aId)
			.addEventListener(aEventType, aCallback.bind(gSALRForumsPane));
		}

		this.toggleDependentPrefUI("newReCount","newReCountNewLine");
		this.toggleDependentPrefUI("showThreadsWNPCP","promoteStickiesWNPCP");
		this.toggleDependentPrefUI("toggleLastReadIcon","lastReadLabel","lastReadIcon","lastReadIconDefault");
		this.toggleDependentPrefUI("toggleUnvisitIcon","unvisitLabel","unvisitIcon","unvisitIconDefault");

		setEventListener("newReCount", "command", function () {
			gSALRForumsPane.toggleDependentPrefUI("newReCount","newReCountNewLine");});
		setEventListener("showThreadsWNPCP", "command", function () {
			gSALRForumsPane.toggleDependentPrefUI("showThreadsWNPCP","promoteStickiesWNPCP");});
		setEventListener("toggleLastReadIcon", "command", function () {
			gSALRForumsPane.toggleDependentPrefUI("toggleLastReadIcon","lastReadLabel","lastReadIcon","lastReadIconDefault");});
		setEventListener("toggleUnvisitIcon", "command", function () {
			gSALRForumsPane.toggleDependentPrefUI("toggleUnvisitIcon","unvisitLabel","unvisitIcon","unvisitIconDefault");});
		setEventListener("lastReadIconDefault", "command", gSALRForumsPane.lastReadIconDefault);
		setEventListener("unvisitIconDefault", "command", gSALRForumsPane.unvisitIconDefault);
	},

	/* Function to toggle the disabled status of preferences
		that depend on the status of another preference.
		Supported controller types: checkbox, radio */
	toggleDependentPrefUI: function(controller)
	{
		let totalArgs = arguments.length;
		if (totalArgs > 1)
		{
			let valToUse;
			let controlNode = document.getElementById(controller);
			if (controlNode.nodeName.toLowerCase() === "checkbox")
				valToUse = !controlNode.checked;
			else if (controlNode.nodeName.toLowerCase() === "radio")
				valToUse = !controlNode.selected;
			else return;
			for (let i = 1; i < totalArgs; i++)
				document.getElementById(arguments[i]).disabled = valToUse;
		}
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
