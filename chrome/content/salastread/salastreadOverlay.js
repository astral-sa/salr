// <script> This line added because my IDE has problems detecting JS ~ 0330 ~ duz

var needToShowChangeLog = false;
var showErrors = false;
var persistObject = null;

function SALRHexToNumber(hex) {
	var res = 0;
	for (var i=0; i<hex.length; i++) {
		res = res * 16;
		switch (hex[i]) {
			case "0": res += 0; break;
			case "1": res += 1; break;
			case "2": res += 2; break;
			case "3": res += 3; break;
			case "4": res += 4; break;
			case "5": res += 5; break;
			case "6": res += 6; break;
			case "7": res += 7; break;
			case "8": res += 8; break;
			case "9": res += 9; break;
			case "a": case "A": res += 10; break;
			case "b": case "B": res += 11; break;
			case "c": case "C": res += 12; break;
			case "d": case "D": res += 13; break;
			case "e": case "E": res += 14; break;
			case "f": case "F": res += 15; break;
		}
	}
	return res;
}

function SALR_menuItemCommand(event, el, etype) {
	var target = "none";
	if(etype=="command") {
		target = "current";
	}
	if(etype=="click") {
		if(event.button == 2 || event.button == 1) {
			target = "newtab";
		}
	}

	if(target != "none") {
		SALR_menuItemGoTo(event,"http://forums.somethingawful.com/forumdisplay.php?s=&forumid="+el.getAttribute("forumnum"),target);
	}
}

function SALR_menuItemCommandGoToLastPost(event, el, etype, threadid) {
	try {
		var postid = persistObject.getLastPostID(threadid);

		if(postid != 0) {
			SALR_menuItemCommandURL(event, "http://forums.somethingawful.com/showthread.php?s=&postid=" + postid + "#post" + postid, etype);
		} else {
			SALR_menuItemCommandURL(event, "http://forums.somethingawful.com/showthread.php?s=&threadid=" + threadid, etype);
		}
	} catch(e) {
		alert("Couldn't find thread id: " + threadid);
	}
}

function SALR_menuItemCommandURL(event, el, etype) {
	var target = "none";
	if(etype=="command") {
		target = "current";
	}
	if(etype=="click") {
		if(event.button == 2 || event.button == 1) {
			target = "newtab";
		}
	}

	var targeturl = "";
	if(typeof(el) == "string") {
		targeturl = el;
	} else {
		targeturl = el.getAttribute("targeturl");
	}

	if(target != "none") {
		SALR_menuItemGoTo(event,targeturl,target);
	}
}

function SALR_menuItemGoTo(event, url, target) {
	if (target=="newtab") {
		getBrowser().addTab(url);
	} else if (target=="current") {
		loadURI(url);
	}
}

function grabForumList(doc, selectnode) {
	var rowList = persistObject.selectNodes(doc, doc, "//table[@id='forums']//tr");
   var oDomParser = new DOMParser();
   var forumsDoc = oDomParser.parseFromString("<?xml version=\"1.0\"?>\n<forumlist></forumlist>", "text/xml");
   var targetEl = forumsDoc.documentElement;
   var oldForumXml = persistObject.forumListXml;

   //Nowhere to grab these guys from anymore
   addUtilItem("Private Messages","pm",forumsDoc)
   addUtilItem("User Control Panel","cp",forumsDoc)
   addUtilItem("Search Forums","search",forumsDoc)
   addUtilItem("Forums Home","home",forumsDoc)
   addUtilItem("Leper's Colony","lc",forumsDoc)


   for (var i=0; i<rowList.length; i++) {

      var thisRow = rowList[i];
      var firstEl = persistObject.selectSingleNode(doc, thisRow, "th[@class='category'] | td[@class='title']");

      var cssClass = firstEl.getAttribute("class")

      if(cssClass == "category") {
         var catLink = persistObject.selectSingleNode(doc,firstEl,"a");
         var catTitle = catLink.firstChild.nodeValue;
         var catUrl = catLink.getAttribute("href")
         var catId = catUrl.match(/forumid=(\d+)/)[1];

         var fel;

         fel = forumsDoc.createElement("cat");
         targetEl = fel;

         fel.setAttribute("id", catId);
         fel.setAttribute("name", catTitle);
         forumsDoc.documentElement.appendChild(fel);
         forumsDoc.documentElement.insertBefore(forumsDoc.createTextNode("\n"), fel);


      }
      else if(cssClass == "title")
      {

         var forumLink = persistObject.selectSingleNode(doc,firstEl,"a");
         var forumTitle = forumLink.firstChild.nodeValue;
         var forumUrl = forumLink.getAttribute("href")
         var forumId = forumUrl.match(/forumid=(\d+)/)[1];

         addForumToForums(forumTitle,forumId,1,oldForumXml,targetEl,forumsDoc)

         var subForums = persistObject.selectNodes(doc,firstEl,"div[@class='subforums']/a")
         for(var j=0; j<subForums.length; j++) {

            var subForumLink = subForums[j];
            var subForumTitle = subForumLink.firstChild.nodeValue;
            var subForumUrl = subForumLink.getAttribute("href")
            var subForumId = subForumUrl.match(/forumid=(\d+)/)[1];

            addForumToForums(subForumTitle,subForumId,2,oldForumXml,targetEl,forumsDoc)
         }

      }

   }

   persistObject.forumListXml = forumsDoc;
   if ( persistObject.getPreference('showSAForumMenu') ) {
      buildSAForumMenu();
   }



}

function addUtilItem(name,id,forumsDoc) {
   var fel = forumsDoc.createElement("util")
   fel.setAttribute("name",name)
   fel.setAttribute("id", id)

   forumsDoc.documentElement.appendChild(fel);
   forumsDoc.documentElement.insertBefore(forumsDoc.createTextNode("\n"), fel);
}

function addForumToForums(name,id,depth,oldForumXml,container,forumsDoc) {

   var fel = forumsDoc.createElement("forum");
   fel.setAttribute("id", id);
   fel.setAttribute("name",name);

   // Carry over sticky attributes
   if ( oldForumXml ) {
      var oldEl = persistObject.selectSingleNode(oldForumXml, oldForumXml, "//forum[@id='"+id+"']");
      if (oldEl) {
         if ( oldEl.hasAttribute("mods") ) {
            fel.setAttribute("mods", oldEl.getAttribute("mods"));
         }
         if ( oldEl.hasAttribute("modnames") ) {
            fel.setAttribute("modnames", oldEl.getAttribute("modnames"));
         }
      }
   }

   var catname = "sub"
   for(var i=1; i < depth;i++) {
      catname += "-sub"
   }
   fel.setAttribute("cat", catname);

   container.appendChild(fel);
   container.insertBefore(forumsDoc.createTextNode("\n"), fel);
}

function populateForumMenuFrom(nested_menus, target, src, pinnedForumNumbers, pinnedForumElements) {
	var wasutil = 0;
	for(var i = 0; i < src.childNodes.length; i++) {
		var thisforum = src.childNodes[i];

		if (thisforum.nodeName=="util") {
			wasutil = 1;
		}

		else if (wasutil && thisforum.nodeType == 1) {
			if(nested_menus) {
				target.appendChild(document.createElement("menuseparator"));
			}
			wasutil = 0;
		}

		if(thisforum.nodeName == "cat") {
			if(!nested_menus) {
				target.appendChild(document.createElement("menuseparator"));
				populateForumMenuFrom(nested_menus,target,thisforum,pinnedForumNumbers,pinnedForumElements);
			} else {
				var submenu = document.createElement("menu");
					submenu.setAttribute("label", thisforum.getAttribute("name"));

				var submenupopup = document.createElement("menupopup");
				if(persistObject.getPreference('useSAForumMenuBackground')) {
					submenupopup.setAttribute("class", "lastread_menu");
				}

				submenu.appendChild(submenupopup);
				populateForumMenuFrom(nested_menus,submenupopup,thisforum,pinnedForumNumbers,pinnedForumElements);
				target.appendChild(submenu);
			}
		} else if(thisforum.nodeName == "forum" || thisforum.nodeName == "util") {
			var menuel = document.createElement("menuitem");
				menuel.setAttribute("label", thisforum.getAttribute("name"));
				menuel.setAttribute("forumnum", thisforum.getAttribute("id"));
				menuel.setAttribute("onclick", "SALR_menuItemCommand(event,this,'click');");
				menuel.setAttribute("oncommand", "SALR_menuItemCommand(event,this,'command');");

			if(thisforum.getAttribute("cat") && thisforum.getAttribute("cat").substring(0, 3) == "sub") {
				menuel.setAttribute("class", "lastread_menu_" + thisforum.getAttribute("cat"));
			}

			//TODO: access keys
			target.appendChild(menuel);
			if(nested_menus) {
				var thisforumnum = thisforum.getAttribute("id");
				for (var j = 0; j < pinnedForumNumbers.length; j++) {
					if (pinnedForumNumbers[j] == thisforumnum) {
						pinnedForumElements[j] = thisforum;
					}
				}
			}
		}
	}
}

function buildSAForumMenu() {
	try {
		if ( persistObject.getPreference('hideOtherSAMenus') ) {
			var mmb = document.getElementById("main-menubar");
			for (var x=0; x<mmb.childNodes.length; x++) {
				var thischild = mmb.childNodes[x];
				if (thischild.nodeName=="menu") {
					if ( (thischild.getAttribute("label")=="SA" || thischild.label=="SA" || thischild.id=="menu-sa") &&
					thischild.id!="menu_SAforums") {
						mmb.removeChild(thischild);
						x--;
					}
				}
			}
		}
		var menupopup = document.getElementById("menupopup_SAforums");
		if (menupopup==null) {
			var iBefore = document.getElementById("bookmarks-menu");
			if (iBefore) {
				iBefore = iBefore.nextSibling;
			} else {
				iBefore = document.getElementById("main-menubar").lastChild;
			}
			var menuel = document.createElement("menu");
				menuel.id = "menu_SAforums";
				menuel.setAttribute("label", "SA");
				menuel.setAttribute("accesskey","A");
				menuel.style.display = "none";
			menupopup = document.createElement("menupopup");
			menupopup.id = "menupopup_SAforums";
			menupopup.className = "lastread_menu";
			menuel.appendChild(menupopup);
			document.getElementById("main-menubar").insertBefore(menuel, iBefore);
			menupopup.addEventListener("popupshowing", SALR_SAMenuShowing, false);
		}

		if ( persistObject.getPreference('useSAForumMenuBackground') ) {
			menupopup.className = "lastread_menu";
		} else {
			menupopup.className = "";
		}
		while (menupopup.firstChild) {
			menupopup.removeChild(menupopup.firstChild);
		}
		var forumsDoc = persistObject.forumListXml;
		var nested_menus = persistObject.getPreference('nestSAForumMenu');
		var menuel = document.createElement("menuitem");
		var pinnedForumNumbers = new Array();
		var pinnedForumElements = new Array();
		if (nested_menus && persistObject.getPreference('menuPinnedForums')) {
			pinnedForumNumbers = persistObject.getPreference('menuPinnedForums').split(",");
		}
		menuel.setAttribute("label","Something Awful");
		menuel.setAttribute("image", "chrome://salastread/skin/sa.png");
		menuel.setAttribute("onclick", "SALR_menuItemCommandURL(event,'http://www.somethingawful.com','click');");
		menuel.setAttribute("oncommand", "SALR_menuItemCommandURL(event,'http://www.somethingawful.com','command');");
		menuel.setAttribute("class","menuitem-iconic lastread_menu_frontpage");
		menupopup.appendChild(menuel);
		menupopup.appendChild(document.createElement("menuseparator"));

		var lmenuel = document.createElement("menuitem");
			lmenuel.setAttribute("label","Configure SALastRead...");
			lmenuel.setAttribute("oncommand", "SALR_runConfig('command');");

		menupopup.appendChild(lmenuel);

		menupopup.appendChild(document.createElement("menuseparator"));

		populateForumMenuFrom(nested_menus,menupopup,forumsDoc.documentElement,pinnedForumNumbers,pinnedForumElements);

		if(nested_menus && (pinnedForumElements.length > 0 || pinnedForumNumbers.length > 0)) {
			menupopup.appendChild(document.createElement("menuseparator"));
			for(var j = 0; j < pinnedForumElements.length || j < pinnedForumNumbers.length; j++) {
				if(pinnedForumElements[j]) {
					var thisforum = pinnedForumElements[j];
					var menuel = document.createElement("menuitem");
					var forumname = thisforum.getAttribute("name");
					while (forumname.substring(0,1)==" ") {
						forumname = forumname.substring(1);
					}
					menuel.setAttribute("label", forumname);
					menuel.setAttribute("forumnum", thisforum.getAttribute("id"));
					menuel.setAttribute("onclick", "SALR_menuItemCommand(event,this,'click');");
					menuel.setAttribute("oncommand", "SALR_menuItemCommand(event,this,'command');");
					menuel.setAttribute("class", "lastread_menu_sub");
					menupopup.appendChild(menuel);
				} else if(pinnedForumNumbers[j]=="sep") {
					menupopup.appendChild(document.createElement("menuseparator"));
				} else if (typeof(pinnedForumNumbers[j]) == "string" && pinnedForumNumbers[j].substring(0, 3) == "URL") {
					var umatch = pinnedForumNumbers[j].match(/^URL\[(.*?)\]\[(.*?)\]$/);
					if(umatch) {
						var menuel = document.createElement("menuitem");
							menuel.setAttribute("label", persistObject.UnescapeMenuURL(umatch[1]));
							menuel.setAttribute("targeturl", persistObject.UnescapeMenuURL(umatch[2]));
							menuel.setAttribute("onclick", "SALR_menuItemCommandURL(event,this,'click');");
							menuel.setAttribute("oncommand", "SALR_menuItemCommandURL(event,this,'command');");
							menuel.setAttribute("class", "lastread_menu_sub");

						menupopup.appendChild(menuel);
					}
				} else if (pinnedForumNumbers[j]=="starred") {
					var menuel = document.createElement("menu");
						menuel.setAttribute("label", "Starred Threads");
						menuel.setAttribute("image", "chrome://salastread/skin/star.png");
						menuel.setAttribute("class", "menu-iconic lastread_menu_starred");

					var subpopup = document.createElement("menupopup");
						subpopup.id = "salr_starredthreadmenupopup";

					menuel.appendChild(subpopup);
					menupopup.appendChild(menuel);

					subpopup.setAttribute("onpopupshowing", "SALR_StarredThreadMenuShowing();");
				}
			}

			if(persistObject.getPreference('showMenuPinHelper')) {
				var ms = document.createElement("menuseparator");
					ms.id = "salr_pinhelper_sep";

				menupopup.appendChild(ms);

				var menuel = document.createElement("menuitem");
					menuel.id = "salr_pinhelper_item";
					menuel.setAttribute("label", "Learn how to pin forums to this menu...");
					menuel.setAttribute("image", "chrome://salastread/skin/eng101-16x16.png");
					menuel.setAttribute("oncommand", "SALR_LaunchPinHelper();");
					menuel.setAttribute("class", "menuitem-iconic lastread_menu_sub");

				menupopup.appendChild(menuel);
			}
		}

		document.getElementById("menu_SAforums").style.display = "-moz-box";
	} catch(e) {
		alert("menuerr: " + e);
	}
}

function SALR_StarredThreadMenuShowing() {
	var menupopup = document.getElementById("salr_starredthreadmenupopup");
	while (menupopup.firstChild != null) {
		menupopup.removeChild(menupopup.firstChild);
	}
	var starred = persistObject.starList;
	for(var id in starred) {
		var title = starred[id];
		var menuel = document.createElement("menuitem");
			menuel.setAttribute("label", title);
			menuel.setAttribute("onclick", "SALR_menuItemCommandGoToLastPost(event, this, 'click'," + id + ");");
			menuel.setAttribute("oncommand", "SALR_menuItemCommandGoToLastPost(event, this, 'command'," + id + ");");
		menupopup.appendChild(menuel);
	}
}

function SALR_SAMenuShowing() {
   if ( persistObject.getPreference('showMenuPinHelper') == false ) {
      var ms = document.getElementById("salr_pinhelper_sep");
      var mi = document.getElementById("salr_pinhelper_item");
      if ( ms != null ) {
         ms.parentNode.removeChild(ms);
      }
      if ( mi != null ) {
         mi.parentNode.removeChild(mi);
      }
   }
}

function SALR_LaunchPinHelper() {
   persistObject.setPreference('showMenuPinHelper', false);

   SALR_runConfig("menu");
   alert("You may return to the menu settings at any time by choosing \"Configure SALastRead...\" from the SA menu, or by "+
         "clicking the \"Configure Last Read Extension\" link in the header of any forum page.");
}

// Do anything needed to the subscribed threads list
function handleSubscriptions(doc) {

	var cpusernav = persistObject.selectSingleNode(doc, doc, "//ul[contains(@id,'usercpnav')]");
	if (!cpusernav) {
		return;
	}

	//get preferences once
	var dontHighlightThreads = persistObject.getPreference("dontHighlightThreads");
	var disableNewReCount = persistObject.getPreference("disableNewReCount");
	var newPostCountUseOneLine = persistObject.getPreference("newPostCountUseOneLine");
	var disableGradients = persistObject.getPreference("disableGradients");
	var showUnvisitIcon = persistObject.getPreference("showUnvisitIcon");
	var swapIconOrder = persistObject.getPreference("swapIconOrder");
	var showGoToLastIcon = persistObject.getPreference("showGoToLastIcon");
	var alwaysShowGoToLastIcon = persistObject.getPreference("alwaysShowGoToLastIcon");
	var readWithNewLight = persistObject.getPreference("readWithNewLight");
	var readWithNewDark = persistObject.getPreference("readWithNewDark");
	var readLight = persistObject.getPreference("readLight");
	var readDark = persistObject.getPreference("readDark");
	var postedInThreadRe = persistObject.getPreference("postedInThreadRe");

	var subTable = persistObject.selectSingleNode(doc, doc, "//table[contains(@class,'standard')][.//th/b[contains(text(),'Thread')]]");
	var threadlist = persistObject.selectNodes(doc, subTable, "TBODY/TR");
	var starredthreads = persistObject.starList, ignoredthreads = persistObject.ignoreList;

	for (i in threadlist)
	{
		var thread = threadlist[i];
		if (thread.getElementsByTagName('th').length)
		{
			// It's part of the header or footer so drop out
			continue;
		}
		threadTitleBox = persistObject.selectSingleNode(doc, thread, "TD//A[contains(@href,'threadid=')]");
		if (threadTitleBox == null)
		{
			// No subscribed threads listed, should rewrite this to be nicer
			continue;
		}
		else
		{
			threadTitleBox = threadTitleBox.parentNode;
		}
		threadId = parseInt(persistObject.selectSingleNode(doc, thread, "TD//A[contains(@href,'threadid=')]").href.match(/threadid=(\d+)/)[1]);
		threadDetails = persistObject.getThreadDetails(threadId);
		threadRepliesBox = persistObject.selectSingleNode(doc, thread, "TD//A[contains(@href,'javascript:who(')]").parentNode;
		threadRe = parseInt(persistObject.selectSingleNode(doc, thread, "TD//A[contains(@href,'javascript:who(')]").innerHTML);
		threadLRCount = threadDetails['lastreplyct'];
		// If thread is ignored
		if (threadDetails['ignore'])
		{
			thread.parentNode.deleteRow(i);
		}

		// So right click star/ignore works
		thread.className = "salastread_thread_" + threadId;

		// If this thread is in the DB as being read
		if (threadLRCount > -1)
		{
			if (!dontHighlightThreads)
			{
				if ((threadRe + 1) > threadLRCount) // If there are new posts
				{
					if (!disableNewReCount)
					{
						var newReplies = ((threadRe + 1) - threadLRCount)

						if (newPostCountUseOneLine)
						{
							threadRepliesBox.innerHTML += '&nbsp;(' + newReplies + ')';
						}
						else
						{
							threadRepliesBox.innerHTML += ' (' + newReplies + ')';
						}
					}
					persistObject.blindColorThread(doc, thread, readWithNewLight, readWithNewDark);
				}
				else
				{
					persistObject.blindColorThread(doc, thread, readLight, readDark);
				}
				if (!disableGradients)
				{
					persistObject.addGradient(thread);
				}
				if (persistObject.didIPostHere(threadId))
				{
					threadRepliesBox.style.backgroundColor = postedInThreadRe;
				}
			}

			if (showUnvisitIcon && swapIconOrder)
			{
				persistObject.insertUnreadIcon(doc, threadTitleBox, threadId).addEventListener("click", removeThread, false);
			}

			if ((showGoToLastIcon && ((threadRe + 1) > threadLRCount)) || alwaysShowGoToLastIcon)
			{
				persistObject.insertLastIcon(doc, threadTitleBox, threadId, threadLRCount);
			}

			if (showUnvisitIcon && !swapIconOrder)
			{
				persistObject.insertUnreadIcon(doc, threadTitleBox, threadId).addEventListener("click", removeThread, false);
			}
		}

		if (threadDetails['star'])
		{
			// This is causing errors, disabled for now
			//persistObject.insertStar(doc, threadTitleBox);
		}
	}
}

// Do anything needed to the post list in a forum
function handleForumDisplay(doc)
{
	var failed, i, e;	// Little variables that'll get reused
	var forumid = persistObject.getForumID(doc);
	// The following forums have special needs that must be dealt with
	var inFYAD = persistObject.inFYAD(forumid);
	var inBYOB = persistObject.inBYOB(forumid);
	var inDump = persistObject.inDump(forumid);
	var inAskTell = persistObject.inAskTell(forumid);
	var inGasChamber = persistObject.inGasChamber(forumid);

	if (!inFYAD || persistObject.getPreference("enableFYAD")) {
		var ourTransaction = false;
		if (persistObject.database.transactionInProgress) {
			ourTransaction = true;
			persistObject.database.beginTransactionAs(persistObject.database.TRANSACTION_DEFERRED);
		}
		// Insert the forums paginator & mouse gestures
		if (persistObject.getPreference("enableForumNavigator"))
		{
			persistObject.addPagination(doc);
		}
		if (persistObject.getPreference("gestureEnable"))
		{
			doc.body.addEventListener('mousedown', SALR_PageMouseDown, false);
			doc.body.addEventListener('mouseup', SALR_PageMouseUp, false);
		}
		// Replace post button
		if (persistObject.getPreference("useQuickQuote") && !inGasChamber)
		{
			var postbutton = persistObject.selectSingleNode(doc, doc, "//A[contains(@href,'action=newthread')]");
			if (postbutton) {
				attachQuickQuoteHandler(undefined,doc,persistObject.turnIntoQuickButton(doc, postbutton, forumid),"",0);
			}
		}

		// Snag Forum Moderators
		// Ignore FYAD and BYOB since idiot kings and deuputies just clog things up
		if (!inFYAD && !inBYOB && !inGasChamber)
		{
			var modarray = doc.getElementById('mods').getElementsByTagName('a');
			var modcount = modarray.length;
			for (i=0; i<modcount; i++)
			{
				userid = modarray[i].href.match(/userid=(\d+)/i)[1];
				username = modarray[i].innerHTML;
				if (!persistObject.isMod(userid))
				{
					persistObject.addMod(userid, username);
				}
			}
		}

		if (!inFYAD && !inGasChamber && !inDump)
		{
			// Capture and store the post icon # -> post icon filename relationship
			var iconNumber, iconFilename;
			var postIcons = persistObject.selectNodes(doc, doc.getElementById("filtericons"), "A[contains(@href,'posticon=')]");
			for (i in postIcons)
			{
				if ((postIcons[i].href.search(/posticon=(\d+)/i) > -1) &&
					(postIcons[i].firstChild.src.search(/posticons\/(.*)/i) > -1))
				{
					iconNumber = parseInt(postIcons[i].href.match(/posticon=(\d+)/i)[1]);
					iconFilename = postIcons[i].firstChild.src.match(/posticons\/(.*)/i)[1];
					persistObject.addIcon(iconNumber, iconFilename);
				}
			}
		}


		//get preferences once
		var dontHighlightThreads = persistObject.getPreference("dontHighlightThreads");
		var disableNewReCount = persistObject.getPreference("disableNewReCount");
		var newPostCountUseOneLine = persistObject.getPreference("newPostCountUseOneLine");
		var disableGradients = persistObject.getPreference("disableGradients");
		var showUnvisitIcon = persistObject.getPreference("showUnvisitIcon");
		var swapIconOrder = persistObject.getPreference("swapIconOrder");
		var showGoToLastIcon = persistObject.getPreference("showGoToLastIcon");
		var alwaysShowGoToLastIcon = persistObject.getPreference("alwaysShowGoToLastIcon");
		var readWithNewLight = persistObject.getPreference("readWithNewLight");
		var readWithNewDark = persistObject.getPreference("readWithNewDark");
		var readLight = persistObject.getPreference("readLight");
		var readDark = persistObject.getPreference("readDark");
		var postedInThreadRe = persistObject.getPreference("postedInThreadRe");
		var modColor = persistObject.getPreference("modColor");
		var modBackground = persistObject.getPreference("modBackground");
		var adminColor = persistObject.getPreference("adminColor");
		var adminBackground = persistObject.getPreference("adminBackground");
		var highlightUsernames = persistObject.getPreference("highlightUsernames");
		var dontBoldNames = persistObject.getPreference("dontBoldNames");

		// We'll need lots of variables for this
		var threadIconBox, threadTitleBox, threadAuthorBox, threadRepliesBox;
		var threadTitle, threadId, threadOPId, threadRe, threadDetails;
		var threadLRCount, posterColor, posterBG, unvistIcon, lpIcon, lastPostID;
		var userPosterNote;
		var starredthreads = persistObject.starList, ignoredthreads = persistObject.ignoreList;
		var iconlist = persistObject.iconList;
		var table = document.getElementById('forum');

		// Here be where we work on the thread rows
		var threadlist = persistObject.selectNodes(doc, doc, "//TR[contains(@class,'thread')]");
		for (var i in threadlist)
		{
			var thread = threadlist[i];

			threadTitleBox = persistObject.selectSingleNode(doc, thread, "TD[contains(@class,'title')]");
			if (threadTitleBox.getElementsByTagName('a')[0].className.search(/announcement/i) > -1)
			{
				// It's an announcement so skip the rest
				continue;
			}

			threadId = parseInt(threadTitleBox.getElementsByTagName('a')[0].href.match(/threadid=(\d+)/i)[1]);
			threadTitle = threadTitleBox.getElementsByTagName('a')[0].innerHTML;
			threadDetails = persistObject.getThreadDetails(threadId);
			if (threadDetails['ignore'])
			{
				// If thread is ignored might as well remove it and stop now
				thread.parentNode.removeChild(thread);
				// Update the title just incase we doesn't know what it is
				persistObject.setThreadTitle(threadId, threadTitle);
				continue;
			}
			if (!inDump)
			{
				threadIconBox = persistObject.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]");
			}

			threadAuthorBox = persistObject.selectSingleNode(doc, thread, "TD[contains(@class, 'author')]");
			threadRepliesBox = persistObject.selectSingleNode(doc, thread, "TD[contains(@class, 'replies')]");
			threadLRCount = threadDetails['lastreplyct'];
			threadRe = parseInt(threadRepliesBox.getElementsByTagName('a')[0].innerHTML);
			threadOPId = parseInt(threadAuthorBox.getElementsByTagName('a')[0].href.match(/userid=(\d+)/i)[1]);
			posterColor = false;
			posterBG = false;

			if (threadDetails['mod'])
			{
				posterColor = modColor;
				posterBG =  modBackground;
			}

			if (threadDetails['admin'])
			{
				posterColor = adminColor;
				posterBG =  adminBackground;
			}

			if (threadDetails['color'])
			{
				posterColor = threadDetails['color'];
			}

			if (threadDetails['background'])
			{
				posterBG = threadDetails['background'];
			}

			// So right click star/ignore works
			thread.className += " salastread_thread_" + threadId;

			// Replace the thread icon with a linked thread icon
			if (!inDump && threadIconBox.firstChild.src.search(/posticons\/(.*)/i) > -1)
			{
				iconFilename = threadIconBox.firstChild.src.match(/posticons\/(.*)/i)[1];
				if (iconlist[iconFilename] != undefined)
				{
					iconGo = doc.createElement("a");
					iconGo.setAttribute("href", "/forumdisplay.php?forumid=" + forumid + "&posticon=" + iconlist[iconFilename]);
					iconGo.appendChild(threadIconBox.firstChild.cloneNode(true));
					iconGo.firstChild.style.border = "none";
					threadIconBox.removeChild(threadIconBox.firstChild);
					threadIconBox.appendChild(iconGo);
				}
			}

			// If this thread is in the DB as being read
			if (threadLRCount > -1)
			{
				if (!threadDetails['title'])
				{
					persistObject.setThreadTitle(threadId, threadTitle);
				}
				if (!threadDetails['op'])
				{
					persistObject.StoreOPData(threadId, threadOPId);
				}
				if (!dontHighlightThreads)
				{
					if ((threadRe+1) > threadLRCount) // If there are new posts
					{
						if (!disableNewReCount)
						{
							if (newPostCountUseOneLine)
							{
								threadRepliesBox.innerHTML += '&nbsp;(' + ((threadRe+1) - threadLRCount) + ')';
							}
							else
							{
								threadRepliesBox.innerHTML += ' (' + ((threadRe+1) - threadLRCount) + ')';
							}
						}
						persistObject.colorThread(doc, thread, forumid, readWithNewLight, readWithNewDark);
					}
					else
					{
						persistObject.colorThread(doc, thread, forumid, readLight, readDark);
					}
					if (!disableGradients)
					{
						persistObject.addGradient(thread);
					}
					if (threadDetails['posted'])
					{
						threadRepliesBox.style.backgroundColor = postedInThreadRe;
					}
				}
				if (showUnvisitIcon && swapIconOrder)
				{
					persistObject.insertUnreadIcon(doc, threadTitleBox, threadId).addEventListener("click", removeThread, false);
				}
				if ((showGoToLastIcon && ((threadRe+1) > threadLRCount)) || alwaysShowGoToLastIcon)
				{
					persistObject.insertLastIcon(doc, threadTitleBox, threadId, parseInt(threadLRCount));
				}
				if (showUnvisitIcon && !swapIconOrder)
				{
					persistObject.insertUnreadIcon(doc, threadTitleBox, threadId).addEventListener("click", removeThread, false);
				}
			}
			if (threadDetails['star'])
			{
				persistObject.insertStar(doc, threadTitleBox);
			}
			if (highlightUsernames)
			{
				if (posterBG != false)
				{
					threadAuthorBox.style.backgroundColor = posterBG;
				}
				if (posterColor != false)
				{
					threadAuthorBox.getElementsByTagName("a")[0].style.color = posterColor;
					if (!dontBoldNames)
					{
						threadAuthorBox.getElementsByTagName("a")[0].style.fontWeight = "bold";
					}
				}
			}
		}
		if (ourTransaction)
		{
			persistObject.database.commitTransaction();
		}
  }
}

function removeThread(evt) {
	//var doc = evt.originalTarget.ownerDocument;
	var threadid = this.id.match(/unread_(\d+)/)[1];
	persistObject.removeThread(threadid);
	for (var i=0;i<this.parentNode.parentNode.childNodes.length;i++)
	{
		if (this.parentNode.parentNode.childNodes[i].nodeName != "#text")
		{
			this.parentNode.parentNode.childNodes[i].style.backgroundColor = "";
			this.parentNode.parentNode.childNodes[i].style.backgroundImage = "";
			this.parentNode.parentNode.childNodes[i].style.backgroundRepeat = "";
		}
	}
	if (this.parentNode.getElementsByTagName('a')[0].id == "jumptolast_"+threadid)
	{
		this.parentNode.removeChild(this.parentNode.getElementsByTagName('a')[0]);
	}
	this.parentNode.removeChild(this);
}

function convertPLTag(message) {
   return message.replace(/\[PL=(.*?)\](.*?)\[\/PL\]/g,"[URL=http://forums.somethingawful.com/showthread.php?s=&postid=$1#post$1]$2[/URL]");
}

function parsePLTagsInEdit(tarea) {
   var xtxt = tarea.value;
   tarea.value = convertPLTag(xtxt);
}

var quickquotewin = null;

function releaseQuickQuoteVarsWithClose() {
   quickquotewin.close();
}

function releaseQuickQuoteVars() {
   window.__salastread_quotedoc = null;
   window.__salastread_quotetext = null;
   window.__salastread_quotethreadid = null;
   window.__salastread_quotepostid = null;
   window.__salastread_alreadypostedinthread = null;
   window.__salastread_needretrieval = null;
   quickQuoteSubmitting = false;
   quickquotewin = null;
}

function quickQuoteAddHidden(doc,form,name,value) {
   var newel = doc.createElement("INPUT");
   newel.type = "hidden";
   newel.name = name;
   newel.value = value;
   form.appendChild(newel);
}

function quickQuoteAddFile(doc,form,name,value) {
   var newel = doc.createElement("INPUT");
   newel.type = "file";
   newel.name = name;
   newel.value = value;
   form.appendChild(newel);
}

var quickQuoteSubmitting = false;
var salastread_savedQuickReply = "";
var salastread_savedQuickReplyThreadId = "";

function quickQuoteSubmit(message, parseurl, subscribe, disablesmilies, signature, subtype, formkey, attachfile) {
	try {
		message = convertPLTag(message);
		salastread_savedQuickReply = message;
		salastread_savedQuickReplyThreadId = window.__salastread_quotethreadid;

		var doc = window.__salastread_quotedoc;
		var newform = doc.createElement("FORM");
			newform.style.display = "none";
			newform.action = "http://forums.somethingawful.com/newreply.php";

		if(!window.__salastread_quotethreadid) {
			newform.action = "http://forums.somethingawful.com/newthread.php";
		}

		if (quickquotewin.__salastread_is_edit) {
			newform.action = "http://forums.somethingawful.com/editpost.php";
		}

		newform.method = "post";
		newform.enctype = "multipart/form-data";
		quickQuoteAddHidden(doc,newform,"s","");
		if(window.__salastread_quotethreadid) {
			if(quickquotewin.__salastread_is_edit) {
				quickQuoteAddHidden(doc, newform,"action", "updatepost");
				quickQuoteAddHidden(doc, newform, "postid", window.__salastread_quotepostid);
			} else {
				quickQuoteAddHidden(doc, newform,"action", "postreply");
				quickQuoteAddHidden(doc, newform,"threadid", window.__salastread_quotethreadid);
			}
		} else {
			quickQuoteAddHidden(doc, newform,"action", "postthread");
			quickQuoteAddHidden(doc, newform, "forumid",  quickquotewin.__salastread_quickpost_forumid);
			quickQuoteAddHidden(doc, newform, "iconid", quickquotewin.document.getElementById('posticonbutton').iconid);
			quickQuoteAddHidden(doc, newform, "subject", quickquotewin.document.getElementById('subject').value);
		}

		quickQuoteAddHidden(doc, newform,"parseurl", parseurl ? "yes" : "");
		quickQuoteAddHidden(doc, newform,"email", subscribe ? "yes" : "");
		quickQuoteAddHidden(doc, newform,"disablesmilies", disablesmilies ? "yes" : "");
		quickQuoteAddHidden(doc, newform,"signature", signature ? "yes" : "");
		quickQuoteAddHidden(doc, newform,"message", message);
		quickQuoteAddHidden(doc, newform,"MAX_FILE_SIZE", "2097152");
		quickQuoteAddHidden(doc, newform,"formkey", formkey);

		if (attachfile!="") {
			quickQuoteAddFile(doc, newform,"attachment", attachfile);
		}
		newform.__submit = newform.submit;

		if (window.__salastread_quotethreadid) {
			if (subtype=="submit") {
				quickQuoteAddHidden(doc,newform,"submit","Submit Reply");
				markThreadReplied(window.__salastread_quotethreadid);
			} else {
				quickQuoteAddHidden(doc,newform,"preview","Preview Reply");
			}
		}
		else {
			quickQuoteAddHidden(doc,newform,"preview","Preview Post");
		}
		doc.body.appendChild(newform);
		quickQuoteSubmitting = true;
		newform.__submit();
		quickquotewin.close();
	} catch(e) {
		alert("err: " + e);
	}
}

function salastread_windowOnBeforeUnload(e) {
	if(e.originalTarget == window.__salastread_quotedoc) {
		if(quickQuoteSubmitting) {
			return true;
		}

		if(quickquotewin && !quickquotewin.closed) {
			quickquotewin.detachFromDocument();
		}
		return true;
	}
}

var SALR_PageTimerCount = 0;

function SALR_IncTimer() {
   SALR_PageTimerCount++;
}

function SALR_DecTimer() {
   SALR_PageTimerCount--;
}

function SALR_TimerTick() {
   if ( SALR_PageTimerCount > 0 && persistObject ) {
      persistObject.PingTimer();
   }
}

function SALR_SyncTick(force,trace) {
   var xforce = force ? true : false;
   trace = (trace==true) ? true : false;
   if (persistObject) {
      var res;
		if(trace) {
         res = persistObject.PerformRemoteSync(xforce, function(){}, function(a){alert(a);});
		} else {
         res = persistObject.PerformRemoteSync(xforce, function(){}, function(a){});
		}

		if (xforce) {
			alert("res.bad = "+res.bad+"\nres.msg = "+res.msg);
		}
   }
}

function salastread_windowOnUnload(e) {
   if ( e.originalTarget == window.__salastread_quotedoc ) {
      releaseQuickQuoteVars();
   }
   if ( e.originalTarget.__salastread_processed ) {
      SALR_DecTimer();
      persistObject.SaveTimerValue();
   }
}

function quickQuoteButtonClick(evt) {
	var doc = evt.originalTarget.ownerDocument;
	var quotebutton = evt.originalTarget;
	var threadid = quotebutton.__salastread_threadid;
	var forumid = quotebutton.SALR_forumid;
	var postername = quotebutton.__salastread_postername;
	var hasQuote = quotebutton.__salastread_hasQuote;
	var is_edit = quotebutton.is_edit;

	if(persistObject.__QuickQuoteWindowObject && !persistObject.__QuickQuoteWindowObject.closed) {
		quickquotewin = persistObject.__QuickQuoteWindowObject;
	}

	window.__salastread_quotedoc = doc;

	//button pressed on a post (quote/edit)
	if(hasQuote) {
		window.__salastread_quotepostid = quotebutton.__salastread_postid;
	} else {
		window.__salastread_quotetext = "";
		window.__salastread_quotepostid = null;
	}

	window.__salastread_quotethreadid = threadid;

	if(quickquotewin && !quickquotewin.closed) {
		try {
			//try to re-add the quote in case the quickquote window's attachment was lost
			if(hasQuote) {
				quickquotewin.addQuoteFromPost(window.__salastread_quotepostid);
			}
			quickquotewin.focus();
		} catch(ex) {
			quickquotewin = window.open("chrome://salastread/content/quickquote.xul", "quickquote", "chrome, resizable=yes, width=800, height=400");
		}
	} else {
		quickquotewin = window.open("chrome://salastread/content/quickquote.xul", "quickquote", "chrome, resizable=yes, width=800, height=400");
	}

	if (quickquotewin) {
		persistObject.__QuickQuoteWindowObject = quickquotewin;
		quickquotewin.__salastread_quickpost_forumid = forumid;
		quickquotewin.__salastread_is_edit = is_edit;
	}

	return false;
}

function attachQuickQuoteHandler(threadid,doc,quotebutton,postername,hasQuote,postid,isedit) {
   quotebutton.__salastread_threadid = threadid;
   quotebutton.__salastread_postid = postid;
   quotebutton.__salastread_postername = postername;
   quotebutton.__salastread_hasQuote = hasQuote;
   if (isedit != undefined)
   {
		quotebutton.is_edit = true;
   }
   quotebutton.addEventListener("click", quickQuoteButtonClick, true);
}

var SALR_debugLog = new Array();
function addInternalDebugLog(msg) {
	SALR_debugLog.push( (new Date()).toString() +": "+msg );
	if ( SALR_debugLog.length > 10 ) {
		SALR_debugLog.shift();
	}
}

function handleShowIndex(doc) {
	grabForumList(doc, null);
	persistObject.gotForumList = true;
}

//add a user to the highlighting/note section by clicking on a post link
function addHighlightedUser(e) {
	e.stopPropagation();
	e.preventDefault();

	var link = e.originalTarget;
	var userid = link.id.split("_")[1];
	var username = link.href.split("#")[1];

	SALR_runConfig('users', { "action" : "addUser", "userid" : userid, "username" : username });
}

function handleShowThread(doc) {
	var failed, i, e;	// Little variables that'll get reused
	if (doc.getElementById('thread') == null)
	{
		// If there is no thread div then abort since something's not right
		return;
	}
	try
	{
		var forumid = persistObject.getForumID(doc);
	}
	catch(e)
	{
		// Can't get the forum id so abort for now
		return;
	}
	// The following forums have special needs that must be dealt with
	var inFYAD = persistObject.inFYAD(forumid);
	var inBYOB = persistObject.inBYOB(forumid);
	var inDump = persistObject.inDump(forumid);
	var inAskTell = persistObject.inAskTell(forumid);
	var inGasChamber = persistObject.inGasChamber(forumid);
	var userId = persistObject.userId;

	if (!inFYAD || persistObject.getPreference("enableFYAD"))
	{
		// Insert the forums paginator & mouse gestures
		if (persistObject.getPreference("enablePageNavigator"))
		{
			persistObject.addPagination(doc);
		}

		if (persistObject.getPreference("gestureEnable"))
		{
			doc.body.addEventListener('mousedown', SALR_PageMouseDown, false);
			doc.body.addEventListener('mouseup', SALR_PageMouseUp, false);
		}

		// Grab threads/posts per page
		var perpage = persistObject.selectSingleNode(doc, doc, "//DIV[contains(@class,'pages')]//A[contains(@href,'perpage=')]");
		if (perpage)
		{
			perpage = perpage.href.match(/perpage=(\d+)/i)[1];
			persistObject.setPreference("postsPerPage", perpage);
		}
		else
		{
			perpage = 0;
		}

		var isloggedin = (doc.getElementById("notregistered") == null);

		var pageList = persistObject.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
		if (pageList)
		{
			if (pageList.length >  1)
			{
				pageList = pageList[1];
			}
			else
			{
				pageList = pageList[0];
			}
			var numPages = pageList.innerHTML.match(/\((\d+)\)/);
			var curPage = persistObject.selectSingleNode(doc, doc, "//SPAN[contains(@class,'curpage')]");
			if (pageList.childNodes.length > 1) // Are there pages
			{
				numPages = parseInt(numPages[1], 10);
				curPage = parseInt(curPage.innerHTML, 10);
			}
			else
			{
				numPages = 1;
				curPage = 1;
			}
		}

		// Grab the go to dropdown
		if (!persistObject.gotForumList)
		{
			var selectnode = persistObject.selectSingleNode(doc, doc.body, "//SELECT[@name='forumid']");
			if (selectnode)
			{
				// TODO: Audit this function
				//grabForumList(doc, selectnode);
				//persistObject.gotForumList = true;
			}
		}
		doc.__SALR_forumid = forumid;
		doc.body.className += " salastread_forum" + forumid;

		// Figure out the current threadid
		var replybutton = persistObject.selectSingleNode(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newreply&threadid=')]");
		if (replybutton)
		{
			var threadid = replybutton.href.match(/threadid=(\d+)/)[1];
		}
		else
		{
			// If can't figure it out, abort so we don't screw anything up
			return;
		}
		doc.__SALR_threadid = threadid;
		persistObject.iAmReadingThis(threadid);
		var lastReadPostCount = persistObject.getLastReadPostCount(threadid);

		// used by the context menu to allow options for this thread
		doc.body.className += " salastread_thread_"+threadid;

		// Get the original poster and update the database if we don't know it yet
		var threadOP = persistObject.GetOPFromData(threadid);
		if (!threadOP && curPage == 1)
		{
			var opInfo = persistObject.selectSingleNode(doc, doc, "//TABLE[contains(@class,'post')]//A[contains(@href,'action=getinfo&userid=')]");
			if (opInfo)
			{
				persistObject.StoreOPData(threadid, opInfo.href.match(/userid=(\d+)/)[1]);
				threadOP = opInfo.href.match(/userid=(\d+)/)[1];
			}
		}

		// Grab the thread title
		persistObject.setThreadTitle(threadid, SALR_getPageTitle(doc));

		// Check if the thread is closed
		if (persistObject.selectSingleNode(doc, doc, "//A[contains(@href,'action=newreply&threadid')]//IMG[contains(@src,'closed')]") == null)
		{
			var threadClosed = false;
		}
		else
		{
			var threadClosed = true;
		}

		// draw the new rate thread box
		var rateThread = persistObject.selectSingleNode(doc,doc,"//DIV[contains(@class,'threadrate')]");
		if ( rateThread )
			SALR_drawNewRateThreadBox(doc,rateThread,threadid);

		// Replace post button
		if (persistObject.getPreference("useQuickQuote") && !inGasChamber)
		{
			var postbuttons = persistObject.selectNodes(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newthread')]");
			if (postbuttons.length > 0)
			{
				for (i in postbuttons)
				{
					attachQuickQuoteHandler(undefined,doc,persistObject.turnIntoQuickButton(doc, postbuttons[i], forumid),"",0);
				}
			}
			if (!threadClosed)
			{
				var replybuttons = persistObject.selectNodes(doc, doc, "//UL[contains(@class,'postbuttons')]//A[contains(@href,'action=newreply&threadid')]");
				if (replybuttons.length > 0)
				{
					for (i in replybuttons)
					{
						attachQuickQuoteHandler(threadid,doc,persistObject.turnIntoQuickButton(doc, replybuttons[i], forumid),"",0);
					}
				}
			}
		}

		// Update the last read total
		var postlist = persistObject.selectNodes(doc, doc, "//table[contains(@id,'post')]");
		var postcount = (perpage * (curPage - 1)) + postlist.length;

		var curPostId, colorDark = true, colorOfPost, postIdLink, resetLink, profileLink, posterId, postbody, f, linksUL, storeUserLink;
		var posterColor, posterBG, userNameBox, posterNote, posterImg, posterName, slink, quotebutton, editbutton, reportbutton;
		var userPosterColor, userPosterBG, userPosterNote;

		// Group calls to the prefs up here so we aren't repeating them, should help speed things up a bit
		var hideEditButtons = persistObject.getPreference('hideEditButtons');
		var hideReportButtons = persistObject.getPreference('hideReportButtons');
		var useQuickQuote = persistObject.getPreference('useQuickQuote');
		var insertPostLastMarkLink = persistObject.getPreference("insertPostLastMarkLink");
		var insertPostTargetLink = persistObject.getPreference("insertPostTargetLink");
		var highlightUsernames = persistObject.getPreference("highlightUsernames");
		var dontHighlightPosts = persistObject.getPreference("dontHighlightPosts");
		var resizeCustomTitleText = persistObject.getPreference("resizeCustomTitleText");
		//post colors
		var seenPostDark = persistObject.getPreference("seenPostDark");
		var seenPostLight = persistObject.getPreference("seenPostLight");
		//standard user colors
		var modColor = persistObject.getPreference("modColor");
		var modBackground = persistObject.getPreference("modBackground");
		var adminColor = persistObject.getPreference("adminColor");
		var adminBackground = persistObject.getPreference("adminBackground");
		var opColor = persistObject.getPreference("opColor");
		var opBackground = persistObject.getPreference("opBackground");

		doc.postlinks = new Array;

		// Loop through each post
		for (i in postlist)
		{
			var post = postlist[i];

			if (post.className.indexOf("ignored") > -1)
			{
				// User is ignored by the system so skip doing anything else
				continue;
			}

			curPostId = post.id.match(/post(\d+)/)[1];
			postcount = (perpage * (curPage - 1)) + parseInt(i) + 1;
			profileLink = persistObject.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//ul[contains(@class,'profilelinks')]//a[contains(@href,'userid=')]");
			posterId = profileLink.href.match(/userid=(\d+)/i)[1];
			if (!inFYAD)
			{
				userNameBox = persistObject.selectSingleNode(doc, post, "TBODY//TR/TD//DL//DT[contains(@class,'author')]");
			}
			else
			{
				userNameBox = persistObject.selectSingleNode(doc, post, "TBODY//DIV[contains(@class,'title')]//following-sibling::B");
			}
			titleBox = persistObject.selectSingleNode(doc, post, "tbody//dl[contains(@class,'userinfo')]//dd[contains(@class,'title')]");

			if (titleBox && resizeCustomTitleText)
			{
				// Adds a scrollbar if they have a really wide custom title
				titleBox.style.overflow = "auto";
				titleBox.style.width = "159px";
				if (titleBox.getElementsByTagName('font').length > 0)
				{
					// They likely have a large, red custom title
					for(f = 0; f < titleBox.getElementsByTagName('font').length; f++)
					{
						titleBox.getElementsByTagName('font')[f].style.fontSize = "10px";
					}
				}
			}

			//Check to see if there's a mod or admin star
			posterImg = false;
			posterName = userNameBox.textContent.replace(/^\s+|\s+$/, '');
			if (userNameBox.getElementsByTagName('img').length > 0)
			{
				posterImg = userNameBox.getElementsByTagName('img')[0].title;
				if (posterImg == 'Admin')
				{
					persistObject.addAdmin(posterId, posterName);
				}
				else if (posterImg == 'Moderator')
				{
					persistObject.addMod(posterId, posterName);
				}
			}
			posterColor = false;
			posterBG = false;
			posterNote = false;
			if (posterId == threadOP)
			{
				posterColor = opColor;
				posterBG =  opBackground;
				posterNote = "Thread Poster";
			}
			if (persistObject.isMod(posterId))
			{
				if(posterImg == 'Moderator')
				{
					posterColor = modColor;
					posterBG =  modBackground;
					posterNote = "Forum Moderator";
				}
				else
				{
					persistObject.removeMod(posterId);
				}
			}
			if (persistObject.isAdmin(posterId))
			{
				if(posterImg == "Admin")
				{
					posterColor = adminColor;
					posterBG =  adminBackground;
					posterNote = "Forum Administrator";
				}
				else
				{
					persistObject.removeAdmin(posterId);
				}
			}
			var dbUser = persistObject.isPosterColored(posterId);
			if(dbUser)
			{
				if(!dbUser.username) {
					persistObject.setUserName(posterId, posterName);
				}
				posterColor = persistObject.getPosterColor(posterId);
				posterBG = persistObject.getPosterBackground(posterId);
			}
			userPosterNote = persistObject.getPosterNotes(posterId);
			if (highlightUsernames && posterColor != false)
			{
				userNameBox.style.color = posterColor;
			}
			if (posterNote != false)
			{
				newNoteBox = doc.createElement("p");
				newNoteBox.style.fontSize = "80%";
				newNoteBox.style.margin = "0";
				newNoteBox.style.padding = "0";
				newNoteBox.textContent = posterNote;
				userNameBox.appendChild(newNoteBox);
			}
			if (userPosterNote != false)
			{
				newNoteBox = doc.createElement("p");
				newNoteBox.style.fontSize = "80%";
				newNoteBox.style.margin = "0";
				newNoteBox.style.padding = "0";
				newNoteBox.textContent = userPosterNote;
				userNameBox.appendChild(newNoteBox);
			}
			if (!dontHighlightPosts)
			{
				if (posterBG != false)
				{
					persistObject.colorPost(doc, post, posterBG, forumid);
				}
				else if (postcount <= lastReadPostCount)
				{
					if (colorDark)
					{
						posterBG = seenPostDark;
					}
					else
					{
						posterBG = seenPostLight;
					}
					persistObject.colorPost(doc, post, posterBG, forumid);
				}
			}
			colorDark = !colorDark;
			postIdLink = persistObject.selectSingleNode(doc, post, "tbody//td[contains(@class,'postdate')]//a[contains(@href,'#post')]");
			postid = postIdLink.href.match(/#post(\d+)/i)[1];
			if (insertPostTargetLink)
			{
				slink = doc.createElement("a");
				slink.href = "/showthread.php?action=showpost&postid="+postid;
				slink.title = "Show Single Post";
				slink.innerHTML = "1";
				postIdLink.parentNode.insertBefore(slink, postIdLink);
				postIdLink.parentNode.insertBefore(doc.createTextNode(" "), postIdLink);
			}
			if (insertPostLastMarkLink)
			{
				resetLink = doc.createElement("a");
				resetLink.href = "javascript:void('lr',"+postid+");";
				resetLink.title = "Set \"Last Read\" post in this thread to this post";
				resetLink.threadid = threadid;
				resetLink.postid = postid;
				resetLink.postcount = postcount;
				resetLink.parentpost = post;
				resetLink.onclick = SALR_ChangeLastReadOnThread;
				resetLink.innerHTML = "<";
				doc.postlinks[doc.postlinks.length] = resetLink;
				postIdLink.parentNode.insertBefore(resetLink, postIdLink);
				postIdLink.parentNode.insertBefore(doc.createTextNode(" "), postIdLink);
			}

			//grab this once up here to avoid repetition
			if(useQuickQuote || hideEditButtons) {
				editbutton = persistObject.selectSingleNode(doc, post, "tbody//ul[contains(@class,'postbuttons')]//li//a[contains(@href,'action=editpost')]");
			}

			if(hideEditButtons && editbutton) {
				if(posterId != userId) {
					editbutton.parentNode.removeChild(editbutton);
					//so we don't try to add quickquote to non-existant edit buttons
					editbutton = null;
				}
			}

			if (useQuickQuote && !threadClosed)
			{
				quotebutton = persistObject.selectSingleNode(doc, post, "tbody//ul[contains(@class,'postbuttons')]//li//a[contains(@href,'action=newreply')]");
				if (quotebutton)
				{
					attachQuickQuoteHandler(threadid, doc, persistObject.turnIntoQuickButton(doc, quotebutton, forumid), posterName, 1, postid);
				}
				if (editbutton)
				{
					attachQuickQuoteHandler(threadid, doc, persistObject.turnIntoQuickButton(doc, editbutton, forumid), posterName, 1, postid, true);
				}
			}

			if(hideReportButtons)
			{
				if(posterId == userId)
				{
					reportbutton = persistObject.selectSingleNode(doc, post, "tbody//ul[contains(@class,'postbuttons')]//li//a[contains(@href,'modalert.php')]");
					if(reportbutton)
					{
						reportbutton.parentNode.removeChild(reportbutton);
					}
				}
			}
			//add user coloring/note links
			if(highlightUsernames) {
				var ul = profileLink.parentNode.parentNode;
				var li = doc.createElement("li");

				var a = doc.createElement("a");
					a.id = curPostId + "_" + posterId;
					a.href ="#" + posterName;
					//a.style.textDecoration = "underline";
					//a.style.cursor = "pointer";
					a.innerHTML = "Add Coloring/Note";
					a.onclick = addHighlightedUser;
				li.appendChild(a);
				ul.appendChild(li);
			}

			postbody = persistObject.selectSingleNode(doc, post, "TBODY//TD[contains(@class,'postbody')]");
			persistObject.convertSpecialLinks(postbody, doc);
			persistObject.scaleImages(postbody, doc);
		}

		// Get the last post #
		lastPostId = postIdLink.href.match(/#post(\d+)/i)[1];
		persistObject.setLastPostID(threadid, lastPostId);
		persistObject.setLastReadPostCount(threadid, postcount);
	}

	// below hasn't been rewritten
	try {
		try { SALR_InsertThreadKeyboardNavigation(doc); } catch (e) { }

		reanchorThreadToLink(doc);

		doc.__salastread_loading = true;
		window.addEventListener("load", SALR_PageFinishedLoading, true);

		if (persistObject.getPreference('scrollPostEnable')) {
			setTimeout(function () { SALR_CheckScrollPostPosition(doc); }, 1000);
		}
	} catch(e) {
		if (!persistObject.getPreference("suppressErrors")) {
			alert(e);
		}
	}
}

/**
 * replaces the standard rate thread box with a new one
 * This will be called when a thread page is displayed but
 * if perf('enableThreadRating') is false it will not draw the rating box.
 * @author camalot
 * @param {Object} doc the doc object
 * @param {Element} container the container of the rate box
 * @param {int} threadId the id of the thread
 */
function SALR_drawNewRateThreadBox ( doc, container, threadId ) {
	if ( persistObject.getPreference("enableThreadRating") ) {
		// var threadTitle = SALR_getPageTitle(doc);
		// build the html for the rating box
		if ( container ) {
			container.innerHTML = "";
			container.className += " salrRateThread";
			// create the "rate thread" label
			var div = doc.createElement('div');
			div.setAttribute("class","salrRateThreadlabel");
			div.innerHTML = "Rate Thread:";
		  container.appendChild(div);

		  var form = doc.createElement("form");
		  form.setAttribute("id","rateform");
		  form.setAttribute("action","threadrate.php");
		  form.setAttribute("method","post");
		  form.setAttribute("name","rateform");

		  var rateImage = doc.createElement("img");
		  rateImage.setAttribute("src","chrome://salastread/skin/blank.png");
		  rateImage.setAttribute("id","salrRateImage");
		  rateImage.setAttribute("class","salrratingstars salrstars0");
		  rateImage.setAttribute("title","This thread means nothing to me.");
		  rateImage.addEventListener("mousemove", function(evt) { SALR_ThreadRateMM(rateImage,evt); }, true);
			rateImage.addEventListener("mouseout", function(evt) { SALR_ThreadRateMM(rateImage,null); }, true);
			rateImage.addEventListener("click", function(evt) { SALR_ThreadRateSubmit(doc); }, true);

			form.appendChild(rateImage);

			var diggAnchor = doc.createElement("a");
			diggAnchor.setAttribute("href","http://digg.com/submit?phase=2&url="+doc.location.href);

			var diggImage = doc.createElement("img");
			diggImage.setAttribute("class","salrdigg");
			diggImage.setAttribute("src","chrome://salastread/skin/blank.png");
			diggImage.setAttribute("title","digg this thread!");
			diggImage.setAttribute("id","salrdiggbutton");
			diggImage.addEventListener("mousemove", function (evt) { SALR_ThreadRateMM(rateImage,evt); }, true);
			diggImage.addEventListener("mouseout",function(evt) { SALR_ThreadRateMM(rateImage,null); }, true);
			diggAnchor.appendChild(diggImage);

			form.appendChild(diggAnchor);

			var input = doc.createElement("input");
			input.setAttribute("type","hidden");
			input.setAttribute("id","salrRatingValue");
			input.setAttribute("name","vote");
			input.setAttribute("value","0");
			form.appendChild(input);

			input = doc.createElement("input");
			input.setAttribute("type","hidden");
			input.setAttribute("name","threadid");
			input.setAttribute("value",threadId);
			form.appendChild(input);

		  container.appendChild(form);
		}
	}
}

/**
 * Array of strings to set the title of the rate image.
 * @author camalot
 * @type {String[]}
 */
var salrRatingTitles = [ "This thread means nothing to me.", "This thread sucks ass.",
												 "This is not a good thread.", "This is a mediocre thread.",
												 "This is a somewhat entertaining thread.", "Excellent thread!" ];
/**
 * Handles the mouse move event of the rate thread image
 * @param {Element} obj the image element
 * @param {Event} evt The event object
 * @author camalot
 */
function SALR_ThreadRateMM(obj, evt) {
  var rateIndex = 0;
  if ( evt ) {
  	// find the position of the mouse in the element
  	var mouseX = (evt.clientX - obj.offsetLeft);
  	// get the rating index based on the position
  	rateIndex = SALR_ThreadRateGetRateIndex(mouseX);
  } else
    var rateIndex = 0;
  // set the image info
  SALR_ThreadRateSetRateImageInfo ( obj, rateIndex );
}
/**
 * Handles the click event of the rate thread image
 * @param {Object} doc The document object.
 * @author camalot
 */
function SALR_ThreadRateSubmit ( doc ) {
	var rateForm = doc.getElementById("rateform");
	if ( rateForm )
		rateForm.submit();
}
/**
 * Sets the value of the rating to a hidden field and changes the css class of the image.
 * @param {Element} obj The image element
 * @param {int} index The rating value which is also the index of the title in the array and part of the css class
 * @author camalot
 */
function SALR_ThreadRateSetRateImageInfo ( obj, index ) {
  if ( obj ) {
  	var doc = obj.ownerDocument;
    obj.className = "salrratingstars salrstars" + index;
    obj.title = salrRatingTitles[index];
    var valField = doc.getElementById("salrRatingValue");
    if ( valField )
    	valField.value = index;
  }
}
/**
 * gets the rating index based on the X position of the mouse
 * @param {int} x The mouse x position
 * @return 0 - 5 for the rating value
 * @type {int}
 * @author camalot
 */
function SALR_ThreadRateGetRateIndex(x) {
  if ( x > 2 && x < 20 ) return 1;
  else if  ( x > 19 && x < 38 ) return 2;
  else if ( x > 37 && x < 56 ) return 3;
  else if ( x > 55 && x < 74 ) return 4;
  else if ( x > 73 && x < 141 ) return 5;
  else return 0;
}

function handleSupport(doc)
{
	if (doc.getElementById('content') == null)
	{
		// If there is no content div then abort since something's not right
		return;
	}
	if (doc.getElementById('content').getElementsByTagName('iframe')[0].src.search(/supportfaq/) == -1)
	{
		// The iframe isn't there so something's changed
		return;
	}
	var newImg = doc.createElement('img');
	newImg.src = "chrome://salastread/skin/techsupport.jpg";
	var newText = doc.createElement('p');
	newText.innerHTML = "Please disable SA Last Read before reporting a problem with the forums";
	newText.style.textAlign = "center";
	var emptyP = doc.createElement('p');
	var newLink = doc.createElement('a');
	emptyP.appendChild(newLink);
	emptyP.style.textAlign = "center";
	newLink.href = "https://salr.bountysource.com/development";
	newLink.innerHTML = "Click here to report a problem with SA Last Read instead";
	var supportTable = doc.getElementById('content').getElementsByTagName('div')[1];
	supportTable.parentNode.replaceChild(newImg, supportTable);
	newImg.parentNode.appendChild(newText);
	newImg.parentNode.appendChild(emptyP);
}

var specialDoc;

function SALR_PageFinishedLoading(e) {
	var doc = e.originalTarget;
	doc.__salastread_loading = false;
}

function SALR_CheckScrollPostPosition(doc) {
	if (doc.__salastread_processed) {
		var scrollpos = doc.defaultView.scrollY + doc.defaultView.innerHeight;
		var i,a;

		for (i = 0; i < doc.postlinks.length; i++) {
			a = doc.postlinks[i];
			if (a.postid && (doc.__salastread_loading || !a.absolutepos)) {
				a.absolutepos = SALR_GetVerticalPos(a.parentpost);
			}

			if (a.absolutepos && scrollpos > a.absolutepos) {
				persistObject.setLastPostID(a.threadid, a.postid, true);
			}
		}
		setTimeout(function () { SALR_CheckScrollPostPosition(doc); }, 5000);
	}
}

function SALR_GetVerticalPos(element) {
	var y = 0;
	var p = element;
	while (p) {
		y += p.offsetTop;
		p = p.offsetParent;
	}

	return y;
}

function SALR_InsertThreadKeyboardNavigation(doc) {
	// XXX: temporarily disabled
	return;

	doc.onkeypress =
	function(e) {
		if(e.which == 32)
		{
			var curTop = doc.body.scrollTop;
			setTimeout(function() { SALR_CheckForSpaceScroll(doc, curTop); }, 50);
		}
	};
}

function SALR_CheckForSpaceScroll(doc, oldTop) {
	var newTop = doc.body.scrollTop;
	if (oldTop == newTop) {
		var bclassmatch = doc.body.className.match(/salastread_thread_(\d+)/);
		if (bclassmatch) {
			var curPage = doc._SALR_curPage;
			var maxPages = doc._SALR_maxPages;
			var threadid = Number(bclassmatch[1]);

			if (maxPages>curPage) {
				doc.location = "http://forums.somethingawful.com/showthread.php?s=&threadid=" + threadid + "&pagenumber=" + (curPage + 1);
				return;
			}

			var postid = persistObject.getLastPostID(threadid);
			if(postid > 0) {
				var nurl = "http://forums.somethingawful.com/showthread.php?s=&postid=" + postid + "#post" + postid;
				if (doc.location.href == nurl) {
					doc.location.reload();
				} else {
					doc.location = nurl;
				}
			}
		}
	}
}

function SALR_DirectionalNavigate(doc, dir) {
	var urlbase = doc.location.href.match(/.*\.somethingawful\.com/);
	var curPage = doc.__SALR_curPage;
	var perpage = "&perpage=" + persistObject.getPreference("postsPerPage");
	var forumid = doc.location.href.match(/forumid=[0-9]+/);
	var posticon = doc.location.href.match(/posticon=[0-9]+/);
	if (!posticon) posticon = "&posticon=0";
	var sortfield = doc.location.href.match(/&sortfield=[a-zA-Z0-9]+/);
	if (!sortfield) sortfield = "&sortfield=lastpost";
	var sortorder = doc.location.href.match(/&sortorder=[a-z]+/);
	if (!sortorder) sortorder = "&sortorder=desc";

	if (dir == "top") {
		var threadForum = doc.__SALR_forumid;

		if(curPage == 1 && !threadForum) {
			doc.location = urlbase + "/index.php";
		} else {
			if (threadForum) {
				doc.location = urlbase + "/forumdisplay.php?s=&forumid=" + threadForum;
			} else {
				doc.location = urlbase + "/forumdisplay.php?s=&" + forumid + posticon;
			}
		}
	} else if (dir == "left") {
		if (curPage > 1) {
			var threadid = doc.__SALR_threadid;
			if (threadid) {
				doc.location = urlbase + "/showthread.php?s=&threadid=" + threadid + perpage + "&pagenumber=" + (curPage - 1);
			} else {
				doc.location = urlbase + "/forumdisplay.php?" + forumid + "&daysprune=30" + sortorder + sortfield + perpage + posticon + "&pagenumber=" + (curPage - 1);
			}
		}
	} else if (dir == "right") {
		var curPage = doc.__SALR_curPage;
		var maxPage = doc.__SALR_maxPage;
		if (maxPage > curPage) {
			var threadid = doc.__SALR_threadid;
			if (threadid) {
				doc.location = urlbase + "/showthread.php?s=&threadid=" + threadid + perpage + "&pagenumber=" + (curPage + 1);
			} else {
				doc.location = urlbase + "/forumdisplay.php?"+forumid+"&daysprune=30" + sortorder + sortfield + perpage + posticon + "&pagenumber=" + (curPage + 1);
			}
		}
	}
}

function SALR_PageMouseUp(event) {
   var targ = event.target;
   var doc = targ.ownerDocument;
   if (targ && targ.SALR_isGestureElement==true) {
      doc.body.addEventListener('contextmenu', SALR_GestureContextMenu, false);
      SALR_DirectionalNavigate(doc, targ.SALR_dir);
   }

   var gn = doc.getElementById("salastread_gesturenavtop");
   if (gn) {
      var rx = function(dir) {
         var el = doc.getElementById("salastread_gesturenav"+dir);
         el.parentNode.removeChild(el);
      }
      rx("top");
      rx("left");
      rx("right");
      rx("bottom");
   }
}

function SALR_GestureContextMenu(event) {
   var targ = event.target;
   var doc = targ.ownerDocument;
   doc.body.removeEventListener('contextmenu', SALR_GestureContextMenu, false);
   if (event.preventDefault) {
      event.preventDefault();
   }
   return false;
}

function SALR_PageMouseDown(event) {
   var doc = event.target.ownerDocument;
   var gn = doc.getElementById("salastread_gesturenavtop");
   if (gn) {
      return;
   }
   if (event.button == persistObject.getPreference('gestureButton') && persistObject.getPreference('gestureEnable')) {
      var cx = function(dir, ofsy, ofsx) {
         var el = doc.createElement("IMG");
         el.SALR_dir = ""+dir;
         el.id = "salastread_gesturenav"+dir;
         el.className = "salastread_gesturenav";
         el.src = "chrome://salastread/skin/gesturenav-" + dir + ".png";
         el.style.left = ((event.clientX - 36) + (77 * ofsx)) + "px";
         el.style.top = ((event.clientY - 36) + (77 * ofsy)) + "px";
         doc.body.appendChild(el);
         el.SALR_isGestureElement = true;

         if (dir=="left" && (doc.__SALR_curPage <= 1 || !doc.__SALR_curPage)) {
            el.className += " disab";
         }
         else if (dir=="right" && (doc.__SALR_maxPage <= doc.__SALR_curPage || !doc.__SALR_maxPage)) {
            el.className += " disab";
         }
      };
      cx("top", -1, 0);
      cx("left", 0, -1);
      cx("right", 0, 1);
      cx("bottom", 1, 0);
   }
}

//handle setting the last read post to a user-defined post
function SALR_ChangeLastReadOnThread(e) {
	try {
		var threadid = e.originalTarget.threadid;
		var postid = e.originalTarget.postid;
		var postcount = e.originalTarget.postcount;

		//first update the last post ID, then post count
		persistObject.setLastPostID(threadid, postid, true);
		persistObject.setLastReadPostCount(threadid, postcount, true);

		//create the little yellow popup
		var doc = e.originalTarget.ownerDocument;
		var notel = doc.createElement("div");
			notel.innerHTML = "Last Post reset to this post.";
			notel.className = "SALR_yellowPopup";
			notel.style.top = e.pageY + "px";
			notel.style.left = e.pageX + "px";
		notel.opacity = 100;

		doc.body.appendChild(notel);
		setTimeout( function() { SALR_NoteFade(notel); }, 1000 );
	} catch(e) {
		alert("Error marking thread: " + e);
	}
}

function SALR_NoteFade(targetEl) {
	targetEl.opacity -= 5;
	targetEl.style.MozOpacity = (targetEl.opacity / 100);
	if (targetEl.opacity > 5) {
		setTimeout( function() { SALR_NoteFade(targetEl); }, 10 );
	} else {
		targetEl.parentNode.removeChild(targetEl);
	}
}

function reanchorThreadToLink(doc) {
	if(persistObject.getPreference('reanchorThreadOnLoad')){
		if (doc.location.href.match(/\#(.*)$/)) {
			var post = doc.getElementById(doc.location.href.match(/\#(.*)$/)[1]);

			if (post) {
				var next = post.nextSibling;
				if(next.id && next.id.match(/post\d+/)) {
					if((post.className.indexOf("colored") > 0) && (next.className.indexOf("colored") < 0)) {
						next.scrollIntoView(true);
						return;
					}
				}

				post.scrollIntoView(true);
			}
		}
	}
}

function SALR_runConfig(page, args) {
	//check a pref so the dialog has the proper constructor arguments
	var pref = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefBranch);

    var instantApply = pref.getBoolPref("browser.preferences.instantApply");
	var features = "chrome,titlebar,toolbar,centerscreen" + (instantApply ? ",dialog=no" : ",modal");

	openDialog("chrome://salastread/content/pref.xul", "Preferences", features, page, { "args" : args });
}

function handleEditPost(e) {
   var doc = e.originalTarget;
   var submitbtn = persistObject.selectNodes(doc, doc.body, "//INPUT[@type='submit'][@value='Save Changes']")[0];
   var tarea = persistObject.selectNodes(doc, doc.body, "//TEXTAREA[@name='message']")[0];
   if (submitbtn && tarea) {
      submitbtn.addEventListener("click", function() { parsePLTagsInEdit(tarea); }, true);
      submitbtn.style.backgroundColor = persistObject.getPreference('postedInThreadRe');
   }
}

var salastread_needRegReplyFill = false;

function setRegReplyFillOn() {
   salastread_needRegReplyFill = true;
}

function handleNewReply(e) {
   var doc = e.originalTarget;
   var threadlink = persistObject.selectSingleNode(doc, doc.body, "DIV[contains(@id, 'container')]/TABLE[1]/TBODY[1]/TR[1]/TD[1]/SPAN[1]/B/A[contains(@href,'showthread.php')][contains(@href,'threadid=')]");
   if (threadlink) {
      var tlmatch = threadlink.href.match( /threadid=(\d+)/ );
      if ( tlmatch ) {
         var threadid = tlmatch[1];
         if ( salastread_needRegReplyFill ) {
            var msgEl = persistObject.selectSingleNode(doc, doc.body, "//TEXTAREA[@name='message']");
            if (msgEl) {
               msgEl.value = salastread_savedQuickReply;
            }
            salastread_needRegReplyFill = false;
         }
         var postbtn = persistObject.selectNodes(doc, doc.body, "//FORM[@name='vbform'][contains(@action,'newreply.php')]//INPUT[@type='submit'][@name='submit']")[0];
         if (postbtn) {
            postbtn.addEventListener("click", function() { markThreadReplied(threadid); }, true);
            postbtn.style.backgroundColor = persistObject.getPreference('postedInThreadRe');
         }
      }
   } else {
      if (salastread_savedQuickReply!="") {
         var forgeCheck = persistObject.selectSingleNode(doc, doc.body, "TABLE/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[2]/TD[1]/FONT[contains(text(),'have been forged')]");
         if (forgeCheck) {
            persistObject.__cachedFormKey = "";
            var reqMsg = doc.createElement("P");
            reqMsg.style.fontFamily = "Verdana, Arial, Helvetica";
            reqMsg.style.fontSize = "80%";
            reqMsg.style.backgroundColor = "#fcfd99";
            reqMsg.style.border = "1px solid black";
            reqMsg.style.padding = "2px 2px 2px 2px";
            reqMsg.appendChild(
               doc.createTextNode("Message from SA Last Read: " +
                  "Quick Reply appears to have worked incorrectly. To open "+
                  "your reply in a regular forum reply page, click ")
            );
            var regReplyLink = doc.createElement("A");
            regReplyLink.onclick = setRegReplyFillOn;
            regReplyLink.href = "http://forums.somethingawful.com/newreply.php?s=&action=newreply&threadid=" +
               salastread_savedQuickReplyThreadId;
            regReplyLink.innerHTML = "here.";
            reqMsg.appendChild(regReplyLink);
            forgeCheck.parentNode.insertBefore(reqMsg, forgeCheck);
         } else {
            salastread_savedQuickReply = "";
            salastread_savedQuickReplyThreadId = "";
         }
      }
   }
}

function markThreadReplied(threadid) {
	persistObject.iPostedHere(threadid);
}

function handleConfigLinkInsertion(e) {
	var doc = e.originalTarget;
	var usercpnode = persistObject.selectSingleNode(doc, doc.body, "//UL[@id='navigation']/LI/A[contains(@href,'usercp.php?s=')]");
	if (usercpnode) {
		var containerLi = doc.createElement("LI");
		var sep = doc.createTextNode(" - ");
		var newlink = doc.createElement("A");
		containerLi.appendChild(sep);
		containerLi.appendChild(newlink);
		newlink.appendChild( doc.createTextNode("Configure SALR") );
		usercpnode.parentNode.parentNode.insertBefore(containerLi, usercpnode.parentNode.nextSibling);
		newlink.href = "#";
		newlink.addEventListener("click", SALR_runConfig, true);
		return 1;
	} else {
		return 0;
	}
}

function handleBodyClassing(e) {
   var doc = e.originalTarget;
   var docbody = doc.body;
   var addclass = " somethingawfulforum";
   var phmatch = doc.location.href.match( /\/([^\/]*)\.php/ );
   if (phmatch) {
      addclass += " somethingawfulforum_"+phmatch[1]+"_php";
   }
   docbody.className += addclass;
}

function salastread_hidePageHeader(doc) {
   var hiddenElements = new Array();
   var hideEl = function(id) {
      var el;
      if (typeof id == "string") {
         el = doc.getElementById(id);
      } else {
         el = id;
      }
      if (el) {
         el.SALR_display = el.style.display;
         el.style.display = "none";
         hiddenElements.push(el);
      }
   }

   hideEl("globalmenu");
   hideEl("searchboxes");
   hideEl("navigation");
   var nav = doc.getElementById("navigation");
   if (nav) {
      nav = nav.nextSibling;
      if (nav && nav.nodeName != "DIV") {
         nav = nav.nextSibling;
      }
      if (nav && persistObject.selectSingleNode(doc, nav, "A[@target='_new']/IMG")) {
         hideEl(nav);
      }
   }
   hideEl("copyright");
   var copyright = doc.getElementById("copyright");
   if (copyright) {
      if (copyright) copyright = copyright.previousSibling;
      if (copyright && copyright.nodeName != "DIV") copyright = copyright.previousSibling;
      if (copyright && persistObject.selectSingleNode(doc, copyright, "A[@target='_new']/IMG")) {
         hideEl(copyright);
      }
   }

   if (hiddenElements.length > 0) {
      var togLink = doc.createElement("DIV");
      togLink.className = "salastread_showhideheaderbutton";
      togLink.innerHTML = "[Show Header/Footer]";
      togLink.onclick = function() {
         for (var i=0; i<hiddenElements.length; i++) {
            var tel = hiddenElements[i];
            tel.style.display = tel.SALR_display;
         }
         togLink.style.display = "none";
         return false;
      };
      doc.body.appendChild(togLink);
   }
}

function SALR_ParamsToUrl(params) {
   var res = "";
   for (var key in params) {
      if (key.indexOf("salr_")==0) {
         res += "&" + escape(key) + "=" + escape(params[key]);
      }
   }
   return res;
}

function SALR_windowOnLoadMini(e) {
   var doc = e.originalTarget;
   var location = doc.location;
   try {
      if (doc.__salastread_processed) {
         if ( persistObject.getPreference('reanchorThreadOnLoad') ) {
            var samatch = location.href.match( /^http:\/\/forums?\.somethingawful\.com\//i );
            samatch = samatch || location.href.match( /^http:\/\/archives?\.somethingawful\.com\//i );
            if (samatch) {
               if ( location.href.indexOf("showthread.php?") != -1 ) {
				  reanchorThreadToLink(doc);
               }
            }
         }
         return;
      }
   }
   catch (ex) { }
}

function SALR_getPageTitle(doc) {
	return doc.title.replace(/( \- )?The Something ?Awful Forums( \- )?/i, '');
}

function SALR_insertCSS(css, doc) {
	var stylesheet = doc.createElement("link");
		stylesheet.rel = "stylesheet";
		stylesheet.type = "text/css";
		stylesheet.href = css;
	doc.getElementsByTagName('head')[0].appendChild(stylesheet);
}

//not used right now, might be useful later!
function SALR_insertDynamicCSS(css, doc) {
	var stylesheet = doc.createElement("style");
		stylesheet.type = "text/css";
		stylesheet.innerHTML = css;

	doc.getElementsByTagName('head')[0].appendChild(stylesheet);
}

var SALR_SilenceLoadErrors = false;
var firstLoad = true;
var loadCount = 0;

/*
 *
 *  onload Handler
 *  This function is a clusterfuck of immense proportions.
 *
 */
function salastread_windowOnLoad(e) {
	// This IF statement included to help debugging, change the pref value to disable without restarting FF
	if(Components.classes["@mozilla.org/preferences;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.salastread.").getBoolPref("disabled") == false)
	{
		SALR_SilenceLoadErrors = false;

		var doc = e.originalTarget;
		var location = doc.location;
		var isSa = false;
		try {
			if ( location && location.href && !doc.__salastread_processed ) {
				var samatch = location.href.match( /^http:\/\/forums?\.somethingawful\.com\//i );
					samatch = samatch || location.href.match( /^http:\/\/archives?\.somethingawful\.com\//i );
				if (samatch) {
					isSa = true;
				}
			}
		} catch(ex) { }

		try {
			loadCount++;
			if (firstLoad) {
				firstLoad = false;
				if(persistObject.getPreference('showSAForumMenu') && persistObject.forumListXml && persistObject.forumListXml != null ) {
					try { buildSAForumMenu(); } catch(e) { alert("buildsaforummenu err:" + e); };
				}

				// DOMContentLoaded test...
				document.getElementById("appcontent").addEventListener("DOMContentLoaded", salastread_windowOnLoad, false);

				//add handler or hide context menu, depending on setting
				if(persistObject.getPreference('enableContextMenu')) {
					document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", SALR_ContextMenuShowing, false);
				} else {
					var cacm = document.getElementById("contentAreaContextMenu");
					var mopt = document.getElementById("salastread-context-menu");
					var moptsep = document.getElementById("salastread-context-menuseparator");

					cacm.removeChild(mopt);
					cacm.removeChild(moptsep);
				}

				if(!persistObject.getPreference("showSAToolsMenu")) {
					var item = document.getElementById("salastread-tools-menuitem");
						item.parentNode.removeChild(item);
				}
			}

			if (loadCount == 3) {
				if (needToShowChangeLog == true) {
					needToShowChangeLog = false;
					showChangelogWindow();
				}

				window.removeEventListener('load', salastread_windowOnLoad, true);
				window.addEventListener('load', SALR_windowOnLoadMini, true);
			}

			if (doc.__salastread_processed) {
				if(persistObject.getPreference('reanchorThreadOnLoad') ) {
					if (isSa) {
						if ( location.href.indexOf("showthread.php?") != -1 ) {
							reanchorThreadToLink(doc);
						}
					}
				}
				return;
			}

			if ( location && location.href && !doc.__salastread_processed ) {
				if (isSa) {
					//insert any CSS we might need now
					if(persistObject.getPreference('gestureEnable')) {
						SALR_insertCSS("chrome://salastread/content/gestureStyling.css", doc);
					}

					if(persistObject.getPreference('removeHeaderAndFooter')) {
						SALR_insertCSS("chrome://salastread/content/hideshowheaderbutton.css", doc);
					}

					if(persistObject.getPreference('enablePageNavigator') || persistObject.getPreference('enableForumNavigator')) {
						SALR_insertCSS("chrome://salastread/content/pagenavigator-content.css", doc);
					}

					//insert content CSS
					SALR_insertCSS("chrome://salastread/content/contentStyling.css", doc);

					// insert thread rate box css
  				SALR_insertCSS("chrome://salastread/content/threadRate.css",doc);

					// why the FUCK doesn't this work?
					var hresult = 0;
					if ( location.href.indexOf("forumdisplay.php?") != -1 ) {
						if (doc.getElementById('forum') != null) {
							// Only do if there is a list of posts
							handleForumDisplay(doc);
						}
					} else if ( location.href.indexOf("showthread.php?") != -1) {
						handleShowThread(doc);
					} else if ( location.href.indexOf("index.php") != -1) {
						handleShowIndex(doc)
					} else if ( location.href.indexOf("newreply.php") != -1) {
						handleNewReply(e);
					} else if ( location.href.indexOf("editpost.php") != -1) {
						handleEditPost(e);
					} else if ( location.href.indexOf("member2.php") != -1 ||
								location.href.indexOf("usercp.php") != -1) {
						handleSubscriptions(doc);
					} else if (location.href.search(/supportmail\.php/) > -1) {
						handleSupport(doc);
					}

					var hcliresult = handleConfigLinkInsertion(e);
					handleBodyClassing(e);

					doc.__salastread_processed = true;

					// XXX: The unload prevents FF 1.5 from using Quick Back Button.
					//      SALR needs to work with it, but this works to prevent trouble in the meantime.
					if (true) {
						var screl = doc.createElement("SCRIPT");
							screl.setAttribute("language","javascript");
							screl.setAttribute("src","chrome://salastread/content/pageunload.js");
						doc.getElementsByTagName('head')[0].appendChild(screl);

						// Added by duz for testing events
						screl = doc.createElement("SCRIPT");
						screl.setAttribute("language","javascript");
						screl.setAttribute("src","chrome://salastread/content/salrevents.js");
						doc.getElementsByTagName('head')[0].appendChild(screl);
					}
					SALR_IncTimer();
					if(persistObject.getPreference('enableDebugMarkup') ) {
						var dbg = doc.createElement("DIV");
							dbg.innerHTML = SALR_debugLog.join("<br>");
							doc.body.appendChild(dbg);
					}

					if (persistObject.getPreference("removePageTitlePrefix")) {
						doc.title = SALR_getPageTitle(doc);
					}

					if (persistObject.getPreference('removeHeaderAndFooter')) {
						salastread_hidePageHeader(doc);
					}
				}
			}
		} catch(ex) {
			if(!e.runSilent || SALR_SilenceLoadErrors) {
				if (typeof(ex) == "object") {
					var errstr = "";
					for ( var tn in ex ) {
						errstr += tn + ": " + ex[tn] + "\n";
					}

					if (!persistObject || !persistObject.getPreference('suppressErrors')) {
						alert("SALastRead application err: "+errstr);
					} else {
						if (!persistObject || !persistObject.getPreference('suppressErrors')) {
							alert("SALastRead application err: "+ex);
						}
					}
				}
			} else {
				throw ex;
			}
		}
	}
}

function SALR_ShowContextMenuItem(id) {
	var cacm = document.getElementById("contentAreaContextMenu");
	var mopt = document.getElementById("salastread-context-menu");
	var moptsep = document.getElementById("salastread-context-menuseparator");

	cacm.removeChild(mopt);
	cacm.removeChild(moptsep);

	if(persistObject.getPreference('contextMenuOnBottom') ) {
		cacm.appendChild(moptsep);
		cacm.appendChild(mopt);
	} else {
		cacm.insertBefore(moptsep, cacm.firstChild);
		cacm.insertBefore(mopt, moptsep);
	}

	document.getElementById(id).style.display = "-moz-box";
	mopt.style.display = "-moz-box";
	moptsep.style.display = "-moz-box";
}

function SALR_HideContextMenuItems() {
	document.getElementById("salastread-context-menu").style.display = "none";
	document.getElementById("salastread-context-menuseparator").style.display = "none";
	var pu = document.getElementById("salastread-context-menupopup");
	for (var i=0; i < pu.childNodes.length; i++) {
		pu.childNodes[i].style.display = "none";
		pu.childNodes[i].data = "";
	}
}

function SALR_ContextMenuShowing(e)
{
	if(e.originalTarget == document.getElementById("contentAreaContextMenu"))
	{
		SALR_HideContextMenuItems();
		try {
			var doc = document.getElementById("content").mCurrentBrowser.contentDocument;
			if(doc.__salastread_processed == true) {
				SALR_ContextVis_IgnoreThisThread(doc);
				SALR_ContextVis_StarThisThread(doc);
			}
		} catch (e) {}
	}
}

function SALR_ContextVis_IgnoreThisThread(doc) {
	var target = gContextMenu.target;
	var threadid = null;
	while (target) {
		if (target.className) {
			var tidmatch = target.className.match(/salastread_thread_(\d+)/);
			if (tidmatch) {
				threadid = tidmatch[1];

				SALR_ShowContextMenuItem("salastread-context-ignorethread");
				document.getElementById("salastread-context-ignorethread").data = threadid;
				document.getElementById("salastread-context-ignorethread").lpdtvalue = target.lpdtvalue;
				document.getElementById("salastread-context-ignorethread").target = target;
				document.getElementById("salastread-context-ignorethread").label = "Ignore This Thread (" + threadid + ")";
			}
		}

		target = target.parentNode;
	}
}

function SALR_ContextVis_StarThisThread(doc) {
	var target = gContextMenu.target;
	var threadid = null;
	while (target) {
		if(target.className)
		{
			var tidmatch = target.className.match(/salastread_thread_(\d+)/);
			if (tidmatch) {
				threadid = tidmatch[1];
				SALR_ShowContextMenuItem("salastread-context-starthread");
				document.getElementById("salastread-context-starthread").data = threadid;
				document.getElementById("salastread-context-starthread").lpdtvalue = target.lpdtvalue;
				document.getElementById("salastread-context-starthread").target = target;

				document.getElementById("salastread-context-starthread").label = (persistObject.isThreadStarred(threadid) ? 'Unstar' : 'Star') + " This Thread (" + threadid + ")";
			}
		}
		target = target.parentNode;
	}
}

function SALR_StarThread()
{
	var threadid = document.getElementById("salastread-context-starthread").data;
	var lpdtvalue = document.getElementById("salastread-context-starthread").lpdtvalue;
	var target = document.getElementById("salastread-context-starthread").target;
	if (threadid)
	{
		var starStatus = persistObject.isThreadStarred(threadid);
		persistObject.toggleThreadStar(threadid);

		if (target.ownerDocument.location.href.search(/showthread.php/i) == -1)
		{
			target.ownerDocument.location = target.ownerDocument.location;
		}
		else
		{
			var startext = starStatus ? "unstarred" : "starred";
			alert("This thread is now " + startext + ".");
		}
	}
}

function SALR_IgnoreThread()
{
	var threadid = document.getElementById("salastread-context-ignorethread").data;
	var lpdtvalue = document.getElementById("salastread-context-ignorethread").lpdtvalue;
	var target = document.getElementById("salastread-context-ignorethread").target;
	if (threadid)
	{
		if (confirm("Are you sure you want to ignore thread #"+threadid+"?"))
		{
			var ignoreStatus = persistObject.isThreadIgnored(threadid);
			persistObject.toggleThreadIgnore(threadid);
			if (target.ownerDocument.location.href.search(/showthread.php/i) == -1)
			{
				target.parentNode.removeChild(target);
			}
		}
	}
}

function showChangelogWindow() {
	openDialog("chrome://salastread/content/newfeatures/newfeatures.xul", "SALR_newfeatures", "chrome,centerscreen,dialog=no");
}


// This code gets called every page load as part of Firefox's extension process
try
{
	persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
		.createInstance(Components.interfaces.nsISupports);
	persistObject = persistObject.wrappedJSObject;
	if (!persistObject)
	{
		throw "Failed to create persistObject.";
	}

	// This should get changed to something better eventually
	var isWindows = (navigator.platform.indexOf("Win")!=-1);
	persistObject.ProfileInit(isWindows);

	if (persistObject._starterr)
	{
		throw "SALR Startup Error";
	}

	setInterval(SALR_TimerTick, 1000);
	setInterval(function(){SALR_SyncTick(false, false);}, 60 * 1000);
	setTimeout(function(){SALR_SyncTick(false, false);}, 10);

	if (persistObject && persistObject.LastRunVersion != persistObject.SALRversion)
	{
		needToShowChangeLog = !persistObject.IsDevelopmentRelease;
		showErrors = persistObject.getPreference('suppressErrors');
		// Here we have to put special cases for specific dev build numbers that require the changelog dialog to appear
		var buildNum = parseInt(persistObject.LastRunVersion.match(/^(\d+)\.(\d+)\.(\d+)/)[3], 10);
		if (buildNum <= 70531) { // Put the latest build number to need an SQL patch here
			needToShowChangeLog = true;
		}
	}

	if (persistObject && persistObject._needToExpireThreads)
	{
		persistObject.expireThreads();
		persistObject._needToExpireThreads = false;
	}

	try
	{
		window.addEventListener('load', salastread_windowOnLoad, true);
		window.addEventListener('beforeunload', salastread_windowOnBeforeUnload, true);
		window.addEventListener('unload', salastread_windowOnUnload, true);
	}
	catch (e)
	{
		throw "SALR Startup Error";
	}
}
catch (e)
{
	alert("SALastRead init error: "+e);
	if (persistObject)
	{
		alert("persistObject._starterr =\n" + persistObject._starterr);
	}
}
