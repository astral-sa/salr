
function menuInit() {
   try {
      pinnedListInit();
      cbSet();
   }
   catch(e) {
      alert("Err: "+e);
   }
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
   var pobj = Components.classes["@evercrest.com/salastread/persist-object;1"]
                    .createInstance(Components.interfaces.nsISupports);
   pobj = pobj.wrappedJSObject;
   var flxml = pobj.forumListXml;
   var pinnedstr = parent.prefobj.string_menuPinnedForums;
   var pinnedForumNumbers;
   if (pinnedstr!=",") {
      pinnedForumNumbers = parent.prefobj.string_menuPinnedForums.split(",");
   } else {
      pinnedForumNumbers = new Array();
   }
   document.getElementById("addStarMenuButton").setAttribute("disabled",false);
   var pinnedForumElements = new Array();
   for (var j=0; j<pinnedForumNumbers.length; j++) {
      var thisNumber = pinnedForumNumbers[j];
      var thisItem = document.createElement("listitem");
      if ( thisNumber=="sep" ) {
         thisItem.setAttribute("label", "-------------------------");
      }
      else if ( thisNumber.substring(0,3)=="URL" ) {
         var umatch = thisNumber.match(/^URL\[(.*?)\]\[(.*?)\]$/);
         if (umatch) {
            thisItem.setAttribute("label", "Link: "+ pobj.UnescapeMenuURL(umatch[1]) );
         } else {
            thisItem.setAttribute("label", "invalid url entry");
         }
      }
      else if ( thisNumber=="starred" ) {
         thisItem.setAttribute("label", ">> Starred Thread Menu <<");
         document.getElementById("addStarMenuButton").setAttribute("disabled",true);
      }
      else {
         thisItem.setAttribute("label", "unknown forum ["+thisNumber+"]");
      }
      thisItem.setAttribute("forumnum", thisNumber);
      pinnedForumElements[j] = thisItem;
   }
   if (flxml) {
      var forumList = selectNodes(flxml, flxml.documentElement, "//forum");
      for (var i=0; i<forumList.length; i++) {
         var thisForum = forumList[i];
         var thisItem = document.createElement("listitem");
         thisItem.setAttribute("label", thisForum.getAttribute("name"));
         var thisId = thisForum.getAttribute("id");
         thisItem.setAttribute("forumnum", thisId);
         var isPinned = false;
         for (var k=0; k<pinnedForumNumbers.length; k++) {
            if (pinnedForumNumbers[k] == thisId) {
               pinnedForumElements[k] = thisItem;
               isPinned = true;
            }
         }
         if (!isPinned) {
            document.getElementById("unpinned_forums").appendChild(thisItem);
         }
      }
   }
   for (var m=0; m<pinnedForumElements.length; m++) {
      document.getElementById("pinned_forums").appendChild(pinnedForumElements[m]);
   }
}

function cbSet() {
   var dis = false;
   //var xxx = document.getElementById("toggle_showSAForumMenu").getAttribute("checked");
   //alert( xxx + "\n" + typeof(xxx) );
   if ( document.getElementById("toggle_showSAForumMenu").getAttribute("checked") ) {
      //alert("a1");
      document.getElementById("toggle_nestSAForumMenu").setAttribute("disabled",false);
   } else {
      //alert("a2");
      document.getElementById("toggle_nestSAForumMenu").setAttribute("disabled",true);
      dis = true;
   }
   if ( !dis && document.getElementById("toggle_nestSAForumMenu").getAttribute("checked") ) {
      //alert("h1");
      document.getElementById("pinned_forums").removeAttribute("disabled");
      document.getElementById("unpinned_forums").removeAttribute("disabled");
      document.getElementById("pinButton").setAttribute("disabled",false);
      document.getElementById("unpinButton").setAttribute("disabled",false);
      pinnedSelect();
   } else {
      //alert("h2");
      document.getElementById("pinned_forums").setAttribute("disabled",true);
      document.getElementById("unpinned_forums").setAttribute("disabled",true);
      document.getElementById("pinButton").setAttribute("disabled",true);
      document.getElementById("unpinButton").setAttribute("disabled",true);
      document.getElementById("moveUpButton").setAttribute("disabled",true);
      document.getElementById("moveDownButton").setAttribute("disabled",true);
   }
}

function pinnedSelect() {
   try{
   if ( !document.getElementById("toggle_showSAForumMenu").getAttribute("checked") ||
        !document.getElementById("toggle_nestSAForumMenu").getAttribute("checked") ) {
      document.getElementById("moveUpButton").setAttribute("disabled",true);
      document.getElementById("moveDownButton").setAttribute("disabled",true);
      return;
   }
   var sellist = document.getElementById("pinned_forums").selectedItems;
   if (sellist) {
      sellist = sellist[0];
   }
   //alert("next = "+sellist.nextSibling+
   //      "\nprev = "+sellist.previousSibling);
   if (sellist) {
      document.getElementById("moveUpButton").setAttribute("disabled",
         sellist.previousSibling ? false : true);
      document.getElementById("moveDownButton").setAttribute("disabled",
         sellist.nextSibling ? false : true);
   }
   } catch(ex) { alert("err: "+ex); }
}

function moveClick(moveDown) {
   var sellist = document.getElementById("pinned_forums").selectedItems;
   if (sellist) {
      sellist = sellist[0];
   }
   var addBefore;
   if (moveDown) {
      if (sellist.nextSibling) {
         addBefore = sellist.nextSibling.nextSibling;
      }
   } else {
      addBefore = sellist.previousSibling;
   }
   var parent = sellist.parentNode
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
   var sellist = document.getElementById("pinned_forums").selectedItems;
   if (sellist) {
      sellist = sellist[0];
   }
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
   var pobj = Components.classes["@evercrest.com/salastread/persist-object;1"]
                    .createInstance(Components.interfaces.nsISupports);
   pobj = pobj.wrappedJSObject;

   var url = prompt("Please enter the URL you wish to link to.");
   if (url) {
      var name = prompt("Please enter the name you wish to assign to this menu item.");
      if (name) {
         var thisItem = document.createElement("listitem");
         thisItem.setAttribute("label", "Link: " + name);
         thisItem.setAttribute("forumnum", "URL["+pobj.EscapeMenuURL(name)+"]["+pobj.EscapeMenuURL(url)+"]");
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
   var pflist = new Array();
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
   //alert(pflist.join(","));
   var menustr = pflist.join(",");
   var oldmenustr = parent.prefobj.string_menuPinnedForums;
   if (menustr!="") {
      parent.prefobj.string_menuPinnedForums = pflist.join(",");
   } else {
      parent.prefobj.string_menuPinnedForums = ",";
   }
   if (menustr!=oldmenustr) {
      parent.prefobj.NeedMenuRebuild = true;
   }
}
