var backgrounds = { '' : '#FFFFFF', 'FYAD' : '#FF9999', 'BYOB' : '#9999FF' };

function loadColors() {
	//check the dropdown's value
	var forum = document.getElementById("forumtype").selectedItem.value;
	
	//set the background color
	document.getElementById('sampletableholder').style.backgroundColor = backgrounds[forum];
	
	//go through all the TDs, uses their class to know what pref they belong to
	var tds = document.getElementById("sampletableholder").getElementsByTagName('td');
	for(var i in tds) {
		var td = tds[i];
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

function loadDefaultColors() {
	//check the dropdown's value
	var forum = document.getElementById("forumtype").selectedItem.value;
	
	//go through all the TDs, uses their class to know what pref they belong to
	var tds = document.getElementById("sampletableholder").getElementsByTagName('td');
	for(var i in tds) {
		var td = tds[i];
		var pref = document.getElementById(td.className + forum);
		if(pref) {
			try {
				//reset the actual pref value
				pref.reset();
				//reset the pref value if a change hasn't been saved
				pref.value = pref.valueFromPreferences;
			} catch (e) {}
		}
	}
	
	loadColors();
}

function editColor(event, targetEl) {
	//check the dropdown's value
	var forum = document.getElementById("forumtype").selectedItem.value;

	var pref = document.getElementById(targetEl.className + forum);
	if(pref) {
		var obj = {};
			obj.value = pref.value;
	
		window.openDialog("chrome://salastread/content/colorpicker/colorpickerdialog.xul", "colorpickerdialog", "chrome", obj);
		if(obj.accepted) {
			pref.value = obj.value;
			loadColors();
		}
	}
}

function toggleUserHighlighting() {
	if(document.getElementById("userHighlighting").checked) {
		//enable the others
		document.getElementById("adminColorPicker").disabled = false;
		document.getElementById("modColorPicker").disabled = false;
		document.getElementById("opColorPicker").disabled = false;
	} else {
		//disable
		document.getElementById("adminColorPicker").disabled = true;
		document.getElementById("modColorPicker").disabled = true;
		document.getElementById("opColorPicker").disabled = true;
	}	
}