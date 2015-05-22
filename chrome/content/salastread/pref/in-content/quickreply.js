var gSALRQuickReplyPane = {
	// Initialization
	init: function ()
	{
		function setEventListener(aId, aEventType, aCallback)
		{
			document.getElementById(aId)
			.addEventListener(aEventType, aCallback.bind(gSALRQuickReplyPane));
		}

		this.toggleDependentPrefUI("useQuickQuoteCheckbox","qQSubDC","qQSigDC","qQDSDC",
			"qQSPPC","qQLPC");

		setEventListener("useQuickQuoteCheckbox", "command", function () {
			gSALRQuickReplyPane.toggleDependentPrefUI("useQuickQuoteCheckbox",
				"qQSubDC","qQSigDC","qQDSDC","qQSPPC","qQLPC");});
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
