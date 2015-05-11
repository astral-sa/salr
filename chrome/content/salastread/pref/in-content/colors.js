var gSALRColorsPane = {

	myprefs: null,

	// Initialization
	init: function ()
	{
		if (this.myprefs === null)
			this.myprefs = Components.classes["@mozilla.org/preferences;1"].
			getService(Components.interfaces.nsIPrefService).
			getBranch("extensions.salastread.");
		this.loadColors();
	},
	backgrounds: { '' : '#FFFFFF', 'FYAD' : '#FF9999', 'BYOB' : '#9999FF' },

	loadColors: function()
	{
		//check the dropdown's value
		var forum = document.getElementById("forumtype").selectedItem.value;
		
		//set the background color
		document.getElementById('sampletableholder').style.backgroundColor = this.backgrounds[forum];
		
		//go through all the TDs, uses their class to know what pref they belong to
		var tds = document.getElementById('sampletableholder').getElementsByTagNameNS("http://www.w3.org/1999/xhtml","td");
		for(var i in tds) {
			var td = tds[i];
			if (td.className)
			{
				var pref = document.getElementById(td.className + forum);
				if(pref) {
					if(pref.value == 0) {
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
		var forum = document.getElementById("forumtype").selectedItem.value;
		var forumname = document.getElementById("forumtype").selectedItem.label;

		// Make sure this is what they want
		var doit = window.confirm("Are you sure you want to reset the " + forumname + " forum colors to their defaults?\nThis will apply immediately and cannot be undone.");
		if (!doit)
			return;

		//go through all the TDs, uses their class to know what pref they belong to
		var tds = document.getElementById("sampletableholder").getElementsByTagNameNS("http://www.w3.org/1999/xhtml","td");
		for(var i in tds) {
			var td = tds[i];
			var pref = document.getElementById(td.className + forum);
			if(pref) {
				try {
					// Reset the preference values for the specified forum
					var handyname = pref.name.substring(22);
					if (this.myprefs.prefHasUserValue(handyname))
						this.myprefs.clearUserPref(handyname);
					// Reset any unsaved color changes for the specified forum
					pref.value = pref.valueFromPreferences;
				} catch (e) {}
			}
		}
		
		this.loadColors();
		gSALRservice.updateStyles();
	},

	editColor: function(event, targetEl)
	{
		//check the dropdown's value
		var forum = document.getElementById("forumtype").selectedItem.value;
		var pref = document.getElementById(targetEl.className + forum);
		if(pref) {
			var obj = {};
				obj.targetEl = targetEl;
				obj.value = pref.value;

			gSubDialog.open("chrome://salastread/content/colorpicker/colorpickerdialog.xul", null, obj, 
				this._colorChosenCallback.bind(this, obj));
		}
	},

	_colorChosenCallback: function(obj, aEvent)
	{
		if (obj.accepted)
		{
			var forum = document.getElementById("forumtype").selectedItem.value;
			var pref = document.getElementById(obj.targetEl.className + forum);
			pref.value = obj.value;
			this.loadColors();
		}
	}

};
