function menuInit()
{
	setEventListener("nestSaMenu", "command", mcbSet);
	try
	{
		pinnedListInit();
		mcbSet();
	}
	catch(e)
	{
		window.alert("init error: "+e);
	}
	document.getElementById('salastreadpref').__SAMenuChanged = false;
}

/**
 * Sets up the pinned/unpinned listboxes.
 */
function pinnedListInit()
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
	initPinnedForumEls(pinnedForumNumbers, pinnedForumElements);

	// Part 2: Walk through the XML to populate our unpinned box with forums
	//     As we work, check if the current forum is pinned. If so, apply correct label.
	//     Finally, populate the pinned box with our pinned items.
	populatePinListBoxes(pinnedForumNumbers, pinnedForumElements);
}

/**
 * Loops through pinned forum numbers to fills out the pinnedForumElements array.
 *     Uses placeholder labels for pinned forums since we don't have their titles yet.
 * @param {Array} pinnedForumNumbers  Array of strings of user-pinned items
 * @param {Array} pinnedForumElements Array of listitems for the pinned forum box
 */
function initPinnedForumEls(pinnedForumNumbers, pinnedForumElements)
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
}

/**
 * Walks through the XML to populate our unpinned box with forums
 *    As it works, it checks if the current forum is pinned.
 *    If so, replaces placeholder label with forum name from XML.
 *    Finally, populates the pinned box with our pinned items.
 * @param {Array} pinnedForumNumbers  Array of strings of user-pinned items
 * @param {Array} pinnedForumElements Array of listitems for the pinned forum box
 */
function populatePinListBoxes(pinnedForumNumbers, pinnedForumElements)
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
}

/**
 * Decides whether various UI elements need to be disabled.
 * Calls pinnedSelect function if enabling elements.
 */
function mcbSet()
{
	toggleDependentPrefUI("nestSaMenu", "pinned_forums", "unpinned_forums", "pinButton", 
		"unpinButton", "moveUpButton", "moveDownButton", "addSeparatorButton", "addURLButton");
	let alreadyStar = document.getElementById("salr_starmenupinneditem");
	let disableStar = !document.getElementById("nestSaMenu").checked ||
		 (alreadyStar !== null && alreadyStar.parentNode.id === "pinned_forums");
	document.getElementById("addStarMenuButton").setAttribute("disabled", disableStar);
	if (document.getElementById("nestSaMenu").getAttribute("checked"))
		pinnedSelect();
}

/**
 * Enables/disables the move Up/Down buttons based on selected item
 */
function pinnedSelect()
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
}

function moveClick(moveDown) {
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
	pinnedListChanged();
}

function pinClick() {
	var sellist = document.getElementById("unpinned_forums").selectedItems;
	
	if (sellist) {
		sellist = sellist[0];
	}
	
	sellist.parentNode.removeChild(sellist);
	document.getElementById("pinned_forums").appendChild(sellist);
	document.getElementById("pinned_forums").selectItem(sellist);
	pinnedListChanged();
}

function unPinClick() {
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
		pinnedListChanged();
		//pinnedListInit();
	}
}

function addSepClick() {
	var thisItem = document.createElement("listitem");
		thisItem.setAttribute("label", "-------------------------");
		thisItem.setAttribute("forumnum", "sep");
	
	document.getElementById("pinned_forums").appendChild(thisItem);
	pinnedListChanged();
}

function addURLClick() {
	var url = prompt("Please enter the URL you wish to link to.");
	if (url) {
		var name = prompt("Please enter the name you wish to assign to this menu item.");
		if (name) {
			var thisItem = document.createElement("listitem");
				thisItem.setAttribute("label", "Link: " + name);
				thisItem.setAttribute("forumnum", "URL["+ PageUtils.EscapeMenuURL(name)+"]["+ PageUtils.EscapeMenuURL(url)+"]");
			
			document.getElementById("pinned_forums").appendChild(thisItem);
			pinnedListChanged();
		}
	}
}

function addStarMenuClick() {
	var thisItem = document.createElement("listitem");

	thisItem.setAttribute("id", "salr_starmenupinneditem");
	thisItem.setAttribute("label", ">> Starred Thread Menu <<");
	thisItem.setAttribute("forumnum", "starred");
	document.getElementById("pinned_forums").appendChild(thisItem);
	pinnedListChanged();
}

function pinnedListChanged() {
	var pflist = [];
	var pf = document.getElementById("pinned_forums");
	var child = pf.firstChild;
	
	document.getElementById("addStarMenuButton").setAttribute("disabled",false);
	
	while (child) {
		var fnum = child.getAttribute("forumnum");
		pflist.push( fnum );
		
		if (fnum==="starred") { 
			document.getElementById("addStarMenuButton").setAttribute("disabled",true);
		}
		
		child = child.nextSibling;
	}
	
	var menustr = pflist.join(",");
	var oldmenustr = document.getElementById("menuPinnedForums").value;
	
	if (menustr !== "") {
		document.getElementById("menuPinnedForums").value = menustr;
	} else {
		document.getElementById("menuPinnedForums").value = ",";
	}
	document.getElementById('salastreadpref').__SAMenuChanged = true;
}

function RebuildSAMenus()
{
	if (document.getElementById('salastreadpref').__SAMenuChanged === true)
	{
		// Get all browser windows
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
					   .getService(Components.interfaces.nsIWindowMediator);  
		var enumerator = wm.getEnumerator("navigator:browser");  
		while(enumerator.hasMoreElements()) {  
			var win = enumerator.getNext();

			// Rebuild SA menus in all browser windows
			UI.buildForumMenu(win, 'menubar');
			UI.buildForumMenu(win, 'toolbar');
		}
		document.getElementById('salastreadpref').__SAMenuChanged = false;
	}
}

// Called when the preference has been changed.
function changedPrefshowSAForumMenu()
{
	// Defer visibility change if need be
	if (document.getElementById('salastreadpref').instantApply)
		doChangeSAMenuVis();
	else
		needSAMenuToggle = true;
}

function doChangeSAMenuVis()
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
			UI.buildForumMenu(win,'menubar');
		}
		else
		{
			let salrMenu = win.document.getElementById("salr-menu");
			if (salrMenu)
				salrMenu.style.display = "none";
		}
	}	
}