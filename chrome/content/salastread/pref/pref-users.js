var persistObject = null;

function initUsers() {
	//we'll need this persistObject all over, better create it now
	persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
		.createInstance(Components.interfaces.nsISupports);
	persistObject = persistObject.wrappedJSObject;
	
	//get usernames/ids
	var users = persistObject.getColoredPosters();
	
	//get listbox so we can add users
	var listBox = document.getElementById("userColoring");
	
	//add users and their custom colors to the listbox
	for(var i = 0; i < users.length; i++) {
		var id = users[i].userid;
		var name = users[i].username;
		var color = persistObject.getPosterColor(id);
		var bgColor = persistObject.getPosterBackground(id);
	
		addListUser(listBox, name, id, color, bgColor);
	}
}

//add a user to the list box with proper coloring
function addListUser(listBox, name, id, color, bgColor) {
	var li = listBox.appendItem(name, id);
	if(color) { li.style.color = color; }
	if(bgColor) { li.style.backgroundColor = bgColor; }	
}

//bring up the color picker and save/apply the new color
function changeColor(type) {
	var li = document.getElementById("userColoring").selectedItem;
	
	var obj = {};
	
	if(type === "color") {
		obj.value = li.style.color;
	} else {
		obj.value = li.style.backgroundColor;
	}
	
	window.openDialog("chrome://salastread/content/colorpicker/colorpickerdialog.xul", "colorpickerdialog", "chrome", obj);
	
	if(obj.accepted) {
		if(type === "color") { 
			li.style.color = obj.value; 
			persistObject.setPosterColor(li.value, obj.value);
		} else { 
			li.style.backgroundColor = obj.value; 
			persistObject.setPosterBackground(li.value, obj.value);
		}
	}
}

//add a user from a prompt dialog
function addUser() {
	//get prompt set up
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
	
	var text = {value : ''};
	var check = {value : false};
	var result = prompts.prompt(null, "Add User Coloring", "Please enter the user's SA Forums ID\n\nTheir username will be picked up while browsing the forums", text, null, check);
	
	//only accepts integers right now
	if(!isNaN(text.value)) {
		persistObject.addUser(text.value);
		persistObject.setPosterColor(text.value, "#000000");
		
		var listBox = document.getElementById("userColoring");
		addListUser(listBox, text.value, text.value, persistObject.getPosterColor(text.value), '');
	}
}

function deleteUser() {
	var listbox = document.getElementById("userColoring");
	var items = listbox.selectedItems;
	
	for(var i in items) {
		var userid = items[i].value;
		
		persistObject.setPosterColor(userid, "0");
		persistObject.setPosterBackground(userid, "0");
		listbox.removeItemAt(listbox.getIndexOfItem(items[i]));
	}
}