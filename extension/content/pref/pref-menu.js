function menuInit()
{
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

function pinnedListInit() {
	var pf = document.getElementById("pinned_forums");
	var upf = document.getElementById("unpinned_forums");
	
	while (pf.firstChild) {
		pf.removeChild(pf.firstChild);
	}
	
	while (upf.firstChild) {
		upf.removeChild(upf.firstChild);
	}

	var flxml = DB.forumListXml;
	var pinnedstr = document.getElementById("menuPinnedForums").value;
	var pinnedForumNumbers;
	
	if (pinnedstr!==",") {
		pinnedForumNumbers = document.getElementById("menuPinnedForums").value.split(",");
	} else {
		pinnedForumNumbers = [];
	}
	
	document.getElementById("addStarMenuButton").setAttribute("disabled",false);
	
	var pinnedForumElements = [];
	var thisItem;
	for (var j = 0; j < pinnedForumNumbers.length; j++) {
		var thisNumber = pinnedForumNumbers[j];
		thisItem = document.createElement("listitem");
		if(thisNumber === "sep") {
			thisItem.setAttribute("label", "-------------------------");
		} else if ( thisNumber.substring(0,3)==="URL" ) {
			var umatch = thisNumber.match(/^URL\[(.*?)\]\[(.*?)\]$/);
			
			if (umatch) {
				thisItem.setAttribute("label", "Link: "+ PageUtils.UnescapeMenuURL(umatch[1]) );
			} else {
				thisItem.setAttribute("label", "invalid url entry");
			}
		} else if ( thisNumber==="starred" ) {
			thisItem.setAttribute("label", ">> Starred Thread Menu <<");
			document.getElementById("addStarMenuButton").setAttribute("disabled",true);
		} else {
			thisItem.setAttribute("label", "unknown forum ["+thisNumber+"]");
		}
		
		thisItem.setAttribute("forumnum", thisNumber);
		pinnedForumElements[j] = thisItem;
	}
	
	if (flxml) {
		var forumList = PageUtils.selectNodes(flxml, flxml.documentElement, "//forum");
		for (var i = 0; i < forumList.length; i++) {
			var thisForum = forumList[i];
			var thisId = thisForum.getAttribute("id");
			thisItem = document.createElement("listitem");
				thisItem.setAttribute("label", thisForum.getAttribute("name"));
				thisItem.setAttribute("forumnum", thisId);
			
			var isPinned = false;
			for(var k = 0; k < pinnedForumNumbers.length; k++) {
				if (pinnedForumNumbers[k] === thisId) {
					pinnedForumElements[k] = thisItem;
					isPinned = true;
				}
			}
			
			if (!isPinned) {
				document.getElementById("unpinned_forums").appendChild(thisItem);
			}
		}
	}
	
	for(var m = 0; m < pinnedForumElements.length; m++) {
		document.getElementById("pinned_forums").appendChild(pinnedForumElements[m]);
	}
}

function mcbSet() {
	var dis = false;
	if ( document.getElementById("showSaMenu").getAttribute("checked") ) {
		document.getElementById("nestSaMenu").setAttribute("disabled",false);
	} else {
		document.getElementById("nestSaMenu").setAttribute("disabled",true);
		dis = true;
	}
	
	if ( !dis && document.getElementById("nestSaMenu").getAttribute("checked") ) {
		document.getElementById("pinned_forums").removeAttribute("disabled");
		document.getElementById("unpinned_forums").removeAttribute("disabled");
		document.getElementById("pinButton").setAttribute("disabled",false);
		document.getElementById("unpinButton").setAttribute("disabled",false);
		pinnedSelect();
	} else {
		document.getElementById("pinned_forums").setAttribute("disabled",true);
		document.getElementById("unpinned_forums").setAttribute("disabled",true);
		document.getElementById("pinButton").setAttribute("disabled",true);
		document.getElementById("unpinButton").setAttribute("disabled",true);
		document.getElementById("moveUpButton").setAttribute("disabled",true);
		document.getElementById("moveDownButton").setAttribute("disabled",true);
	}
}

function pinnedSelect() {
	try {
		if (!document.getElementById("showSaMenu").getAttribute("checked") || 
			!document.getElementById("nestSaMenu").getAttribute("checked")) {
			
			document.getElementById("moveUpButton").setAttribute("disabled",true);
			document.getElementById("moveDownButton").setAttribute("disabled",true);
			return;
		}
		
		var sellist = document.getElementById("pinned_forums").selectedItems;
		if (sellist) {
			sellist = sellist[0];
		}

		if (sellist) {
			document.getElementById("moveUpButton").setAttribute("disabled", sellist.previousSibling ? false : true);
			document.getElementById("moveDownButton").setAttribute("disabled", sellist.nextSibling ? false : true);
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
	
	if (sellist) {
		sellist.parentNode.removeChild(sellist);
		pinnedListChanged();
		pinnedListInit();
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
		
		if (fnum=="starred") { 
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
	if (document.getElementById('salastreadpref').__SAMenuChanged == true)
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