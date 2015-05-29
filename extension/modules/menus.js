/**
 * @fileOverview Everything to do with SA and Toolbar menus.
 */

let {DB} = require("db");
let {Prefs} = require("prefs");
//let {Notifications} = require("notifications");
let {Utils} = require("utils");

let CustomizableUI = null;

let Menus = exports.Menus = 
{

	addToolbarButton: function(window)
	{
		try
		{
			CustomizableUI = Cu.import("resource:///modules/CustomizableUI.jsm", null).CustomizableUI;
			CustomizableUI.createWidget({
				id: "salr-toolbarbutton",
				type: "custom",
				defaultArea: CustomizableUI.AREA_NAVBAR,
				label: "SALR",
				tooltiptext: "Something Awful Last Read",
				onCommand: Menus.onTBCommand.bind(Menus),
				onBuild: function(aDocument)
				{
					let toolbarButton = aDocument.createElement("toolbarbutton");
					let props = 
					{
						id: "salr-toolbarbutton",
						label: "SALR",
						type: "menu",
						removable: "true",
						class: "toolbarbutton-1 chromeclass-toolbar-additional",
						tooltiptext: "Something Awful Last Read",
						oncommand: Menus.onTBCommand.bind(Menus),
						oncontextmenu: Menus.onTBContextMenu.bind(Menus),
					};
					for (let p in props)
					{
						if (props.hasOwnProperty(p))
							toolbarButton.setAttribute(p, props[p]);
					}
					toolbarButton.addEventListener("command", Menus.onTBCommand.bind(Menus), false);
					toolbarButton.addEventListener("contextmenu", Menus.onTBContextMenu.bind(Menus), false);
					let popup = aDocument.createElement("menupopup");
					popup.setAttribute("id", "salr-toolbar-popup");
					popup.addEventListener("popupshowing", Menus.onTBMenuShowing, false);
					toolbarButton.appendChild(popup);
					return toolbarButton;
				},
			});
			onShutdown.add(CustomizableUI.destroyWidget.bind(CustomizableUI, "salr-toolbarbutton"));
		}
		catch (ex)
		{
			let doc = window.document;
			let toolbox = doc.getElementById("navigator-toolbox");
			if (toolbox)
			{
				let button = doc.createElement("toolbarbutton");
				button.setAttribute("id", "salr-toolbarbutton");
				button.setAttribute("label", "SALR");
				button.setAttribute("type", "menu");
				button.setAttribute("removable", "true");
				button.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
				button.setAttribute("tooltiptext", "Something Awful Last Read");
				let icon = "chrome://salastread/skin/sa-24.png";
				button.style.listStyleImage = "url(" + icon + ")";
				button.addEventListener("command", Menus.onTBCommand.bind(Menus), false);
				button.addEventListener("contextmenu", Menus.onTBContextMenu.bind(Menus), false);
				toolbox.palette.appendChild(button);
				let popup = doc.createElement("menupopup");
				popup.setAttribute("id", "salr-toolbar-popup");
				popup.addEventListener("popupshowing", Menus.onTBMenuShowing, false);
				button.appendChild(popup);

				// move to saved toolbar position
				let toolbarId = Prefs.getPref("legacyToolbarId");
				let nextItemId = Prefs.getPref("legacyToolbarNextItemId");
				let toolbar = toolbarId && doc.getElementById(toolbarId);
				if (toolbar)
				{
					let nextItem = doc.getElementById(nextItemId);
				 	toolbar.insertItem("salr-toolbarbutton", nextItem &&
						 nextItem.parentNode.id == toolbarId &&
						 nextItem);
				}
				window.addEventListener("aftercustomization", Menus.afterLegacyCustomize.bind(Menus), false);
				onShutdown.add(function() {
					window.removeEventListener("aftercustomization", Menus.afterLegacyCustomize, false);
				});

			}
			onShutdown.add(function() { Menus.removeToolbarButton(window); });
		}
	},

	afterLegacyCustomize: function(e)
	{
		let toolbox = e.target;
		let button = toolbox.parentNode.querySelector("#salr-toolbarbutton");
		let toolbarId, nextItemId;
		if (button) {
			let parent = button.parentNode,
					nextItem = button.nextSibling;
			if (parent && parent.localName === "toolbar") {
				toolbarId = parent.id;
				nextItemId = nextItem && nextItem.id;
			}
		}
		Prefs.setPref("legacyToolbarId", toolbarId);
		Prefs.setPref("legacyToolbarNextItemId", nextItemId);
	},

	removeToolbarButton: function(window)
	{
//currently only called from legacy part
		let doc = window.document;
		let popup = doc.getElementById("salr-toolbar-popup");
		if (popup)
		{
			while (popup.firstChild)
				popup.removeChild(popup.firstChild);
			if (!CustomizableUI)
				popup.parentNode.removeChild(popup);
		}
		if (!CustomizableUI)
		{
			let button = doc.getElementById("salr-toolbarbutton");
			if (button)
				button.parentNode.removeChild(button);
		}
	},

	/**
	 * Checks toolbar icon visibility status for Australis.
	 * @return {boolean} Whether toolbar icon is visible.
	 */
	isToolbarIconVisible: function()
	{
		if (!CustomizableUI)
			return false;
		let placement = CustomizableUI.getPlacementOfWidget("salr-toolbarbutton");
		return !!placement;
	},

	onTBCommand: function(event)
	{
		if (event.target == this)
			Menus.onTBClick(event);
	},
	onTBClick: function(e)
	{
		// The main portion of the SALR button has been clicked.
		// Just open the context menu, for now.
		Menus.onTBContextMenu(e);
	},
	onTBContextMenu: function(e)
	{
		let tb = e.currentTarget;
		let popup = tb.firstChild;
		if (!popup || !popup.showPopup)
			return;
		e.preventDefault();
		popup.showPopup();
	},
	onTBMenuShowing: function(e)
	{
		// Build the menu if we need to.
		let doc = e.originalTarget.ownerDocument;
		let win = doc.defaultView;
		let menupopup = doc.getElementById("salr-toolbar-popup");
		if (menupopup && !menupopup.firstChild)
			Menus.buildForumMenu(win, 'toolbar');
	},

	/**
	 * Creates the 'SA' menu itself and its popup
	 * @param {Window} window to create in
	 * @return {Node}  reference to the created menupopup
	 */
	createSAMenuAndPopup: function(window)
	{
		let document = window.document;
		let iBefore = document.getElementById("tools-menu");
		if (!iBefore)
			iBefore = document.getElementById("main-menubar").lastChild;
		let salrMenu = document.createElement("menu");
		salrMenu.id = "salr-menu";
		salrMenu.setAttribute("label", "SA");
		salrMenu.setAttribute("accesskey", Prefs.getPref('menuAccessKey'));
		// We hide the menu until it's ready.
		salrMenu.style.display = "none";
		let menupopup = document.createElement("menupopup");
		menupopup.id = "menupopup_SAforums";
		menupopup.className = "lastread_menu";
		salrMenu.appendChild(menupopup);
		iBefore.parentNode.insertBefore(salrMenu, iBefore);
		return menupopup;
	},

	// Only called for menubar
	removeForumMenu: function(window)
	{
		let document = window.document;
		let menupopup = document.getElementById("menupopup_SAforums");
		if (menupopup !== null)
		{
			while (menupopup.firstChild)
				menupopup.removeChild(menupopup.firstChild);
			menupopup.parentNode.removeChild(menupopup);
		}
		let menu = document.getElementById("salr-menu");
		if (menu !== null)
			menu.parentNode.removeChild(menu);
	},

	/**
	 * Populates the SA menu with utility items and forums from stored forum list XML in DB module
	 * @param   {boolean} nested_menus        User preference for whether or not to nest the forums
	 * @param   {Node}    target              Menupopup to build forum menu entries in
	 * @param   {Array}   pinnedForumNumbers  Array of pinned forum numbers from user preferences
	 * @param   {Array}   pinnedForumElements Empty array to fill with pinned forum elements
	 * @private
	 */
	_populateForumMenuFrom: function(nested_menus, target, pinnedForumNumbers, pinnedForumElements)
	{
		let doc = target.ownerDocument;
		let forumsDoc = DB.forumListXml;
		let forumListXmlSrc = forumsDoc ? forumsDoc.documentElement : null;
		// First, add Utils menu items
		let menuUtils = [
			{name:"Private Messages",id:"pm"},
			{name:"User Control Panel",id:"cp"},
			{name:"Search Forums",id:"search"},
			{name:"Forums Home",id:"home"},
			{name:"Leper's Colony",id:"lc"}];

		for (let i = 0; i < menuUtils.length; i++)
		{
			let thisUtil = menuUtils[i];
			let menuel = doc.createElement("menuitem");
			menuel.setAttribute("label", thisUtil.name);
			menuel.setAttribute("forumnum", thisUtil.id);
			menuel.addEventListener("click", Menus.menuItemCommand, false);
			menuel.addEventListener("command", Menus.menuItemCommand, false);

			//TODO: access keys
			target.appendChild(menuel);
		}
		target.appendChild(doc.createElement("menuseparator"));

		// Next, see if we can add any forums - look for <forums> element in our XML
		// If we find it, pass that element to "populateForumMenuForumsFrom"
		var forums, foundforums = false;
		if (forumListXmlSrc) {
			for (var i = 0; i < forumListXmlSrc.childNodes.length; i++) {
				if (forumListXmlSrc.childNodes[i].nodeName === "forums")
					forums = forumListXmlSrc.childNodes[i];
			}
			if (forums)
				foundforums = Menus._populateForumMenuForumsFrom(nested_menus, target, forums, pinnedForumNumbers, pinnedForumElements,0);
		}
		// If we don't find it, create an instructional placeholder menu item
		if (!foundforums)
		{
			let menuel = doc.createElement("menuitem");
			menuel.setAttribute("label", "Visit a forum to reload list");
			menuel.setAttribute("forumnum", "home");

			target.appendChild(menuel);
		}
	},

	/**
	 * Walks through the given forum list XML building forum menu items
	 * and populating pinnedForumElements if applicable.
	 * @param   {boolean} nested_menus        User preference for whether or not to nest the forums
	 * @param   {Node}    target              Menupopup to build forum menu entries in
	 * @param   {Node}    src                 XML to walk through
	 * @param   {Array}   pinnedForumNumbers  Array of pinned forum numbers from user preferences
	 * @param   {Array}   pinnedForumElements Array to fill with pinned forum elements
	 * @private
	 */
	_populateForumMenuForumsFrom: function(nested_menus, target, src, pinnedForumNumbers, pinnedForumElements, depth)
	{
		let doc = target.ownerDocument;
		var first = true;
		var foundAnything = false;
		for (var i = 0; i < src.childNodes.length; i++)
		{
			var thisforum = src.childNodes[i];

			if (thisforum.nodeName === "cat")
			{
				foundAnything = true;
				if (!nested_menus)
				{
					if (!first)
						target.appendChild(doc.createElement("menuseparator"));
					else
						first = false;
					Menus._populateForumMenuForumsFrom(nested_menus,target,thisforum,pinnedForumNumbers,pinnedForumElements,depth+1);
				}
				else
				{
					var submenu = doc.createElement("menu");
					submenu.setAttribute("label", thisforum.getAttribute("name"));
					var submenupopup = doc.createElement("menupopup");
					if (Prefs.getPref('useSAForumMenuBackground'))
						submenupopup.setAttribute("class", "lastread_menu");

					submenu.appendChild(submenupopup);
					Menus._populateForumMenuForumsFrom(nested_menus,submenupopup,thisforum,pinnedForumNumbers,pinnedForumElements,depth+1);
					target.appendChild(submenu);
				}
			}
			else if (thisforum.nodeName === "forum")
			{
				foundAnything = true;
				var menuel = doc.createElement("menuitem");
				menuel.setAttribute("label", thisforum.getAttribute("name"));
				menuel.setAttribute("forumnum", thisforum.getAttribute("id"));
				menuel.addEventListener("click", Menus.menuItemCommand, false);
				menuel.addEventListener("command", Menus.menuItemCommand, false);

				var cssClass = "";
				for (let j = 1; j <= depth; j++)
				{
					cssClass += "sub";
					if (j !== depth)
						cssClass += "-";
				}

				if (cssClass !== "")
					menuel.setAttribute("class", "lastread_menu_" + cssClass);

				//TODO: access keys
				target.appendChild(menuel);
				if (nested_menus)
				{
					// Give our pinned elements array a reference to this forum
					var thisforumnum = thisforum.getAttribute("id");
					for (let j = 0; j < pinnedForumNumbers.length; j++)
					{
						if (pinnedForumNumbers[j] === thisforumnum)
							pinnedForumElements[j] = thisforum;
					}
				}
				Menus._populateForumMenuForumsFrom(nested_menus,target,thisforum,pinnedForumNumbers,pinnedForumElements,depth+1);
			}
		}
		return foundAnything;
	},

	/**
	 * Builds the pinned forums and starred threads elements for the SA/toolbar menus
	 * @param {Window} win                 Window to build in
	 * @param {string} menuLoc             Whether we're building in menubar or toolbar
	 * @param {Array}  pinnedForumNumbers  Array of pinned forum numbers to build
	 * @param {Array}  pinnedForumElements Array of pinned forum elements:
	 *                                         Called from UI: XML <forum> elements
	 *                                         Called from Prefs: strings
	 */
	buildPinnedForumMenuItems: function(win, menuLoc, pinnedForumNumbers, pinnedForumElements)
	{
		let document = win.document;
		let menupopup = null;
		if (menuLoc === "menubar")
			menupopup = document.getElementById("menupopup_SAforums");
		else if (menuLoc === "toolbar")
			menupopup = document.getElementById("salr-toolbar-popup");

		let abovePinned = menupopup.getElementsByClassName("salr_sepabovepinned")[0];

		// Bail if the menu hasn't been created yet (toolbar)
		if (!abovePinned)
			return;

		// Clear out any old elements we might have
		while (abovePinned.nextSibling)
			menupopup.removeChild(abovePinned.nextSibling);

		if (pinnedForumNumbers.length > 0)
			abovePinned.hidden = false;
		else
			abovePinned.hidden = true;

		for (var j = 0; j < pinnedForumElements.length || j < pinnedForumNumbers.length; j++)
		{
			if (pinnedForumElements[j])
			{
				var thisforum = pinnedForumElements[j];
				let salrMenu = document.createElement("menuitem");
				let forumname;
				if (typeof thisforum === "string")
					forumname = thisforum;
				else
					forumname = thisforum.getAttribute("name");
				while (forumname.substring(0,1) === " ")
				{
					forumname = forumname.substring(1);
				}
				salrMenu.setAttribute("label", forumname);
				salrMenu.setAttribute("forumnum", pinnedForumNumbers[j]);
				salrMenu.addEventListener("click", Menus.menuItemCommand, false);
				salrMenu.addEventListener("command", Menus.menuItemCommand, false);
				salrMenu.setAttribute("class", "lastread_menu_sub");
				menupopup.appendChild(salrMenu);
			}
			else if (pinnedForumNumbers[j] === "sep")
			{
				menupopup.appendChild(document.createElement("menuseparator"));
			}
			else if (typeof(pinnedForumNumbers[j]) === "string" && pinnedForumNumbers[j].substring(0, 4) === "URL[")
			{
				var umatch = pinnedForumNumbers[j].match(/^URL\[(.*?)\]\[(.*?)\]$/);
				if (umatch)
				{
					let salrMenu = document.createElement("menuitem");
					salrMenu.setAttribute("label", Utils.UnescapeMenuURL(umatch[1]));
					salrMenu.setAttribute("targeturl", Utils.UnescapeMenuURL(umatch[2]));
					salrMenu.addEventListener("click", Menus.menuItemCommandURL, false);
					salrMenu.addEventListener("command", Menus.menuItemCommandURL, false);
					salrMenu.setAttribute("class", "lastread_menu_sub");

					menupopup.appendChild(salrMenu);
				}
			}
			else if (pinnedForumNumbers[j] === "starred")
			{
				let salrMenu = document.createElement("menu");
				salrMenu.setAttribute("label", "Starred Threads");
				salrMenu.setAttribute("image", "chrome://salastread/skin/star.png");
				salrMenu.setAttribute("class", "menu-iconic lastread_menu_starred");

				var subpopup = document.createElement("menupopup");
				if (menuLoc === "menubar")
					subpopup.id = "salr_starredthreadmenupopup";
				else if (menuLoc === "toolbar")
					subpopup.id = "salr_tb_starredthreadmenupopup";

				salrMenu.appendChild(subpopup);
				menupopup.appendChild(salrMenu);
				subpopup.addEventListener("popupshowing", Menus.starredThreadMenuShowing, false);
			}
		}

		if (Prefs.getPref('showMenuPinHelper'))
		{
			var ms = document.createElement("menuseparator");
			ms.setAttribute("class", "salr_pinhelper_item");
			menupopup.appendChild(ms);

			let salrMenu = document.createElement("menuitem");
			salrMenu.setAttribute("label", "Learn how to pin forums to this menu...");
			salrMenu.setAttribute("image", "chrome://salastread/skin/eng101-16x16.png");
			salrMenu.addEventListener("command", Menus.launchPinHelper, false);
			salrMenu.setAttribute("class", "salr_pinhelper_item menuitem-iconic lastread_menu_sub");

			// Until the user views the pin helper, each SA menu popup in each
			//     window will check if it needs to remove the pin helper
			menupopup.addEventListener("popupshowing", Menus.removeMenuPinHelper, false);
			menupopup.appendChild(salrMenu);
		}
	},

	/**
	 * Builds a forum menu in a popup
	 * @param {Window} win     Window to build in
	 * @param {string} menuLoc Whether to build in the menubar or toolbar
	 */
	buildForumMenu: function(win, menuLoc)
	{
		let document = win.document;
		var menupopup = null;
		if (menuLoc === "menubar")
		{
			// Create the menu if we need to
			menupopup = document.getElementById("menupopup_SAforums");
			if (menupopup === null)
			{
				menupopup = Menus.createSAMenuAndPopup(win);
			}
		}
		else if (menuLoc === "toolbar")
		{
			menupopup = document.getElementById("salr-toolbar-popup");
		}

		if (menupopup)
		{
			if (Prefs.getPref('useSAForumMenuBackground'))
				menupopup.className = "lastread_menu";
			else
				menupopup.className = "";

			while (menupopup.firstChild)
			{
				menupopup.removeChild(menupopup.firstChild);
			}
			let nested_menus = Prefs.getPref('nestSAForumMenu');
			let salrMenu = document.createElement("menuitem");
			salrMenu.setAttribute("label","Something Awful");
			salrMenu.setAttribute("image", "chrome://salastread/skin/sa.png");
			salrMenu.setAttribute("targeturl", "http://www.somethingawful.com");
			salrMenu.addEventListener("click", Menus.menuItemCommandURL, false);
			salrMenu.addEventListener("command", Menus.menuItemCommandURL, false);
			salrMenu.setAttribute("class","menuitem-iconic lastread_menu_frontpage");
			menupopup.appendChild(salrMenu);
			menupopup.appendChild(document.createElement("menuseparator"));

			let lsalrMenu = document.createElement("menuitem");
			lsalrMenu.setAttribute("label","Configure SALastRead...");
			lsalrMenu.setAttribute("oncommand", "gSALR.runConfig();");
			menupopup.appendChild(lsalrMenu);
			menupopup.appendChild(document.createElement("menuseparator"));

			var pinnedForumNumbers = [];
			var pinnedForumElements = [];
			if (nested_menus && Prefs.getPref('menuPinnedForums'))
				pinnedForumNumbers = Prefs.getPref('menuPinnedForums').split(",");

			Menus._populateForumMenuFrom(nested_menus,menupopup,pinnedForumNumbers,pinnedForumElements);

			let abovePinned = document.createElement("menuseparator");
			abovePinned.className = 'salr_sepabovepinned';
			abovePinned.hidden = true;
			menupopup.appendChild(abovePinned);

			// We only add pinned forums + any starred threads if nestSAForumMenu is true
			if (nested_menus && (pinnedForumElements.length > 0 || pinnedForumNumbers.length > 0))
			{
				Menus.buildPinnedForumMenuItems(win, menuLoc, pinnedForumNumbers, pinnedForumElements);
			}
			// Menu is ready now; show it.
			if (menuLoc === "menubar")
				document.getElementById("salr-menu").style.display = "-moz-box";
		}
	},

	// Moved from preferences. Need to redo and make more efficient
	rebuildAllMenus: function()
	{
		// Get all browser windows
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]  
					   .getService(Components.interfaces.nsIWindowMediator);  
		var enumerator = wm.getEnumerator("navigator:browser");  
		while(enumerator.hasMoreElements()) {  

			var win = enumerator.getNext();
			// Rebuild SA menus in all browser windows
			Menus.buildForumMenu(win, 'menubar');
			Menus.buildForumMenu(win, 'toolbar');
		}
	},

	/** Iterates through windows to set or remove menu grenade BG class */
	toggleMenuGrenadeBackground: function()
	{
		let useGrenade = Prefs.getPref('useSAForumMenuBackground');
		Utils.forEachOpenWindow(function(window) {
			let doc = window.document;
			let menubar = doc.getElementById("menupopup_SAforums");
			if (menubar)
				menubar.className = useGrenade ? "lastread_menu" : "";
			let toolbar = doc.getElementById("salr-toolbar-popup");
			if (toolbar)
				toolbar.className = useGrenade ? "lastread_menu" : "";
		});
	},

	/**
	 * Decides whether and how to open a forumid= link from
	 *     an activated menu item.
	 * @param {Event} event The activating event
	 */
	menuItemCommand: function(event)
	{
		// Band-aid: Don't execute this function twice on a left click.
		if (event.type === "click" && event.button === 0)
			return;
		let el = event.originalTarget;
		// uncomment to use older search instead:
/*
		if (el.getAttribute("forumnum") == "search")
			Menus.menuItemGoToURL(event,"http://forums.somethingawful.com/f/search",target);
		else
*/
			Menus.menuItemGoToURL(event,"http://forums.somethingawful.com/forumdisplay.php?s=&forumid="+el.getAttribute("forumnum"));
		// Try to block Firefox's default right-click menu for this element, if applicable.
		if (event.cancelable)
			event.preventDefault();
	},

	/**
	 * Decides whether and how to open a starred thread from
	 *     an activated star menu item.
	 * @param {string} threadid Threadid to open
	 * @param {Event}  event    The activating event
	 */
	menuItemCommandGoToStarredThread: function(threadid, event)
	{
		// Band-aid: Don't execute this function twice on a left click.
		if (event.type === "click" && event.button === 0)
			return;
		// Try to block Firefox's default right-click menu for this element, if applicable.
		if (event.cancelable)
			event.preventDefault();

		if (event.ctrlKey === true && event.shiftKey === true)
		{
			let win = event.target.ownerDocument.defaultView;
			if (win.confirm("Do you want to unstar thread \"" + DB.getThreadTitle(threadid) + "\"?"))
			{
				DB.toggleThreadStar(threadid);
			}
			return;
		}

		try
		{
			Menus.menuItemGoToURL(event, "http://forums.somethingawful.com/showthread.php?threadid=" + threadid + "&goto=newpost");
		}
		catch(e)
		{
			Cu.reportError("SALR error: Couldn't open thread id: " + threadid);
		}
	},

	/**
	 * Checks if the event target has a 'targeturl' attribute.
	 *     If yes, goes to that URL.
	 * @param {Event}         event The activating event
	 */
	menuItemCommandURL: function(event)
	{
		// Band-aid: Don't execute this function twice on a left click.
		if (event.type === "click" && event.button === 0)
			return;
		let el = event.originalTarget;
		let targeturl = el.getAttribute("targeturl");
		if (targeturl)
			Menus.menuItemGoToURL(event,targeturl);
		// Try to block Firefox's default right-click menu for this element, if applicable.
		if (event.cancelable)
			event.preventDefault();
	},

	/**
	 * Opens a link from the SALR menu
	 * @param {Event}  event  The activating event
	 * @param {string} url    Link to open
	 */
	menuItemGoToURL: function(event, url)
	{
		var target = "none";
		if (event.type === "command")
		{
			target = "current";
		}
		else if (event.type === "click")
		{
			if (event.button === 0)
				target = "current";
			else if (event.button === 2 || event.button === 1)
				target = "newtab";
		}
		let rWin = Utils.getRecentWindow();
		if (target === "newtab")
		{
			rWin.gBrowser.addTab(url);
		}
		else if (target === "current")
		{
			if (rWin.gBrowser.selectedTab.pinned && !Prefs.getPref('ignoreAppTabs'))
				rWin.gBrowser.selectedTab = rWin.gBrowser.addTab(url);
			else
				rWin.gBrowser.loadURI(url);
		}
	},

	/**
	 * Event callback when a starred thread menu is being shown
	 * @param {Event} event The popupshowing event
	 */
	starredThreadMenuShowing: function(event)
	{
		let menupopup = event.originalTarget;
		let doc = menupopup.ownerDocument;

		while (menupopup.firstChild !== null) {
			menupopup.removeChild(menupopup.firstChild);
		}
		let starred = DB.starList;

		for (let id in starred)
		{
			if (starred.hasOwnProperty(id))
			{
				let title = starred[id];
				let menuel = doc.createElement("menuitem");
					menuel.setAttribute("label", title);
					menuel.addEventListener("click", Menus.menuItemCommandGoToStarredThread.bind(Menus, id), false);
					menuel.addEventListener("command", Menus.menuItemCommandGoToStarredThread.bind(Menus, id), false);
				menupopup.appendChild(menuel);
			}
		}

		if (!menupopup.firstChild)
		{
			let menuel = doc.createElement("menuitem");
				menuel.setAttribute("label", "You have no threads starred.");
				menuel.setAttribute("disabled", "true");
			menupopup.appendChild(menuel);
		}
	},

	/**
	 * Removes Menu Pin helper from a popup.
	 * @param {Event} event The popupshowing event
	 */
	removeMenuPinHelper: function(event)
	{
		if (Prefs.getPref('showMenuPinHelper') === false)
		{
			let menupopup = event.originalTarget;
			if (menupopup)
			{
				let pinhelperItems = menupopup.getElementsByClassName('salr_pinhelper_item');
				while(pinhelperItems.length > 0)
					menupopup.removeChild(pinhelperItems[0]);
			}
		}
	},

	launchPinHelper: function(event)
	{
		Prefs.setPref('showMenuPinHelper', false);
		let win = event.target.ownerDocument.defaultView;
		win.gSALR.runConfig("menu");
		win.alert("You may return to the menu settings at any time by choosing \"Configure SALastRead...\" from the SA menu, by "+
	         "clicking the \"Configure SALR\" link in the header of any forum page, or through SALR's \"Options\" button on the Add-ons page.");
	},

};
