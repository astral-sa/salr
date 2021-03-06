/**
 * @fileOverview Everything to do with SA menu/popup and Toolbar menu popup.
 */

let {DB} = require("db");
let {Prefs} = require("prefs");
//let {Notifications} = require("notifications");
let {Utils} = require("utils");

let Menus = exports.Menus = 
{
	init: function()
	{
		Utils.addFrameMessageListener("salastread:RebuildAllMenus", Menus.rebuildAllMenus);
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
	 * @return {Promise} A promise that will resolve when the forum menu building is done.
	 * @private
	 */
	_populateForumMenuFrom: function(nested_menus, target, pinnedForumNumbers, pinnedForumElements)
	{
		let doc = target.ownerDocument;
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
			//TODO: access keys
			Menus.addMenuItem(doc, target, {
				label: thisUtil.name,
				forumnum: thisUtil.id
			});
		}
		target.appendChild(doc.createElement("menuseparator"));

		// Next, see if we can add any forums - look for <forums> element in our XML
		// If we find it, pass that element to "populateForumMenuForumsFrom"
		var forums, foundforums = false;

		let myPromise = DB.GetForumListXMLDoc();
		myPromise = myPromise.then((forumsDoc) =>
		{
			let forumListXmlSrc = forumsDoc ? forumsDoc.documentElement : null;
			if (forumListXmlSrc) {
				for (var i = 0; i < forumListXmlSrc.childNodes.length; i++) {
					if (forumListXmlSrc.childNodes[i].nodeName === "forums")
						forums = forumListXmlSrc.childNodes[i];
				}
				if (forums)
					foundforums = Menus._populateForumMenuForumsFrom(nested_menus, target, forums, pinnedForumNumbers, pinnedForumElements,0);
			}
			if (!foundforums)
			{
				Utils.logToConsole("SALR Menu: Error loading forum list XML - No forums found in XML document.");
				return Promise.reject();
			}
		}, (error) =>
		{
			// Spit out an error message for troubleshooting.
			Utils.logToConsole("SALR Menu: Error loading forum list XML - " + error);
			// If we don't find any forums, create an instructional placeholder menu item
			let menuel = doc.createElement("menuitem");
			menuel.setAttribute("label", "Visit a forum or thread to reload list");
			menuel.setAttribute("forumnum", "home");
			target.appendChild(menuel);
			throw error;
		});
		return myPromise;
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
				var cssClass = "";
				for (let j = 1; j <= depth; j++)
				{
					cssClass += "sub";
					if (j !== depth)
						cssClass += "-";
				}

				//TODO: access keys
				Menus.addMenuItem(doc, target, {
					label: thisforum.getAttribute("name"),
					forumnum: thisforum.getAttribute("id"),
					class: (cssClass !== "") ? "lastread_menu_" + cssClass : ""
				});

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
	 * Builds the pinned forums and starred threads elements for the SA/toolbar menus.
	 * @param {Window} win                 Window to build in.
	 * @param {string} menuLoc             Whether we're building in menubar or toolbar.
	 * @param {Array}  pinnedForumNumbers  Array of pinned forum numbers to build.
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
		else
			return;

		let abovePinned = menupopup.getElementsByClassName("salr_sepabovepinned")[0];

		// Bail if the menu hasn't been created yet (toolbar)
		if (!abovePinned)
			return;

		// Clear out any old elements we might have
		while (abovePinned.nextSibling)
			menupopup.removeChild(abovePinned.nextSibling);

		abovePinned.hidden = (pinnedForumNumbers.length === 0 || pinnedForumElements.length === 0);

		for (var j = 0; j < pinnedForumElements.length || j < pinnedForumNumbers.length; j++)
		{
			Menus.addPinnedMenuItem(document, menupopup, pinnedForumNumbers[j], pinnedForumElements[j]);
		}

		if (Prefs.getPref('showMenuPinHelper'))
		{
			Menus.addMenuPinHelper(document, menupopup);
		}
	},

	/**
	 * Adds a pinned forum menu item to a menu popup.
	 * @param {Window}          document            Document to build in.
	 * @param {string}          menupopup           Popup to append to.
	 * @param {string}          pinnedForumNumber   Pinned forum numbers to add
	 * @param {Element|string}  pinnedForumElement  Pinned forum element to add:
	 *                                         Called from UI: XML <forum> element
	 *                                         Called from Prefs: string
	 */
	addPinnedMenuItem: function(document, menupopup, pinnedForumNumber, pinnedForumElement)
	{
		if (pinnedForumElement)
		{
			var thisforum = pinnedForumElement;
			let forumname = (typeof thisforum === "string") ? thisforum : thisforum.getAttribute("name");
			while (forumname.substring(0,1) === " ")
			{
				forumname = forumname.substring(1);
			}
			Menus.addMenuItem(document, menupopup, {
				label: forumname,
				forumnum: pinnedForumNumber,
				class: "lastread_menu_sub"
			});
		}
		else if (pinnedForumNumber === "sep")
		{
			menupopup.appendChild(document.createElement("menuseparator"));
		}
		else if (typeof(pinnedForumNumber) === "string" && pinnedForumNumber.substring(0, 4) === "URL[")
		{
			var umatch = pinnedForumNumber.match(/^URL\[(.*?)\]\[(.*?)\]$/);
			if (!umatch)
				return;
			Menus.addMenuItem(document, menupopup, {
				label: Utils.UnescapeMenuURL(umatch[1]),
				targeturl: Utils.UnescapeMenuURL(umatch[2]),
				class: "lastread_menu_sub"
			});
		}
		else if (pinnedForumNumber === "starred")
		{
			let salrMenu = Utils.createElementWithAttrs(document, 'menu', {
				label: "Starred Threads",
				image: "chrome://salastread/skin/star.png",
				class: "menu-iconic lastread_menu_starred"
			});

			var subpopup = document.createElement("menupopup");
			if (menupopup.id === "menupopup_SAforums")
				subpopup.id = "salr_starredthreadmenupopup";
			else if (menupopup.id === "salr-toolbar-popup")
				subpopup.id = "salr_tb_starredthreadmenupopup";

			salrMenu.appendChild(subpopup);
			menupopup.appendChild(salrMenu);
			subpopup.addEventListener("popupshowing", Menus.starredThreadMenuShowing, false);
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
		if (!menupopup)
			return;

		menupopup.className = (Prefs.getPref('useSAForumMenuBackground')) ? "lastread_menu" : "";

		while (menupopup.firstChild)
		{
			menupopup.removeChild(menupopup.firstChild);
		}

		Menus.addMenuItem(document, menupopup, {
			label: "Something Awful",
			image: "chrome://salastread/skin/sa.png",
			targeturl: "http://www.somethingawful.com",
			class: "menuitem-iconic lastread_menu_frontpage"
		});

		menupopup.appendChild(document.createElement("menuseparator"));

		let lsalrMenu = document.createElement("menuitem");
		lsalrMenu.setAttribute("label","Configure SALastRead...");
		lsalrMenu.addEventListener("command", function() { Utils.runConfig(); }, false);
		menupopup.appendChild(lsalrMenu);
		menupopup.appendChild(document.createElement("menuseparator"));

		var pinnedForumNumbers = [];
		var pinnedForumElements = [];
		let nested_menus = Prefs.getPref('nestSAForumMenu');
		if (nested_menus && Prefs.getPref('menuPinnedForums'))
			pinnedForumNumbers = Prefs.getPref('menuPinnedForums').split(",");

		let myPromise = Menus._populateForumMenuFrom(nested_menus,menupopup,pinnedForumNumbers,pinnedForumElements);
		myPromise.then((success) =>
		{
			let abovePinned = document.createElement("menuseparator");
			abovePinned.className = 'salr_sepabovepinned';
			abovePinned.hidden = true;
			menupopup.appendChild(abovePinned);

			// We only add pinned forums + any starred threads if nestSAForumMenu is true
			if (nested_menus && (pinnedForumElements.length > 0 || pinnedForumNumbers.length > 0))
			{
				Menus.buildPinnedForumMenuItems(win, menuLoc, pinnedForumNumbers, pinnedForumElements);
			}
		}, (error) =>
		{
			Utils.logToConsole("SALR Menu: Error building pinned items due to error loading forum list XML");
		});

		// Menu is more or less ready now; show it.
		if (menuLoc === "menubar")
			document.getElementById("salr-menu").style.display = "-moz-box";
	},

	/**
	 * Creates a menu item with forumnum or destination URL and appends it to a menu popup.
	 * @param {Element} doc       Document element to create in.
	 * @param {Element} menuPopup Popup to append to.
	 * @param {Object}  attrs     Attributes to set on the new menu item.
	 */
	addMenuItem: function(doc, menuPopup, attrs)
	{
		if (!doc || !menuPopup)
			return;
		let newMenuItem = Utils.createElementWithAttrs(doc, 'menuitem', attrs);
		newMenuItem.addEventListener("click", Menus.menuItemCommand, false);
		newMenuItem.addEventListener("command", Menus.menuItemCommand, false);
		menuPopup.appendChild(newMenuItem);
	},

	// Moved from preferences. Need to redo and make more efficient
	rebuildAllMenus: function()
	{
		Utils.forEachOpenWindow(function(win) {
			if (Prefs.getPref('showSAForumMenu'))
				Menus.buildForumMenu(win, 'menubar');
			Menus.buildForumMenu(win, 'toolbar');
		});
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
	 * Checks if the event target has a 'targeturl' attribute.
	 *     If it does, opens that URL. If not, decides whether and how
	 *     to open a forumid= link from an activated menu item.
	 * @param {Event} event The activating event
	 */
	menuItemCommand: function(event)
	{
		// Band-aid: Don't execute this function twice on a left click.
		if (event.type === "click" && event.button === 0)
			return;
		let el = event.originalTarget;

		let targeturl = el.getAttribute("targeturl");
		if (targeturl)
		{
			Menus.menuItemGoToURL(event,targeturl);
		}
		else
		{
			// uncomment to use older search instead:
	/*
			if (el.getAttribute("forumnum") == "search")
				Menus.menuItemGoToURL(event,"https://forums.somethingawful.com/f/search",target);
			else
	*/
				Menus.menuItemGoToURL(event,"https://forums.somethingawful.com/forumdisplay.php?s=&forumid="+el.getAttribute("forumnum"));
		}				
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
			Menus.menuItemGoToURL(event, "https://forums.somethingawful.com/showthread.php?threadid=" + threadid + "&goto=newpost");
		}
		catch(e)
		{
			Cu.reportError("SALR error: Couldn't open thread id: " + threadid);
		}
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
				let menuel = doc.createElement("menuitem");
					menuel.setAttribute("label", starred[id]);
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
	 * Adds Menu Pin helper to a popup.
	 * @param {Element} doc       Document element to create in.
	 * @param {Element} menupopup Popup to append pin helper to.
	 */
	addMenuPinHelper: function(doc, menupopup)
	{
		var ms = doc.createElement("menuseparator");
		ms.setAttribute("class", "salr_pinhelper_item");
		menupopup.appendChild(ms);

		let salrMenu = Utils.createElementWithAttrs(doc, 'menuitem', {
			label: "Learn how to pin forums to this menu...",
			image: "chrome://salastread/skin/eng101-16x16.png",
			class: "salr_pinhelper_item menuitem-iconic lastread_menu_sub"
		});
		salrMenu.addEventListener("command", Menus.launchPinHelper, false);

		// Until the user views the pin helper, each SA menu popup in each
		//     window will check if it needs to remove the pin helper
		menupopup.addEventListener("popupshowing", Menus.removeMenuPinHelper, false);
		menupopup.appendChild(salrMenu);
	},

	/**
	 * Removes Menu Pin helper from a popup.
	 * @param {Event} event The popupshowing event
	 */
	removeMenuPinHelper: function(event)
	{
		if (Prefs.getPref('showMenuPinHelper') === true)
			return;
		let menupopup = event.originalTarget;
		if (!menupopup)
			return;
		let pinhelperItems = menupopup.getElementsByClassName('salr_pinhelper_item');
		while(pinhelperItems.length > 0)
			menupopup.removeChild(pinhelperItems[0]);
	},

	launchPinHelper: function(event)
	{
		Prefs.setPref('showMenuPinHelper', false);
		let win = event.target.ownerDocument.defaultView;
		Utils.runConfig("menus");
		win.alert("You may return to the menu settings at any time by choosing \"Configure SALastRead...\" from the SA menu, by "+
	         "clicking the \"Configure SALR\" link in the header of any forum page, or through SALR's \"Options\" button on the Add-ons page.");
	},

};

Menus.init();
