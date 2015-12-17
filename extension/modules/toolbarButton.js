/**
 * @fileOverview Everything to do with the Toolbar button.
 */

let {Prefs} = require("prefs");
//let {Notifications} = require("notifications");
let {Utils} = require("utils");
let {Menus} = require("menus");

let CustomizableUI = null;

let ToolbarButton = exports.ToolbarButton = 
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
				onCommand: ToolbarButton.onTBCommand.bind(ToolbarButton),
				onBuild: function(aDocument)
				{
					let toolbarButton = Utils.createElementWithAttrs(aDocument, 'toolbarbutton', {
						id: "salr-toolbarbutton",
						label: "SALR",
						type: "menu",
						removable: "true",
						class: "toolbarbutton-1 chromeclass-toolbar-additional",
						tooltiptext: "Something Awful Last Read"
					});
					toolbarButton.addEventListener("command", ToolbarButton.onTBCommand.bind(ToolbarButton), false);
					toolbarButton.addEventListener("contextmenu", ToolbarButton.onTBContextMenu.bind(ToolbarButton), false);
					let popup = aDocument.createElement("menupopup");
					popup.setAttribute("id", "salr-toolbar-popup");
					popup.addEventListener("popupshowing", ToolbarButton.onTBMenuShowing, false);
					toolbarButton.appendChild(popup);
					return toolbarButton;
				},
			});
			onShutdown.add(CustomizableUI.destroyWidget.bind(CustomizableUI, "salr-toolbarbutton"));
		}
		catch (ex)
		{
			ToolbarButton.addLegacyToolbarButton(window);
		}
	},

	addLegacyToolbarButton: function(window)
	{
		let doc = window.document;
		let toolbox = doc.getElementById("navigator-toolbox");
		if (!toolbox)
			return;

		let button = Utils.createElementWithAttrs(doc, 'toolbarbutton', {
			id: "salr-toolbarbutton",
			label: "SALR",
			type: "menu",
			removable: "true",
			class: "toolbarbutton-1 chromeclass-toolbar-additional",
			tooltiptext: "Something Awful Last Read",
		});
		button.style.listStyleImage = 'url("chrome://salastread/skin/sa-24.png")';
		button.addEventListener("command", ToolbarButton.onTBCommand.bind(ToolbarButton), false);
		button.addEventListener("contextmenu", ToolbarButton.onTBContextMenu.bind(ToolbarButton), false);
		toolbox.palette.appendChild(button);
		let popup = doc.createElement("menupopup");
		popup.setAttribute("id", "salr-toolbar-popup");
		popup.addEventListener("popupshowing", ToolbarButton.onTBMenuShowing, false);
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
		window.addEventListener("aftercustomization", ToolbarButton.afterLegacyCustomize.bind(ToolbarButton), false);
		onShutdown.add(function() {
			window.removeEventListener("aftercustomization", ToolbarButton.afterLegacyCustomize.bind(ToolbarButton), false);
		});

		onShutdown.add(function() { ToolbarButton.removeToolbarButton(window); });
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
		if (!toolbarId)
			return;
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
	 * Unused.
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
			ToolbarButton.onTBClick(event);
	},
	onTBClick: function(e)
	{
		// The main portion of the SALR button has been clicked.
		// Just open the context menu, for now.
		ToolbarButton.onTBContextMenu(e);
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

};
