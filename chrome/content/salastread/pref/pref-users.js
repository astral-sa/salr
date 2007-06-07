var persistObject = null;

function initUsers() {
	//we'll need this persistObject all over, better create it now
	persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
		.createInstance(Components.interfaces.nsISupports);
	persistObject = persistObject.wrappedJSObject;
	
	//get usernames/ids
	var users = persistObject.getCustomizedPosters();
	
	//get listbox so we can add users
	var listBox = document.getElementById("userColoring");
	
	//add users and their custom colors to the listbox
	for(var i = 0; i < users.length; i++) {
		addListUser(listBox, users[i].userid, users[i].username);
	}
	
	if("arguments" in window && window.arguments.length > 0) {
		if(window.arguments[1].args.action == "addUser") {
			var userid = window.arguments[1].args.userid;
			var username = window.arguments[1].args.username;
		
			if(!persistObject.userExists(userid)) {
				persistObject.addUser(userid, username);
				addListUser(listBox, userid, username);
			} else if(!persistObject.isPosterColored(userid) && !persistObject.getPosterNotes(userid)) {
				addListUser(listBox, userid, username);
			}
		}
	}	
}

//add a user to the list box with proper coloring
function addListUser(listBox, id, name) {
	var color = persistObject.getPosterColor(id);
	var bgColor = persistObject.getPosterBackground(id);
	var notes = persistObject.getPosterNotes(id);

	if(bgColor == 0) { bgColor = "transparent"; }
	if(color == 0) { color = "black"; }
	if(!name) { name = "Unknown"; }
	if(!notes) { notes = ""; }
	
	var li = document.createElement("listitem");
		li.setAttribute("value", id);
	
	var idCell = document.createElement("listcell");
		idCell.setAttribute("label", id);
	
	var nameCell = document.createElement("listcell");
		nameCell.setAttribute("label", name);
		nameCell.style.color = color;
		nameCell.style.backgroundColor = bgColor;

	var noteCell = document.createElement("listcell");
		noteCell.setAttribute("label", notes);
	
	li.appendChild(idCell);
	li.appendChild(nameCell);
	li.appendChild(noteCell);
	
	listBox.appendChild(li);
}

//bring up the color picker and save/apply the new color
function changeColor(type) {
	var li = document.getElementById("userColoring").selectedItem;
	if(!li) { return; }
	var userid = li.value;
	
	var obj = {};
	
	if(type === "color") {
		obj.value = persistObject.getPosterColor(userid);
	} else {
		obj.value = persistObject.getPosterBackground(userid);
	}
	
	window.openDialog("chrome://salastread/content/colorpicker/colorpickerdialog.xul", "colorpickerdialog", "modal,chrome", obj);
	
	if(obj.accepted) {
		var value = obj.value;
		
		if(type === "color") {
			if(value == 0) {
				value = "black";
			}
			
			li.childNodes[1].style.color = value;
			
			persistObject.setPosterColor(li.value, obj.value);
		} else { 
			if(value == 0) {
				value = "transparent";
			}
			
			li.childNodes[1].style.backgroundColor = value;
			
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
	if(result && !isNaN(text.value)) {
		persistObject.addUser(text.value);
		persistObject.setPosterNotes(text.value, "New User");
		
		var listBox = document.getElementById("userColoring");
		addListUser(listBox, text.value, null);
	}
}

//remove a user from the list box and reset their coloring to transparent
function deleteUser() {
	var listbox = document.getElementById("userColoring");
	var items = listbox.selectedItems;
	
	for(var i in items) {
		var userid = items[i].value;
		
		persistObject.setPosterColor(userid, "0");
		persistObject.setPosterBackground(userid, "0");
		persistObject.setPosterNotes(userid, "");
		
		listbox.removeItemAt(listbox.getIndexOfItem(items[i]));
	}
}

//Add/edit a note for a user
function editNote() {
	var li = document.getElementById("userColoring").selectedItem;
	if(!li) { return; }
	
	//get prompt set up
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
	
	var text = {value : persistObject.getPosterNotes(li.value)};
	var check = {value : false};
	var result = prompts.prompt(null, "User Note", "Edit the note to appear for this user", text, null, check);
	
	if(result) {
		persistObject.setPosterNotes(li.value, text.value);
		
		li.childNodes[2].setAttribute("label", text.value);
	}
}