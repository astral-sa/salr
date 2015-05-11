var gSALRUsersPane = {
	// Initialization
	init: function()
	{
		//get usernames/ids
		var users = gSALRservice.getCustomizedPosters();

		//get listbox so we can add users
		var listBox = document.getElementById("userColoring");

		//add users and their custom colors to the listbox
		for (var i = 0; i < users.length; i++)
		{
			this.addListUser(listBox, users[i].userid, users[i].username, false);
		}
/* This will deserve an extra look or three
		if ("arguments" in window && window.arguments.length > 0 && window.arguments[1].args)
		{
			if (window.arguments[1].args.action == "addUser")
			{
				var userid = window.arguments[1].args.userid;
				var username = window.arguments[1].args.username;
				if (!gSALRservice.userExists(userid))
				{
					gSALRservice.addUser(userid, username);
					gSALRservice.setPosterNotes(userid, "New User");
					addListUser(listBox, userid, username, true);
				}
				else
				{
					var udata = gSALRservice.isUserIdColored(userid);
					if (udata.color == 0 && udata.background == 0 && !gSALRservice.getPosterNotes(userid))
					{
						gSALRservice.setPosterNotes(userid, "New User");
						addListUser(listBox, userid, username, true);
					}
					else
					{
						// User already exists with some color info, so highlight them
						selectUserById(listBox, userid);
					}
				}
			}
		}*/
		this.updateCustomizePane();
	},

	//add a user to the list box with proper coloring
	addListUser: function(listBox, id, name, sel)
	{
		var color = gSALRservice.getPosterColor(id);
		var bgColor = gSALRservice.getPosterBackground(id);
		var notes = gSALRservice.getPosterNotes(id);
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
			listBox.selectItem(li);
	},

	// Finds and highlights a user in the list box
	selectUserById: function(listBox, userid)
	{
		for (var i = 0; i < listBox.childNodes.length; i++)
		{
			if (listBox.childNodes[i].getAttribute("value") == userid)
			{
				listBox.selectItem(listBox.childNodes[i]);
				break;
			}
		}
	},

	// bring up the color picker and save/apply the new color (from context menu)
	changeColor: function(type)
	{
		var li = document.getElementById("userColoring").selectedItem;
		if (!li) return;
		var userid = li.getAttribute("value");

		var obj = {};

		if (type === "color")
		{
			obj.value = gSALRservice.getPosterColor(userid);
		}
		else
		{
			obj.value = gSALRservice.getPosterBackground(userid);
		}
		obj.li = li;
		obj.type = type;
		gSubDialog.open("chrome://salastread/content/colorpicker/colorpickerdialog.xul", null, obj, 
			this._changeColorCallback.bind(this, obj));
	},

	_changeColorCallback: function(obj, aEvent)
	{
		if (obj.accepted)
		{
			var value = obj.value;

			if (obj.type === "color")
			{
				if (value == 0)
				{
					value = "black";
				}

				obj.li.childNodes[1].style.color = value;
				gSALRservice.setPosterColor(obj.li.getAttribute("value"), obj.value);
			}
			else
			{
				if (value == 0)
				{
					value = "transparent";
				}

				obj.li.childNodes[1].style.backgroundColor = value;
				gSALRservice.setPosterBackground(obj.li.getAttribute("value"), obj.value);
			}
			this.updateCustomizePane();
		}
	},

	// add a user from 'Add User' button - prompt for ID
	addUser: function()
	{
		try
		{
			// get tab-modal prompt set up
			var text = {value : ''};
			var check = {value : false};
			let factory = Components.classes["@mozilla.org/prompter;1"]
								.getService(Components.interfaces.nsIPromptFactory);
			let prompt = factory.getPrompt(window, Components.interfaces.nsIPrompt);
			let bag = prompt.QueryInterface(Components.interfaces.nsIWritablePropertyBag2);
			bag.setPropertyAsBool("allowTabModal", true);
			var result = prompt.prompt.apply(null, ["Add User Coloring", "Please enter the SA Forums ID NUMBER of the user to add.\n\nTheir username will be picked up while browsing the forums", text, null, check]);

			//only accepts integers right now
			if (result && !isNaN(text.value) && text.value != 0)
			{
				var listBox = document.getElementById("userColoring");
				if (!gSALRservice.userExists(text.value))
				{
					gSALRservice.addUser(text.value);
					gSALRservice.setPosterNotes(text.value, "New User");

					this.addListUser(listBox, text.value, null, true);
				}
				else
				{
					var udata = gSALRservice.isUserIdColored(text.value);
					// user is in the database, but has no info set
					if (udata.color == 0 && udata.background == 0 && !gSALRservice.getPosterNotes(text.value))
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
							gSALRservice.setPosterNotes(text.value, "New User");
							this.addListUser(listBox, text.value, udata.username, true);
						}
						else
							alert("Error: User already has custom highlighting.");
					}
					else // user is in the database, but has color set
						alert("Error: User already has custom highlighting.");
				}
			}
		}
		catch (e)
		{
			// Exception is thrown if tab is closed
		}
	},

	//remove a user from the list box and reset their coloring to transparent
	deleteUser: function()
	{
		var listbox = document.getElementById("userColoring");
		var items = listbox.selectedItems;

		for (var i in items)
		{
			var userid = items[i].getAttribute("value");
			gSALRservice.setPosterColor(userid, "0");
			gSALRservice.setPosterBackground(userid, "0");
			gSALRservice.setPosterNotes(userid, "");

			listbox.removeItemAt(listbox.getIndexOfItem(items[i]));
		}
	},

	//Add/edit a note for a user
	editNote: function()
	{
		var li = document.getElementById("userColoring").selectedItem;
		if (!li) return;
		try
		{
			// get tab-modal prompt set up
			let text = {value : gSALRservice.getPosterNotes(li.getAttribute("value"))};
			let check = {value : false};
			let factory = Components.classes["@mozilla.org/prompter;1"]
							.getService(Components.interfaces.nsIPromptFactory);
			let prompt = factory.getPrompt(window, Components.interfaces.nsIPrompt);
			let bag = prompt.QueryInterface(Components.interfaces.nsIWritablePropertyBag2);
			bag.setPropertyAsBool("allowTabModal", true);
			let result = prompt.prompt.apply(null, ["User Note", "Edit the note to appear for this user", text, null, check]);
			if (result)
			{
				gSALRservice.setPosterNotes(li.getAttribute("value"), text.value);
				li.childNodes[2].setAttribute("label", text.value);
				this.updateCustomizePane();
			}
		}
		catch(e)
		{
			// Exception is thrown if tab is closed
		}
	},

	// Called when listbox selection is updated or if we need to manually update
	updateCustomizePane: function()
	{
		try
		{
			var sellist = document.getElementById("userColoring").selectedItems;
			// Just allow one for now.
			if (sellist)
			{
				sellist = sellist[0];
			}
			var children;
			if (sellist)
			{
				children = document.getElementById("customizevbox").getElementsByTagName('*');
				for (let i = 0; i < children.length; i++)
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
				children = document.getElementById("customizevbox").getElementsByTagName('*');
				for (let i = 0; i < children.length; i++)
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
	},

	colorClicked: function(el, ctype)
	{
		var li = document.getElementById("userColoring").selectedItem;
		if (!li)
			return;
		var userid = li.getAttribute("value");
		var pobj = new Object();
		if (ctype === 'fgcolor')
			pobj.value = gSALRservice.getPosterColor(userid);
		else
			pobj.value = gSALRservice.getPosterBackground(userid);
		pobj.el = el;
		pobj.ctype = ctype;
		pobj.li = li;
		pobj.userid = userid;
		pobj.accepted = false;
		gSubDialog.open("chrome://salastread/content/colorpicker/colorpickerdialog.xul", null, pobj, 
				this._colorClickedCallback.bind(this, pobj));
	},

	_colorClickedCallback: function(pobj, aEvent)
	{
		if (pobj.accepted)
		{
			var friendlyvalue = pobj.value;
			if (pobj.value == 0 && pobj.ctype == 'bgcolor')
			{
				friendlyvalue = 'transparent';
			}
			pobj.el.style.backgroundColor = friendlyvalue;
			if (pobj.ctype == 'fgcolor')
			{
				pobj.li.childNodes[1].style.color = friendlyvalue;
				gSALRservice.setPosterColor(pobj.userid, pobj.value);
			}
			else
			{
				pobj.li.childNodes[1].style.backgroundColor = friendlyvalue;
				gSALRservice.setPosterBackground(pobj.userid, pobj.value);
			}
		}
	},

	updateNote: function()
	{
		var li = document.getElementById("userColoring").selectedItem;
		if (!li)
			return;
		var newnotetext = document.getElementById("usernotebox").value;
		newnotetext = newnotetext.replace(/(?:\n)/g, "<br />");
		gSALRservice.setPosterNotes(li.getAttribute("value"), newnotetext);
		li.childNodes[2].setAttribute("label", newnotetext);
	}

};
