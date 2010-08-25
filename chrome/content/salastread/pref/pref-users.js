var persistObject = null;

function initUsers()
{
	//we'll need this persistObject all over, better create it now
	persistObject = Components.classes['@evercrest.com/salastread/persist-object;1']  
					.getService().wrappedJSObject;

	//get usernames/ids
	var users = persistObject.getCustomizedPosters();

	//get listbox so we can add users
	var listBox = document.getElementById("userColoring");

	//add users and their custom colors to the listbox
	for (var i = 0; i < users.length; i++)
	{
		addListUser(listBox, users[i].userid, users[i].username);
	}

	if ("arguments" in window && window.arguments.length > 0 && window.arguments[1].args)
	{
		if (window.arguments[1].args.action == "addUser")
		{
			var userid = window.arguments[1].args.userid;
			var username = window.arguments[1].args.username;
			if (!persistObject.userExists(userid))
			{
				persistObject.addUser(userid, username);
				persistObject.setPosterNotes(userid, "New User");
				addListUser(listBox, userid, username);
			}
			else
			{
				var udata = persistObject.isUserIdColored(userid);
				if (udata.color == 0 && udata.background == 0 && !persistObject.getPosterNotes(userid))
				{
					persistObject.setPosterNotes(userid, "New User");
					addListUser(listBox, userid, username);
				}
			}
		}
	}
	updateCustomizePane();
}

//add a user to the list box with proper coloring
function addListUser(listBox, id, name)
{
	var color = persistObject.getPosterColor(id);
	var bgColor = persistObject.getPosterBackground(id);
	var notes = persistObject.getPosterNotes(id);
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
}

//bring up the color picker and save/apply the new color
function changeColor(type)
 {
	var li = document.getElementById("userColoring").selectedItem;
	if (!li) return;
	var userid = li.value;

	var obj = {};

	if (type === "color")
	{
		obj.value = persistObject.getPosterColor(userid);
	}
	else
	{
		obj.value = persistObject.getPosterBackground(userid);
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
			persistObject.setPosterColor(li.value, obj.value);
		}
		else
		{
			if (value == 0)
			{
				value = "transparent";
			}

			li.childNodes[1].style.backgroundColor = value;
			persistObject.setPosterBackground(li.value, obj.value);
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
		if (!persistObject.userExists(text.value))
		{
			persistObject.addUser(text.value);
			persistObject.setPosterNotes(text.value, "New User");

			addListUser(listBox, text.value, null);
		}
		else
		{
			var udata = persistObject.isUserIdColored(text.value);
			// user is in the database, but has no info set
			if (udata.color == 0 && udata.background == 0 && !persistObject.getPosterNotes(text.value))
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
					persistObject.setPosterNotes(text.value, "New User");
					addListUser(listBox, text.value, udata.username);
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
		var userid = items[i].value;
		persistObject.setPosterColor(userid, "0");
		persistObject.setPosterBackground(userid, "0");
		persistObject.setPosterNotes(userid, "");

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

	var text = {value : persistObject.getPosterNotes(li.value)};
	var check = {value : false};
	var result = prompts.prompt(null, "User Note", "Edit the note to appear for this user", text, null, check);

	if (result)
	{
		persistObject.setPosterNotes(li.value, text.value);
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
	var pobj = new Object();
	if (ctype === 'fgcolor')
		pobj.value = persistObject.getPosterColor(li.value);
	else
		pobj.value = persistObject.getPosterBackground(li.value);
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
			persistObject.setPosterColor(li.value, pobj.value);
		}
		else
		{
			li.childNodes[1].style.backgroundColor = friendlyvalue;
			persistObject.setPosterBackground(li.value, pobj.value);
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
	persistObject.setPosterNotes(li.value, newnotetext);
	li.childNodes[2].setAttribute("label", newnotetext);
}