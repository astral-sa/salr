function initUsers()
{
	// This function gets called first if we runConfig to this pane.

	//get usernames/ids
	var users = DB.getCustomizedPosters();

	//get listbox so we can add users
	var listBox = document.getElementById("userColoring");

	//add users and their custom colors to the listbox
	for (var i = 0; i < users.length; i++)
	{
		addListUser(listBox, users[i].userid, users[i].username, false);
	}

	if ("arguments" in window && window.arguments.length > 0 && window.arguments[1].args)
	{
		if (window.arguments[1].args.action == "addUser")
		{
			var userid = window.arguments[1].args.userid;
			var username = window.arguments[1].args.username;
			if (!DB.userExists(userid))
			{
				DB.addUser(userid, username);
				DB.setPosterNotes(userid, "New User");
				addListUser(listBox, userid, username, true);
			}
			else
			{
				var udata = DB.isUserIdColored(userid);
				if (udata.color == 0 && udata.background == 0 && !DB.getPosterNotes(userid))
				{
					DB.setPosterNotes(userid, "New User");
					addListUser(listBox, userid, username, true);
				}
				else
				{
					// User already exists with some color info, so highlight them
					window.setTimeout(function() { selectUserById(listBox, userid); }, 10);
				}
			}
		}
	}
	// Init Customize Pane for empty selection
	updateCustomizePane();
}

//add a user to the list box with proper coloring
function addListUser(listBox, id, name, sel)
{
	var color = DB.getPosterColor(id);
	var bgColor = DB.getPosterBackground(id);
	var notes = DB.getPosterNotes(id);
	name = unescape(name);

	if (bgColor == 0) bgColor = "transparent";
	if (color == 0) color = "black";
	if (!name) name = "Unknown";
	if (!notes) notes = "";

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
	// Highlight newly added user
	if (sel === true)
	{
		window.setTimeout(function() {
			listBox.ensureElementIsVisible(li);
			listBox.selectItem(li);
		}, 10);
	}
}

// Finds and highlights a user in the list box
function selectUserById(listBox, userid)
{
	let totalItems = listBox.getRowCount();
	for (let i = 0; i < totalItems; i++)
	{
		if (listBox.getItemAtIndex(i).getAttribute("value") == userid)
		{
			listBox.ensureIndexIsVisible(i);
			listBox.selectedIndex = i;
			break;
		}
	}
}

//bring up the color picker and save/apply the new color
function changeColor(type)
{
	var li = document.getElementById("userColoring").selectedItem;
	if (!li) return;
	var userid = li.getAttribute("value");

	var obj = {};

	if (type === "color")
	{
		obj.value = DB.getPosterColor(userid);
	}
	else
	{
		obj.value = DB.getPosterBackground(userid);
	}

	window.openDialog("chrome://salastread/content/colorpicker/colorpickerdialog.xul", "colorpickerdialog", "modal,chrome", obj);

	if (obj.accepted)
	{
		var value = obj.value;

		if (type === "color")
		{
			if (value == 0)
			{
				value = "black";
			}

			li.childNodes[1].style.color = value;
			DB.setPosterColor(li.getAttribute("value"), obj.value);
		}
		else
		{
			if (value == 0)
			{
				value = "transparent";
			}

			li.childNodes[1].style.backgroundColor = value;
			DB.setPosterBackground(li.getAttribute("value"), obj.value);
		}
		updateCustomizePane();
	}
}

//add a user from a prompt dialog
function addUser()
{
	//get prompt set up
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);

	var text = {value : ''};
	var check = {value : false};
	var result = prompts.prompt(null, "Add User Coloring", "Please enter the user's SA Forums ID number\n\nTheir username will be picked up while browsing the forums", text, null, check);

	//only accepts integers right now
	if (result && !isNaN(text.value) && text.value != 0)
	{
		var listBox = document.getElementById("userColoring");
		if (!DB.userExists(text.value))
		{
			DB.addUser(text.value);
			DB.setPosterNotes(text.value, "New User");

			addListUser(listBox, text.value, null, true);
		}
		else
		{
			var udata = DB.isUserIdColored(text.value);
			// user is in the database, but has no info set
			if (udata.color == 0 && udata.background == 0 && !DB.getPosterNotes(text.value))
			{
				// Make sure we aren't already working with this id
				var foundit = false;
				for (var i = 0; i < listBox.childNodes.length; ++i)
				{
					if (listBox.childNodes[i].value == text.value)
					{
						foundit = true;
						break;
					}
				}
				if (foundit == false)
				{
					DB.setPosterNotes(text.value, "New User");
					addListUser(listBox, text.value, udata.username, true);
				}
				else
					alert("Error: User already has custom highlighting.");
			}
			else // user is in the database, but has color set
				alert("Error: User already has custom highlighting.");
		}
	}
}

//remove a user from the list box and reset their coloring to transparent
function deleteUser()
{
	var listbox = document.getElementById("userColoring");
	var items = listbox.selectedItems;

	for (var i in items)
	{
		var userid = items[i].getAttribute("value");
		DB.setPosterColor(userid, "0");
		DB.setPosterBackground(userid, "0");
		DB.setPosterNotes(userid, "");

		listbox.removeItemAt(listbox.getIndexOfItem(items[i]));
	}
}

//Add/edit a note for a user
function editNote()
{
	var li = document.getElementById("userColoring").selectedItem;
	if (!li) return;

	//get prompt set up
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);

	var text = {value : DB.getPosterNotes(li.getAttribute("value"))};
	var check = {value : false};
	var result = prompts.prompt(null, "User Note", "Edit the note to appear for this user", text, null, check);

	if (result)
	{
		DB.setPosterNotes(li.getAttribute("value"), text.value);
		li.childNodes[2].setAttribute("label", text.value);
		updateCustomizePane();
	}
}

// Called when listbox selection is updated or if we need to manually update
function updateCustomizePane()
{
	try
	{
		var sellist = document.getElementById("userColoring").selectedItems;
		// Just allow one for now.
		if (sellist)
		{
			sellist = sellist[0];
		}
		if (sellist)
		{
			var children = document.getElementById("customizevbox").getElementsByTagName('*');
			for (var i = 0; i < children.length; i++)
				children[i].disabled = false;
			document.getElementById("deleteuserbutton").disabled = false;
			var cusername = sellist.childNodes[1].getAttribute("label");
			var cnote = sellist.childNodes[2].getAttribute("label");
			var cuidstring = ' (' + sellist.childNodes[0].getAttribute("label") + ')';
			document.getElementById("fgthumbnail").style.backgroundColor = sellist.childNodes[1].style.color;
			document.getElementById("bgthumbnail").style.backgroundColor = sellist.childNodes[1].style.backgroundColor;
			if (cnote)
				cnote = cnote.replace(/(?:<br \/>)/g, "\n");
			document.getElementById("usernotebox").value = cnote;
			if (cusername && cusername != 'null' && cusername != 'Unknown')
			{
				cuidstring = '';
			}
			else
			{
				cusername = 'unknown user';
			}
			document.getElementById("customizelabel").setAttribute("value", cusername + cuidstring);
		}
		else
		{
			// Nothing selected or empty list
			var children = document.getElementById("customizevbox").getElementsByTagName('*');
			for (var i = 0; i < children.length; i++)
				children[i].disabled = true;
			document.getElementById("deleteuserbutton").disabled = true;
			document.getElementById("fgthumbnail").style.backgroundColor = 'transparent';
			document.getElementById("bgthumbnail").style.backgroundColor = 'transparent';
			document.getElementById("usernotebox").value = '';
			document.getElementById("customizelabel").setAttribute("value", "Select a user to customize");
		}
	}
	catch(e)
	{ 
		alert("users select error: " + e); 
	}
}

function colorClicked(el, ctype)
{
	var li = document.getElementById("userColoring").selectedItem;
	if (!li)
		return;
	var userid = li.getAttribute("value");
	var pobj = new Object();
	if (ctype === 'fgcolor')
		pobj.value = DB.getPosterColor(userid);
	else
		pobj.value = DB.getPosterBackground(userid);
	pobj.accepted = false;
	window.openDialog('chrome://salastread/content/colorpicker/colorpickerdialog.xul', 'colorpickerdialog', 'modal,chrome',pobj);
	if (pobj.accepted)
	{
		var friendlyvalue = pobj.value;
		if (pobj.value == 0 && ctype == 'bgcolor')
		{
			friendlyvalue = 'transparent';
		}
		el.style.backgroundColor = friendlyvalue;
		if (ctype == 'fgcolor')
		{
			li.childNodes[1].style.color = friendlyvalue;
			DB.setPosterColor(userid, pobj.value);
		}
		else
		{
			li.childNodes[1].style.backgroundColor = friendlyvalue;
			DB.setPosterBackground(userid, pobj.value);
		}
	}
}

function updateNote()
{
	var li = document.getElementById("userColoring").selectedItem;
	if (!li)
		return;
	var newnotetext = document.getElementById("usernotebox").value;
	newnotetext = newnotetext.replace(/(?:\n)/g, "<br />");
	DB.setPosterNotes(li.getAttribute("value"), newnotetext);
	li.childNodes[2].setAttribute("label", newnotetext);
}