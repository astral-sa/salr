var gSALRThreadsPane = {
	// Initialization
	init: function ()
	{
		function setEventListener(aId, aEventType, aCallback)
		{
			document.getElementById(aId)
			.addEventListener(aEventType, aCallback.bind(gSALRThreadsPane));
		}

		this.toggleDependentPrefUI("enableVideoEmbedderCheckbox","videoEmbedderGetTitlesCheckbox");
		this.toggleDependentPrefUI("customvidsize","videoEmbedCustomWidthbox","videoEmbedCustomWidthLabel","videoEmbedCustomHeightbox","videoEmbedCustomHeightLabel");

		setEventListener("enableVideoEmbedderCheckbox", "command", function () {
			gSALRThreadsPane.toggleDependentPrefUI("enableVideoEmbedderCheckbox",
				"videoEmbedderGetTitlesCheckbox");});
		setEventListener("radio_videoEmbedSize", "command", function () {
			gSALRThreadsPane.toggleDependentPrefUI("customvidsize",
				"videoEmbedCustomWidthbox","videoEmbedCustomWidthLabel","videoEmbedCustomHeightbox","videoEmbedCustomHeightLabel");});
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

};
