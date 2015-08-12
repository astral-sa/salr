var gSALRMenusPane = {
	_SAMenuChanged: false,
	// Initialization
	init: function ()
	{
		function setEventListener(aId, aEventType, aCallback)
		{
			document.getElementById(aId)
			.addEventListener(aEventType, aCallback.bind(gSALRMenusPane));
		}

		setEventListener("showSAForumMenu", "change", gSALRMenusPane.changedPrefshowSAForumMenu);
		setEventListener("useSAForumMenuBackground", "change", Menus.toggleMenuGrenadeBackground);
		setEventListener("nestSAForumMenu", "change", gSALRMenusPane.nestedMenusToggled);
		setEventListener("pinButton", "command", gSALRMenusPane.pinClick);
		setEventListener("unpinButton", "command", gSALRMenusPane.unPinClick);
		setEventListener("moveUpButton", "command", function () {
			gSALRMenusPane.moveClick(false);});
		setEventListener("moveDownButton", "command", function () {
			gSALRMenusPane.moveClick(true);});
		setEventListener("addSeparatorButton", "command", gSALRMenusPane.addSepClick);
		setEventListener("addURLButton", "command", gSALRMenusPane.addURLClick);
		setEventListener("addStarMenuButton", "command", gSALRMenusPane.addStarMenuClick);
		setEventListener("pinned_forums", "select", gSALRMenusPane.pinnedSelect);

		try
		{
			this.pinnedListInit();
			this.mcbSet();
		}
		catch(e)
		{
			window.alert("init error: "+e);
		}
		//this._SAMenuChanged = false;
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

	/**
	 * Sets up the pinned/unpinned listboxes.
	 */
	pinnedListInit: function()
	{
		var pf = document.getElementById("pinned_forums");
		var upf = document.getElementById("unpinned_forums");

		while (pf.firstChild)
		{
			pf.removeChild(pf.firstChild);
		}
		while (upf.firstChild)
		{
			upf.removeChild(upf.firstChild);
		}

		var pinnedstr = document.getElementById("menuPinnedForums").value;
		var pinnedForumNumbers;

		if (pinnedstr !== ",")
			pinnedForumNumbers = document.getElementById("menuPinnedForums").value.split(",");
		else
			pinnedForumNumbers = [];

		var pinnedForumElements = [];

		// Loop through our pinned forum numbers to build our list of pinned forum elements
		// Part 1: Fill out the list inserting placeholder labels for our pinned forums
		gSALRMenusPane.initPinnedForumEls(pinnedForumNumbers, pinnedForumElements);

		// Part 2: Walk through the XML to populate our unpinned box with forums
		//     As we work, check if the current forum is pinned. If so, apply correct label.
		//     Finally, populate the pinned box with our pinned items.
		gSALRMenusPane.populateListBoxes(pinnedForumNumbers, pinnedForumElements);
	},

	/**
	 * Loops through pinned forum numbers to fills out the pinnedForumElements array.
	 *     Uses placeholder labels for pinned forums since we don't have their titles yet.
	 * @param {Array} pinnedForumNumbers  Array of strings of user-pinned items
	 * @param {Array} pinnedForumElements Array of listitems for the pinned forum box
	 */
	initPinnedForumEls: function(pinnedForumNumbers, pinnedForumElements)
	{
		for (let j = 0; j < pinnedForumNumbers.length; j++) {
			let thisNumber = pinnedForumNumbers[j];
			let thisItem = document.createElement("listitem");
			if (thisNumber === "sep")
			{
				thisItem.setAttribute("label", "-------------------------");
			}
			else if (thisNumber.substring(0,3) === "URL")
			{
				let umatch = thisNumber.match(/^URL\[(.*?)\]\[(.*?)\]$/);

				if (umatch)
					thisItem.setAttribute("label", "Link: "+ PageUtils.UnescapeMenuURL(umatch[1]) );
				else
					thisItem.setAttribute("label", "invalid url entry");
			}
			else if (thisNumber === "starred")
			{
				thisItem.setAttribute("id", "salr_starmenupinneditem");
				thisItem.setAttribute("label", ">> Starred Thread Menu <<");
			}
			else
			{
				thisItem.setAttribute("label", "unknown forum ["+thisNumber+"]");
			}

			thisItem.setAttribute("forumnum", thisNumber);
			pinnedForumElements[j] = thisItem;
		}
	},

	/**
	 * Walks through the XML to populate our unpinned box with forums
	 *    As it works, it checks if the current forum is pinned.
	 *    If so, replaces placeholder label with forum name from XML.
	 *    Finally, populates the pinned box with our pinned items.
	 * @param {Array} pinnedForumNumbers  Array of strings of user-pinned items
	 * @param {Array} pinnedForumElements Array of listitems for the pinned forum box
	 */
	populateListBoxes: function(pinnedForumNumbers, pinnedForumElements)
	{
		let flxml = DB.forumListXml;
		if (flxml)
		{
			let forumList = PageUtils.selectNodes(flxml, flxml.documentElement, "//forum");
			for (let i = 0; i < forumList.length; i++)
			{
				let thisForum = forumList[i];
				let thisId = thisForum.getAttribute("id");
				let thisItem = document.createElement("listitem");
					thisItem.setAttribute("label", thisForum.getAttribute("name"));
					thisItem.setAttribute("forumnum", thisId);

				let isPinned = false;
				for (let k = 0; k < pinnedForumNumbers.length; k++)
				{
					if (pinnedForumNumbers[k] === thisId)
					{
						pinnedForumElements[k] = thisItem;
						isPinned = true;
					}
				}

				if (!isPinned)
					document.getElementById("unpinned_forums").appendChild(thisItem);
			}
		}
		// Populate pinned listbox
		for(var m = 0; m < pinnedForumElements.length; m++)
		{
			document.getElementById("pinned_forums").appendChild(pinnedForumElements[m]);
		}
	},

	/**
	 * Decides whether various UI elements need to be disabled.
	 * Calls pinnedSelect function if enabling elements.
	 */
	mcbSet: function()
	{
		this.toggleDependentPrefUI("nestSaMenu", "pinned_forums", "unpinned_forums", "pinButton", 
			"unpinButton", "moveUpButton", "moveDownButton", "addSeparatorButton", "addURLButton");
		let alreadyStar = document.getElementById("salr_starmenupinneditem");
		let disableStar = !document.getElementById("nestSaMenu").checked ||
			 (alreadyStar !== null && alreadyStar.parentNode.id === "pinned_forums");
		document.getElementById("addStarMenuButton").setAttribute("disabled", disableStar);
		if (document.getElementById("nestSaMenu").getAttribute("checked"))
			this.pinnedSelect();
	},

	/**
	 * Enables/disables the move Up/Down buttons based on selected item
	 */
	pinnedSelect: function()
	{
		try {
			// Don't do anything if nestSaMenu isn't checked
			if (!document.getElementById("nestSaMenu").getAttribute("checked"))
				return;

			var sellist = document.getElementById("pinned_forums").selectedItems;
			// Only deal with first selected item if multiple selection
			if (sellist)
			{
				sellist = sellist[0];
			}

			if (sellist)
			{
				document.getElementById("moveUpButton").setAttribute("disabled", sellist.previousSibling ? false : true);
				document.getElementById("moveDownButton").setAttribute("disabled", sellist.nextSibling ? false : true);
			}
			else
			{
				document.getElementById("moveUpButton").setAttribute("disabled",true);
				document.getElementById("moveDownButton").setAttribute("disabled",true);
			}
		} catch(e) { 
			window.alert("pinned select error: " + e); 
		}
	},

	/** Called when nested menu preference is toggled. Rebuilds all menus. */
	nestedMenusToggled: function()
	{
		// Queue up a menu rebuild
		window.setTimeout(function() { Menus.rebuildAllMenus(); }, 100);
		this._SAMenuChanged = false;

		// Handle enabling/disabling pref UI elements
		this.mcbSet();
	},

	moveClick: function(moveDown)
	{
		var sellist = document.getElementById("pinned_forums").selectedItems[0];
		
		var addBefore;
		if (moveDown) {
			if (sellist.nextSibling) {
				addBefore = sellist.nextSibling.nextSibling;
			}
		} else {
			addBefore = sellist.previousSibling;
		}

		var parent = sellist.parentNode;
		parent.removeChild(sellist);
		
		if (addBefore) {
			parent.insertBefore(sellist, addBefore);
		} else {
			parent.appendChild(sellist);
		}

		document.getElementById("pinned_forums").selectItem(sellist);
		this.pinnedListChanged();
	},

	pinClick: function()
	{
		var sellist = document.getElementById("unpinned_forums").selectedItems;

		if (sellist) {
			sellist = sellist[0];
		}

		sellist.parentNode.removeChild(sellist);
		document.getElementById("pinned_forums").appendChild(sellist);
		document.getElementById("pinned_forums").selectItem(sellist);
		this.pinnedListChanged();
	},

	unPinClick: function()
	{
		var sellist = document.getElementById("pinned_forums").selectedItems[0];

		if (sellist)
		{
			sellist.parentNode.removeChild(sellist);
			if ((!sellist.id || sellist.id !== "salr_starmenupinneditem") && sellist.getAttribute("label") !== "-------------------------")
			{
				// We'll add it to the end of unpinned instead of reloading the whole list.
				document.getElementById("unpinned_forums").appendChild(sellist);
				document.getElementById("unpinned_forums").selectItem(sellist);
			}
			this.pinnedListChanged();
			//this.pinnedListInit();
		}
	},

	addSepClick: function()
	{
		var thisItem = document.createElement("listitem");
			thisItem.setAttribute("label", "-------------------------");
			thisItem.setAttribute("forumnum", "sep");

		document.getElementById("pinned_forums").appendChild(thisItem);
		this.pinnedListChanged();
	},

	addURLClick: function()
	{
		try
		{
			let urlText = {value : ''};
			let urlNameText = {value : ''};
			let check = {value : false};
			let factory = Components.classes["@mozilla.org/prompter;1"]
								.getService(Components.interfaces.nsIPromptFactory);
			let prompt = factory.getPrompt(window, Components.interfaces.nsIPrompt);
			let bag = prompt.QueryInterface(Components.interfaces.nsIWritablePropertyBag2);
			bag.setPropertyAsBool("allowTabModal", true);
			let urlres = prompt.prompt.apply(null, ["Add URL", "Please enter the URL you wish to link to.", urlText, null, check]);
			if (urlres) {
				let nameres = prompt.prompt.apply(null, ["Add URL Name", "Please enter the name you wish to assign to this menu item.", urlNameText, null, check]);
				if (nameres && urlText.value.length > 0 && urlNameText.value.length > 0) {
					let thisItem = document.createElement("listitem");
						thisItem.setAttribute("label", "Link: " + urlNameText.value);
						thisItem.setAttribute("forumnum", "URL["+ PageUtils.EscapeMenuURL(urlNameText.value)+"]["+ PageUtils.EscapeMenuURL(urlText.value)+"]");
					
					document.getElementById("pinned_forums").appendChild(thisItem);
					this.pinnedListChanged();
				}
			}
		}
		catch (e)
		{
			// Exception is thrown if tab is closed
		}
	},

	addStarMenuClick: function()
	{
		var thisItem = document.createElement("listitem");

		thisItem.setAttribute("id", "salr_starmenupinneditem");
		thisItem.setAttribute("label", ">> Starred Thread Menu <<");
		thisItem.setAttribute("forumnum", "starred");
		document.getElementById("pinned_forums").appendChild(thisItem);
		this.pinnedListChanged();
	},

	/**
	 * The pinned list has changed: build array of pinned numbers to save
	 *     to preferences.
	 *     Build array of pinned elements to use for rebuilding the pin menus.
	 */
	pinnedListChanged: function()
	{
		var pflist = [];
		var pfElements = [];
		var pf = document.getElementById("pinned_forums");
		var child = pf.firstChild;

		document.getElementById("addStarMenuButton").setAttribute("disabled",false);

		let i = 0;
		while (child)
		{
			var fnum = child.getAttribute("forumnum");
			pflist.push( fnum );
			if (fnum === "starred")
			{ 
				document.getElementById("addStarMenuButton").setAttribute("disabled",true);
			}
			else if (fnum.substring(0, 4) !== "URL[" && fnum !== "sep")
			{
				pfElements[i] = (child.getAttribute("label"));
			}

			child = child.nextSibling;
			i++;
		}

		var menustr = pflist.join(",");

		// Save the preference
		if (menustr !== "") {
			document.getElementById("menuPinnedForums").value = menustr;
		} else {
			document.getElementById("menuPinnedForums").value = ",";
		}
		this._SAMenuChanged = true;
		// instant apply, so we should do this immediately.
		this.rebuildPinMenus(pflist, pfElements);
	},

	/**
	 * Iterates through browser windows and calls for pin rebuilds
	 * @param {Array} pflist     Array of strings: pinned elements from listbox
	 * @param {Array} pfElements Array of strings: forum names from listbox
	 */
	rebuildPinMenus: function(pflist, pfElements)
	{
		if (this._SAMenuChanged === true)
		{
			// Get all browser windows
			var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
						   .getService(Components.interfaces.nsIWindowMediator);  
			var enumerator = wm.getEnumerator("navigator:browser");  
			while(enumerator.hasMoreElements())
			{  
				var win = enumerator.getNext();

				// Rebuild pin menus in all browser windows
				Menus.buildPinnedForumMenuItems(win, 'menubar', pflist, pfElements);
				Menus.buildPinnedForumMenuItems(win, 'toolbar', pflist, pfElements);
			}
			this._SAMenuChanged = false;
		}
	},

	// Called when the preference has been changed.
	changedPrefshowSAForumMenu: function()
	{
		// instant apply; do this immediately.
		this.doChangeSAMenuVis();
	},

	doChangeSAMenuVis: function()
	{
		var showSAForumMenu = document.getElementById('showSAForumMenu');
		// Default value is true, so we don't have to handle that special case
		// (it would show up as undefined)

		// Temporary hack until menu code is cleaned up:

		// Get all browser windows
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
					   .getService(Components.interfaces.nsIWindowMediator);  
		var enumerator = wm.getEnumerator("navigator:browser");  
		while(enumerator.hasMoreElements()) {  
			var win = enumerator.getNext();

			// Toggle SA menus in all browser windows
			if (showSAForumMenu.value === true)
			{
				Menus.buildForumMenu(win, 'menubar');
			}
			else
			{
				let salrMenu = win.document.getElementById("salr-menu");
				if (salrMenu)
					salrMenu.style.display = "none";
			}
		}
	}

};
