var gSALRColorsPane = {

	// Initialization
	init: function ()
	{
		function setEventListener(aId, aEventType, aCallback)
		{
			document.getElementById(aId)
			.addEventListener(aEventType, aCallback.bind(gSALRColorsPane));
		}

		this.loadColors();

		setEventListener("colorsForumtype", "command", gSALRColorsPane.loadColors);
		setEventListener("loadDefaultColorsButton", "command", gSALRColorsPane.loadDefaultColors);
		let colorSamples = ["RWND","RWNL","PITR","RD","RL","URD","URL",
				"ASL","PSL","ASD","PSD","AUL","PUL","AUD","PUD","EV","MPIQ"];
		for (let i = 0; i < colorSamples.length; i++)
			setEventListener("sample" + colorSamples[i], "click", gSALRColorsPane.editColor);
	},
	backgrounds: { '' : '#FFFFFF', 'FYAD' : '#FF9999', 'BYOB' : '#9999FF' },

	loadColors: function()
	{
		//check the dropdown's value
		let forum = document.getElementById("colorsForumtype").selectedItem.value;
		
		//set the background color
		document.getElementById('sampletableholder').style.backgroundColor = this.backgrounds[forum];
		
		//go through all the labels, uses their class to know what pref they belong to
		let tds = document.getElementById('sampletableholder').getElementsByTagName("hbox");
		for (let i in tds) {
			let td = tds[i];
			if (td.className)
			{
				let pref = document.getElementById(td.className + forum);
				if (pref) {
					if (pref.value == 0) {
						td.style.backgroundColor = "transparent";
					} else {
						td.style.backgroundColor = pref.value;
					}
				}
			}
		}
	},

	loadDefaultColors: function()
	{
		//check the dropdown's value
		let forum = document.getElementById("colorsForumtype").selectedItem.value;
		let forumname = document.getElementById("colorsForumtype").selectedItem.label;

		// Make sure this is what they want
		let doit = window.confirm("Are you sure you want to reset the " + forumname + " forum colors to their defaults?\nThis will apply immediately and cannot be undone.");
		if (!doit)
			return;

		//go through all the TDs, uses their class to know what pref they belong to
		let tds = document.getElementById("sampletableholder").getElementsByTagName("hbox");
		for (let i in tds) {
			let td = tds[i];
			let pref = document.getElementById(td.className + forum);
			if (pref) {
				try {
					// Reset the preference values for the specified forum
					let handyName = pref.name.substring(22);
					Prefs.resetPref(handyName);
					// Reset any unsaved color changes for the specified forum
					pref.value = pref.valueFromPreferences;
				} catch (e) {}
			}
		}
		
		gSALRColorsPane.loadColors();
		Styles.updateStyles();
	},

	editColor: function(event)
	{
		let targetEl = event.originalTarget;
		// check the dropdown's value for appending forum names
		let forum = document.getElementById("colorsForumtype").selectedItem.value;
		let pref;
		// Add exceptions
		if (targetEl.id === "sampleEV")
			pref = document.getElementById(targetEl.parentNode.className);
		else
			pref = document.getElementById(targetEl.parentNode.className + forum);
		if (pref)
		{
			let obj = {};
				obj.targetEl = targetEl;
				obj.value = pref.value;

			gSubDialog.open("chrome://salastread/content/colorpicker/colorpickerdialog.xul", null, obj, 
				gSALRColorsPane._colorChosenCallback.bind(this, obj));
		}
	},

	_colorChosenCallback: function(obj, aEvent)
	{
		if (obj.accepted)
		{
			let forum = document.getElementById("colorsForumtype").selectedItem.value;
			let pref = document.getElementById(obj.targetEl.parentNode.className + forum);
			pref.value = obj.value;
			// Probably can make the following more efficient:
			gSALRColorsPane.loadColors();
		}
	}

};
