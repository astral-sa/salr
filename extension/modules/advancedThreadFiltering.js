////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Advanced Thread Filtering Functions /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");

let AdvancedThreadFiltering = exports.AdvancedThreadFiltering =
{
	rebuildFilterBox: function(doc)
	{
		var filterDiv = doc.getElementById("filter");
		var toggleDiv = PageUtils.selectSingleNode(doc, filterDiv, "div[contains(@class, 'toggle_tags')]");
		var tagsDiv = PageUtils.selectSingleNode(doc, filterDiv, "div[contains(@class, 'thread_tags')]");
		var afObject, afObject2; // Temp object storage for things that really only get handled once

		if (toggleDiv && tagsDiv)
		{
			var afIgnoredIcons;
			//var afIgnoredKeywords;
			//var prefIgnoredPostIcons = Prefs.getPref("ignoredPostIcons");
			var prefIgnoredKeywords = Prefs.getPref("ignoredKeywords");

			toggleDiv.innerHTML = '';
			afObject = doc.createElement("b");
			afObject.textContent = "Advanced thread filtering";
			toggleDiv.appendChild(afObject);
			afObject = doc.createElement("div");
			afObject.id = "salr_filteredthreadcount";
			afObject.style.fontSize = "80%";
			afObject.style.fontWeight = "normal";
			afObject.style.marginLeft = "6px";
			afObject.appendChild(doc.createTextNode("(Currently ignoring "));
			afObject.appendChild(doc.createTextNode("0"));
			afObject.appendChild(doc.createTextNode(" threads.)"));
			toggleDiv.appendChild(afObject);

			var tagsHead = doc.createElement("div");
			tagsDiv.insertBefore(tagsHead,tagsDiv.firstChild);

			// Move the current non-advanced filtered icon to the top, if applicable
			var alreadyFiltering = doc.location.href.match(/posticon=(\d+)/i);
			if (alreadyFiltering && alreadyFiltering[1])
			{
				var filteredIcon = PageUtils.selectSingleNode(doc, tagsDiv, "A[contains(@href,'posticon=" + parseInt(alreadyFiltering[1]) + "')]");
				afObject2 = PageUtils.selectSingleNode(doc, tagsDiv, "DIV[contains(@class,'remove_tag')]/A");
				if (filteredIcon && afObject2)
				{
					tagsHead.appendChild(doc.createTextNode("Showing only this icon: ("));
					afObject = filteredIcon.cloneNode(true);
					afObject.firstChild.style.marginRight = '0px';
					afObject.firstChild.style.marginBottom = '-2px';
					afObject.href = afObject2.href;
					afObject.innerHTML += "&nbsp;Reset";
					afObject.style.fontSize = "75%";
					afObject.style.fontWeight = "bold";
					tagsHead.appendChild(afObject);
					tagsHead.appendChild(doc.createTextNode(")"));
					tagsHead.appendChild(doc.createElement("br"));
					tagsHead.appendChild(doc.createElement("br"));
				}
			}
			// Remove the "Remove filter" link since it's showing up all the time
			let removeTagsDiv = PageUtils.selectSingleNode(doc, tagsDiv, "DIV[contains(@class,'remove_tag')]");
			if (removeTagsDiv)
				removeTagsDiv.parentNode.removeChild(removeTagsDiv);

			// Add a message for when all the icons are ignored and hide it for now
			afObject = doc.createElement("div");
			afObject.id = "alliconsignored";
			afObject.appendChild(doc.createTextNode("You've ignored everything but shit posts, you cretin!"));
			afObject.style.fontWeight = "bold";
			PageUtils.toggleVisibility(afObject,true);
			tagsDiv.insertBefore(afObject,tagsHead.nextSibling);

			// Plug a bunch of stuff in after the main icon list
			afObject = doc.createElement("div");
			afObject.appendChild(doc.createTextNode("Ctrl click an icon to add to ignored list."));
			afObject.style.fontStyle = "italic";
			afObject.style.fontSize = "85%";
			tagsDiv.appendChild(afObject);
			tagsDiv.appendChild(doc.createElement("br"));

			// Now all the ignored icons
			tagsDiv.appendChild(doc.createTextNode("Ignored icons:"));
			tagsDiv.appendChild(doc.createElement("br"));
			afIgnoredIcons = doc.createElement("div");
			afIgnoredIcons.id = "ignoredicons";
			afObject = doc.createElement("div");
			afObject.id = "noiconsignored";
			afObject.appendChild(doc.createTextNode("None."));
			afObject.style.fontStyle = "italic";
			afObject.style.visibility = "visible";
			afObject.style.display = "inline";
			afIgnoredIcons.appendChild(afObject);
			tagsDiv.appendChild(afIgnoredIcons);
			tagsDiv.appendChild(doc.createElement("br"));

			// Now the ignored keywords
			tagsDiv.appendChild(doc.createTextNode("Ignored keywords:"));
			tagsDiv.appendChild(doc.createElement("br"));
			afObject = doc.createElement("input");
			afObject.id = "ignoredkeywords";
			afObject.type = "text";
			afObject.value = prefIgnoredKeywords;
			afObject.size = 75;
			tagsDiv.appendChild(afObject);
			tagsDiv.appendChild(doc.createTextNode(" "));
			afObject = doc.createElement("input");
			afObject.type = "button";
			afObject.value = "Save";
			afObject.addEventListener("click", AdvancedThreadFiltering.clickIgnoreKeywordSave, false);
			tagsDiv.appendChild(afObject);
			tagsDiv.appendChild(doc.createElement("br"));
			afObject = doc.createElement("div");
			afObject.appendChild(doc.createTextNode("Separate strings with a pipe \"|\" symbol. Too many strings may affect performance."));
			afObject.style.fontStyle = "italic";
			afObject.style.fontSize = "85%";
			tagsDiv.appendChild(afObject);
			tagsDiv.appendChild(doc.createElement("br"));

			// TODO: ability to ignore shitposts even though they dont have an icon id
			// TODO: remove all the icon stuff for when viewing the dumps but keep the rest, maybe add star# filtering for those
			// TODO: thread rating filtering
		}
	},

	// Event catcher for ignoring post icons
	clickToggleIgnoreIcon: function(event)
	{
		if (Prefs.getPref("advancedThreadFiltering"))
		{
			let targ = event.currentTarget;
			var doc = targ.ownerDocument;
			var filterDiv = doc.getElementById("filter");
			var tagsDiv = PageUtils.selectSingleNode(doc, filterDiv, "div[contains(@class, 'thread_tags')]");

			if (tagsDiv)
			{
				var afIgnoredIcons, afShowMe, afHideMe, afIgnoring;
				var iconToIgnore, iconToIgnoreId, iconIgnored;
				var afObject; // Temp object storage for things that really only get handled once
				var prefIgnoredPostIcons = Prefs.getPref("ignoredPostIcons");
				var prefIgnoredKeywords = Prefs.getPref("ignoredKeywords");
				var anyLeft, anyLeftIn, mirrorIcons, searchString, threadBeGone;
				var threadList, thread, threadIcon;

				afIgnoredIcons = doc.getElementById("ignoredicons");

				if (targ.parentNode == tagsDiv)
				{
					if (event.ctrlKey === false)
					{
						return; // Moving from the main icon list requires ctrl click
					}
					afIgnoring = true;
					afShowMe = "alliconsignored";
					afHideMe = "noiconsignored";
					anyLeftIn = tagsDiv;
					mirrorIcons = afIgnoredIcons;
				}
				else if (targ.parentNode.id == "ignoredicons")
				{
					afIgnoring = false;
					afShowMe = "noiconsignored";
					afHideMe = "alliconsignored";
					anyLeftIn = afIgnoredIcons;
					mirrorIcons = tagsDiv;
				}
				else
				{
					return;
				}

				iconToIgnore = targ.firstChild;
				iconToIgnoreId = parseInt(iconToIgnore.href.match(/posticon=(\d+)/i)[1]);
				iconIgnored = PageUtils.selectSingleNode(doc, mirrorIcons, "DIV/A[contains(@href,'posticon=" + iconToIgnoreId + "')]");

				searchString = "(^|\\s)" + iconToIgnoreId + ",";
				searchString = new RegExp(searchString , "gi");

				if (!afIgnoredIcons || !iconIgnored || (afIgnoring && prefIgnoredPostIcons.search(searchString) > -1))
				{
					// Something is amiss
					return;
				}

				event.stopPropagation();
				event.preventDefault();

				if (afIgnoring)
				{
					prefIgnoredPostIcons += iconToIgnoreId + ", ";
				}
				else
				{
					prefIgnoredPostIcons = prefIgnoredPostIcons.replace(searchString,"");
				}
				Prefs.setPref("ignoredPostIcons",prefIgnoredPostIcons);

				PageUtils.toggleVisibility(targ,true);
				afObject = doc.getElementById(afHideMe);
				if (afObject && afObject.style.visibility !== "hidden")
				{
					PageUtils.toggleVisibility(afObject,true);
				}

				PageUtils.toggleVisibility(iconIgnored.parentNode,true);
				afObject = doc.getElementById(afShowMe);
				anyLeft = PageUtils.selectSingleNode(doc, anyLeftIn, "DIV[contains(@style,'visibility: visible; display: inline;')]");
				if (!anyLeft && afObject && afObject.style.visibility === "hidden")
				{
					PageUtils.toggleVisibility(afObject,true);
				}

				// Cycle through the threads and actively update their visibility
				threadList = PageUtils.selectNodes(doc, doc, "//table[@id='forum']/tbody/tr");

				for (var i in threadList)
				{
					thread = threadList[i];
					threadIcon = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]//IMG");
					threadBeGone = false;
					if (threadIcon.src.search(/posticons\/(.*)/i) > -1)
					{
						var iconnum = threadIcon.src.match(/#(\d+)$/)[1];
						if (iconnum == iconToIgnoreId)
						{
							if (afIgnoring)
							{
								threadBeGone = true;
							}
						}
						else
						{
							continue;
						}
					}

					// No icon match or matched icon is being unignored, I could reveal it, but is it keyword-ignored?
					if (!threadBeGone && prefIgnoredKeywords && thread.style.visibility == "hidden")
					{
						var threadTitleLink = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/DIV/A[contains(@class, 'thread_title')]");
						if(!threadTitleLink)
						{
							threadTitleLink = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/A[contains(@class, 'thread_title')]");
						}
						var threadTitle = threadTitleLink.textContent;
						var keywordList = prefIgnoredKeywords.split("|");

						for (var j in keywordList)
						{
							let keywords = keywordList[j];
							if (!keywords)
							{
								continue;
							}
							searchString = new RegExp(keywords, "gi");

							if (threadTitle.search(searchString) > -1)
							{
								threadBeGone = true;
								break;
							}
						}
					}

					if (threadBeGone && thread.style.visibility != "hidden")
					{
						PageUtils.toggleVisibility(thread,false);
						AdvancedThreadFiltering.filteredThreadCount(doc,1);
					}
					else if (!threadBeGone && thread.style.visibility == "hidden")
					{
						PageUtils.toggleVisibility(thread,false);
						AdvancedThreadFiltering.filteredThreadCount(doc,-1);
					}
				}
			}
		}
	},

	// Event catcher for keyword ignoring input box
	clickIgnoreKeywordSave: function(event)
	{
		if (Prefs.getPref("advancedThreadFiltering"))
		{
			let targ = event.currentTarget;
			var doc = targ.ownerDocument;
			var afMain = doc.getElementById("filter");

			if (afMain)
			{
				var afObject; // Temp object storage for things that really only get handled once
				var prefIgnoredKeywords = Prefs.getPref("ignoredKeywords");
				var prefIgnoredPostIcons = Prefs.getPref("ignoredPostIcons");
				var threadList, thread, threadTitleLink, threadTitle, threadBeGone;
				var newKeywords, keywordList, keywords, searchString;

				afObject = doc.getElementById("ignoredkeywords");
				newKeywords = afObject.value;

				if (newKeywords == prefIgnoredKeywords)
				{
					return;
				}

				//	Todo: may need to strip certain chars like " or ' ?

			//	event.stopPropagation();
				event.preventDefault();

				Prefs.setPref("ignoredKeywords",newKeywords);

				// Cycle through the threads and actively update their visibility
				threadList = PageUtils.selectNodes(doc, doc, "//table[@id='forum']/tbody/tr");
				keywordList = newKeywords.split("|");

				for (var i in threadList)
				{
					thread = threadList[i];
					threadTitleLink = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/DIV/DIV/A[contains(@class, 'thread_title')]");
					if(!threadTitleLink)
					{
						threadTitleLink = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'title')]/A[contains(@class, 'thread_title')]");
					}
					threadTitle = threadTitleLink.textContent;
					threadBeGone = false;

					for (var j in keywordList)
					{
						keywords = keywordList[j];
						if (!keywords)
						{
							continue;
						}
						searchString = new RegExp(keywords, "gi");

						if (threadTitle.search(searchString) > -1)
						{
							threadBeGone = true;
							break;
						}
					}

					// No keyword match, I could reveal it, but is it icon-ignored?
					if (!threadBeGone && prefIgnoredPostIcons && thread.style.visibility == "hidden")
					{
						var threadIcon = PageUtils.selectSingleNode(doc, thread, "TD[contains(@class,'icon')]//IMG");

						if (threadIcon.src.search(/posticons\/(.*)/i) > -1)
						{
							var iconnum = threadIcon.src.match(/#(\d+)$/)[1];
							if (prefIgnoredPostIcons.search(iconnum) > -1)
							{
								threadBeGone = true;
							}
						}
					}

					if (threadBeGone && thread.style.visibility != "hidden")
					{
						PageUtils.toggleVisibility(thread,false);
						AdvancedThreadFiltering.filteredThreadCount(doc,1);
					}
					else if (!threadBeGone && thread.style.visibility == "hidden")
					{
						PageUtils.toggleVisibility(thread,false);
						AdvancedThreadFiltering.filteredThreadCount(doc,-1);
					}
				}
			}
		}
	},

	// To cut down on code elsewhere (for keeping track of the number of threads being filtered)
	filteredThreadCount: function(doc,amount)
	{
		var count = Prefs.getPref("filteredThreadCount");
		var afObject; // Temp object storage for things that really only get handled once

		afObject = doc.getElementById("salr_filteredthreadcount");

		if (!afObject)
			return;

		count += amount;
		afObject.childNodes[1].textContent = count;

		if (count <= 0 && afObject.style.visibility != "hidden")
		{
			PageUtils.toggleVisibility(afObject,true);
		}
		else if (afObject.style.visibility == "hidden")
		{
			PageUtils.toggleVisibility(afObject,true);
		}

		Prefs.setPref("filteredThreadCount",count);
	},

};
