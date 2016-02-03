// <script>
/*
var persistObject = Components.classes['@evercrest.com/salastread/persist-object;1']  
					.getService().wrappedJSObject;

function windowLoad()
{
	var currentVersion = persistObject.SALRversion;
	var currentBuild = parseInt(currentVersion.match(/^(\d+)\.(\d+)\.(\d+)/)[3], 10);
	var oldVersion = persistObject.LastRunVersion;
	persistObject.LastRunVersion = persistObject.SALRversion;
	if (oldVersion == "0.0.0") // This is their first time running it
	{
		return;
	}
	var oldBuild = parseInt(oldVersion.match(/^(\d+)\.(\d+)\.(\d+)/)[3], 10);
	if (oldVersion < "1.99") // When the 2.0 rewrite started
	{
		importOldData();
		return;
	}
}

function toggleMode() {
	var btnToggle = document.getElementById("btnToggle");
	var btnPrev = document.getElementById("btnPrev");
	var btnNext = document.getElementById("btnNext");
	showingChangelog = !showingChangelog;
	if (showingChangelog) {
		btnToggle.setAttribute("label", "Show Features");
		btnPrev.style.visibility = "hidden";
		btnNext.style.visibility = "hidden";
		document.getElementById("featureFrame").setAttribute("src",
			"chrome://salastread/content/changelog.html");
	} else {
		btnToggle.setAttribute("label", "Show Changelog");
		btnPrev.style.visibility = "visible";
		btnNext.style.visibility = "visible";
		changeFeature(0);
	}
}

function changeFeature(p) {
	var featureFrame = document.getElementById("featureFrame");
	var btnPrev = document.getElementById("btnPrev");
	var btnNext = document.getElementById("btnNext");

	currentPage += p;
	if (currentPage < 0)
		currentPage = 0;
	if (currentPage >= featurePages.length)
		currentPage = featurePages.length-1;
	var newurl = "chrome://salastread/content/newfeatures/" +
			 featurePages[currentPage].s;
	document.getElementById("featureFrame").setAttribute("src",newurl);
	if (currentPage==0)
		btnPrev.setAttribute("disabled", true);
	else
		btnPrev.removeAttribute("disabled");
	if (currentPage==featurePages.length-1)
		btnNext.setAttribute("disabled", true);
	else
		btnNext.removeAttribute("disabled");
}

// Convert the old 1.0 preferences and thread data to the new 2.0 format
function importOldData()
{
	try // Wrap the whole thing in a try/catch incase something messes up, it can still transfer the prefs
	{
		var olddata = persistObject.pref.getCharPref("salastread.string.persistStoragePath");
		if (olddata.indexOf("%profile%") == 0)
		{
			var file = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
      file.append(olddata.replace("%profile%",""));
		}
		else
		{
			var file = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(olddata);
		}
		if (file.exists() == false)
		{
			throw(olddata); // Drop out
		}
		var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
			.createInstance(Components.interfaces.nsIFileInputStream);
		istream.init(file, 0x01, 0444, 0);
		istream.QueryInterface(Components.interfaces.nsILineInputStream);
		var hasmore, processingdata = false, myattrs, i, adata, statement, timeArray, realLastviewdt;
		do
		{
			var line = {}, threaddata = [];
			hasmore = istream.readLine(line); // Returns false if it is the last line
			line = line.value;
			if (processingdata)
			{
				myattrs = line.split("&");
				for each (anAttr in myattrs)
				{
					adata = anAttr.split("=");
					if (adata.length==2)
					{
						threaddata[unescape(adata[0])] = unescape(adata[1]);
						if (unescape(adata[0])=="ignore") {
							if (thisValue=="true") {
								threaddata[unescape(adata[0])]="1";
							}
						}
					}
					else
					{
						threaddata[unescape(adata[0])] = null;
					}
				}
				if (threaddata['id'] != undefined)
				{
					if (threaddata['lastviewdt'] != undefined)
					{
						timeArray = threaddata['lastviewdt'].match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
						realLastviewdt = Math.floor(Date.UTC(Math.floor(timeArray[1]),Math.floor(timeArray[2]),Math.floor(timeArray[3]),Math.floor(timeArray[4]),Math.floor(timeArray[5]))/1000);
					}
					else
					{
						realLastviewdt = persistObject.currentTimeStamp;
					}
					statement = persistObject.database.createStatement("INSERT INTO `threaddata` (`id`, `lastpostid`, `lastviewdt`, `op`, `title`, `lastreplyct`, `posted`, `ignore`, `star`, `options`) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, null)");
					statement.bindInt32Parameter(0,threaddata['id']);
					statement.bindInt32Parameter(1,threaddata['lastpostid']);
					statement.bindStringParameter(2,realLastviewdt);
					statement.bindInt32Parameter(3,(threaddata['op']!=undefined?threaddata['op']:-1));
					statement.bindStringParameter(4,threaddata['title']);
					statement.bindInt32Parameter(5,(threaddata['lastreplyct']!=undefined?threaddata['lastreplyct']:0));
					statement.bindInt32Parameter(6,(threaddata['posted']==1?1:0));
					statement.bindInt32Parameter(7,(threaddata['ignore']==1?1:0));
					statement.bindInt32Parameter(8,(threaddata['star']==1?1:0));
					statement.execute();
				}
			}
			if (line == "SALR Thread Data v2")
			{
				processingdata = true;
			}
		} while (hasmore);
		istream.close();
	} catch(e) { dump(e); }
	try // These have to be in a try/catch so that it doesn't bomb out if one is missing for some reason
	{
		persistObject.setPreference("postedInThreadRe", persistObject.pref.getCharPref("salastread.color.postedInThreadRe"));
		persistObject.setPreference("readDark", persistObject.pref.getCharPref("salastread.color.readDark"));
		persistObject.setPreference("readLight", persistObject.pref.getCharPref("salastread.color.readLight"));
		persistObject.setPreference("readWithNewDark", persistObject.pref.getCharPref("salastread.color.readWithNewDark"));
		persistObject.setPreference("readWithNewLight", persistObject.pref.getCharPref("salastread.color.readWithNewLight"));
		persistObject.setPreference("seenPostDark", persistObject.pref.getCharPref("salastread.color.seenPostDark"));
		persistObject.setPreference("seenPostDarkFYAD", persistObject.pref.getCharPref("salastread.color.seenPostDarkFYAD"));
		persistObject.setPreference("seenPostLight", persistObject.pref.getCharPref("salastread.color.seenPostLight"));
		persistObject.setPreference("seenPostLightFYAD", persistObject.pref.getCharPref("salastread.color.seenPostLightFYAD"));
		persistObject.setPreference("unreadDark", persistObject.pref.getCharPref("salastread.color.unreadDark"));
		persistObject.setPreference("unreadDarkFYAD", persistObject.pref.getCharPref("salastread.color.unreadDarkFYAD"));
		persistObject.setPreference("unreadLight", persistObject.pref.getCharPref("salastread.color.unreadLight"));
		persistObject.setPreference("unreadLightFYAD", persistObject.pref.getCharPref("salastread.color.unreadLightFYAD"));
		persistObject.setPreference("unseenPostDark", persistObject.pref.getCharPref("salastread.color.unseenPostDark"));
		persistObject.setPreference("unseenPostDarkFYAD", persistObject.pref.getCharPref("salastread.color.unseenPostDarkFYAD"));
		persistObject.setPreference("unseenPostLight", persistObject.pref.getCharPref("salastread.color.unseenPostLight"));
		persistObject.setPreference("unseenPostLightFYAD", persistObject.pref.getCharPref("salastread.color.unseenPostLightFYAD"));
		persistObject.setPreference("expireMinAge", persistObject.pref.getIntPref("salastread.int.expireMinAge"));
		persistObject.setPreference("gestureButton", persistObject.pref.getIntPref("salastread.int.gestureButton"));
		persistObject.setPreference("timeSpentOnForums", persistObject.pref.getIntPref("salastread.int.timeSpentOnForums"));
		persistObject.setPreference("forumListStoragePath", persistObject.pref.getCharPref("salastread.string.forumListStoragePath"));
		persistObject.setPreference("menuPinnedForums", persistObject.pref.getCharPref("salastread.string.menuPinnedForums"));
		persistObject.setPreference("remoteSyncStorageUrl", persistObject.pref.getCharPref("salastread.string.remoteSyncStorageUrl"));
		persistObject.setPreference("alwaysShowGoToLastIcon", persistObject.pref.getBoolPref("salastread.toggle.alwaysShowGoToLastIcon"));
		persistObject.setPreference("contextMenuOnBottom", persistObject.pref.getBoolPref("salastread.toggle.contextMenuOnBottom"));
		persistObject.setPreference("convertTextToImage", persistObject.pref.getBoolPref("salastread.toggle.convertTextToImage"));
		persistObject.setPreference("disableGradients", persistObject.pref.getBoolPref("salastread.toggle.disableGradients"));
		persistObject.setPreference("dontHighlightPosts", persistObject.pref.getBoolPref("salastread.toggle.dontHighlightPosts"));
		persistObject.setPreference("dontHighlightThreads", persistObject.pref.getBoolPref("salastread.toggle.dontHighlightThreads"));
		persistObject.setPreference("dontTextToImageIfMayBeNws", persistObject.pref.getBoolPref("salastread.toggle.dontTextToImageIfMayBeNws"));
		persistObject.setPreference("dontTextToImageInSpoilers", persistObject.pref.getBoolPref("salastread.toggle.dontTextToImageInSpoilers"));
		persistObject.setPreference("enableDebugMarkup", persistObject.pref.getBoolPref("salastread.toggle.enableDebugMarkup"));
		persistObject.setPreference("enableForumNavigator", persistObject.pref.getBoolPref("salastread.toggle.enableForumNavigator"));
		persistObject.setPreference("enablePageNavigator", persistObject.pref.getBoolPref("salastread.toggle.enablePageNavigator"));
		persistObject.setPreference("gestureEnable", persistObject.pref.getBoolPref("salastread.toggle.gestureEnable"));
		persistObject.setPreference("hideOtherSAMenus", persistObject.pref.getBoolPref("salastread.toggle.hideOtherSAMenus"));
		persistObject.setPreference("insertPostLastMarkLink", persistObject.pref.getBoolPref("salastread.toggle.insertPostLastMarkLink"));
		persistObject.setPreference("insertPostTargetLink", persistObject.pref.getBoolPref("salastread.toggle.insertPostTargetLink"));
		persistObject.setPreference("nestSAForumMenu", persistObject.pref.getBoolPref("salastread.toggle.nestSAForumMenu"));
		persistObject.setPreference("highlightUsernames", persistObject.pref.getBoolPref("salastread.toggle.props"));
		persistObject.setPreference("quickQuoteDisableSmiliesDefault", persistObject.pref.getBoolPref("salastread.toggle.quickQuoteDisableSmiliesDefault"));
		persistObject.setPreference("quickQuoteImagesAsLinks", persistObject.pref.getBoolPref("salastread.toggle.quickQuoteImagesAsLinks"));
		persistObject.setPreference("quickQuoteLivePreview", persistObject.pref.getBoolPref("salastread.toggle.quickQuoteLivePreview"));
		persistObject.setPreference("quickQuoteSignatureDefault", persistObject.pref.getBoolPref("salastread.toggle.quickQuoteSignatureDefault"));
		persistObject.setPreference("quickQuoteSubscribeDefault", persistObject.pref.getBoolPref("salastread.toggle.quickQuoteSubscribeDefault"));
		persistObject.setPreference("quickQuoteSwapPostPreview", persistObject.pref.getBoolPref("salastread.toggle.quickQuoteSwapPostPreview"));
		persistObject.setPreference("reanchorThreadOnLoad", persistObject.pref.getBoolPref("salastread.toggle.reanchorThreadOnLoad"));
		persistObject.setPreference("removeHeaderAndFooter", persistObject.pref.getBoolPref("salastread.toggle.removeHeaderAndFooter"));
		persistObject.setPreference("removePageTitlePrefix", persistObject.pref.getBoolPref("salastread.toggle.removePageTitlePrefix"));
		persistObject.setPreference("resizeCustomTitleText", persistObject.pref.getBoolPref("salastread.toggle.resizeCustomTitleText"));
		persistObject.setPreference("scrollPostEnable", persistObject.pref.getBoolPref("salastread.toggle.scrollPostEnable"));
		persistObject.setPreference("showGoToLastIcon", persistObject.pref.getBoolPref("salastread.toggle.showGoToLastIcon"));
		persistObject.setPreference("showMenuPinHelper", persistObject.pref.getBoolPref("salastread.toggle.showMenuPinHelper"));
		persistObject.setPreference("showSAForumMenu", persistObject.pref.getBoolPref("salastread.toggle.showSAForumMenu"));
		persistObject.setPreference("showUnvisitIcon", persistObject.pref.getBoolPref("salastread.toggle.showUnvisitIcon"));
		persistObject.setPreference("shrinkTextToImages", persistObject.pref.getBoolPref("salastread.toggle.shrinkTextToImages"));
		persistObject.setPreference("suppressErrors", persistObject.pref.getBoolPref("salastread.toggle.suppressErrors"));
		persistObject.setPreference("thumbnailAllImages", persistObject.pref.getBoolPref("salastread.toggle.thumbnailAllImages"));
		persistObject.setPreference("thumbnailQuotedImagesInThreads", persistObject.pref.getBoolPref("salastread.toggle.thumbnailQuotedImagesInThreads"));
		persistObject.setPreference("useQuickQuote", persistObject.pref.getBoolPref("salastread.toggle.useQuickQuote"));
		persistObject.setPreference("useRemoteSyncStorage", persistObject.pref.getBoolPref("salastread.toggle.useRemoteSyncStorage"));
		persistObject.setPreference("useSAForumMenuBackground", persistObject.pref.getBoolPref("salastread.toggle.useSAForumMenuBackground"));
		persistObject.pref.deleteBranch("salastread.color.postedInThreadRe");
		persistObject.pref.deleteBranch("salastread.color.readDark");
		persistObject.pref.deleteBranch("salastread.color.readLight");
		persistObject.pref.deleteBranch("salastread.color.readWithNewDark");
		persistObject.pref.deleteBranch("salastread.color.readWithNewLight");
		persistObject.pref.deleteBranch("salastread.color.seenPostDark");
		persistObject.pref.deleteBranch("salastread.color.seenPostDarkFYAD");
		persistObject.pref.deleteBranch("salastread.color.seenPostLight");
		persistObject.pref.deleteBranch("salastread.color.seenPostLightFYAD");
		persistObject.pref.deleteBranch("salastread.color.unreadDark");
		persistObject.pref.deleteBranch("salastread.color.unreadDarkFYAD");
		persistObject.pref.deleteBranch("salastread.color.unreadLight");
		persistObject.pref.deleteBranch("salastread.color.unreadLightFYAD");
		persistObject.pref.deleteBranch("salastread.color.unseenPostDark");
		persistObject.pref.deleteBranch("salastread.color.unseenPostDarkFYAD");
		persistObject.pref.deleteBranch("salastread.color.unseenPostLight");
		persistObject.pref.deleteBranch("salastread.color.unseenPostLightFYAD");
		persistObject.pref.deleteBranch("salastread.int.expireMinAge");
		persistObject.pref.deleteBranch("salastread.int.gestureButton");
		persistObject.pref.deleteBranch("salastread.int.timeSpentOnForums");
		persistObject.pref.deleteBranch("salastread.string.forumListStoragePath");
		persistObject.pref.deleteBranch("salastread.string.menuPinnedForums");
		persistObject.pref.deleteBranch("salastread.string.persistStoragePath");
		persistObject.pref.deleteBranch("salastread.string.remoteSyncStorageUrl");
		persistObject.pref.deleteBranch("salastread.toggle.alwaysShowGoToLastIcon");
		persistObject.pref.deleteBranch("salastread.toggle.contextMenuOnBottom");
		persistObject.pref.deleteBranch("salastread.toggle.convertTextToImage");
		persistObject.pref.deleteBranch("salastread.toggle.disableGradients");
		persistObject.pref.deleteBranch("salastread.toggle.dontHighlightPosts");
		persistObject.pref.deleteBranch("salastread.toggle.dontHighlightThreads");
		persistObject.pref.deleteBranch("salastread.toggle.dontTextToImageIfMayBeNws");
		persistObject.pref.deleteBranch("salastread.toggle.dontTextToImageInSpoilers");
		persistObject.pref.deleteBranch("salastread.toggle.enableDebugMarkup");
		persistObject.pref.deleteBranch("salastread.toggle.enableForumNavigator");
		persistObject.pref.deleteBranch("salastread.toggle.enablePageNavigator");
		persistObject.pref.deleteBranch("salastread.toggle.gestureEnable");
		persistObject.pref.deleteBranch("salastread.toggle.hideOtherSAMenus");
		persistObject.pref.deleteBranch("salastread.toggle.insertPostLastMarkLink");
		persistObject.pref.deleteBranch("salastread.toggle.insertPostTargetLink");
		persistObject.pref.deleteBranch("salastread.toggle.nestSAForumMenu");
		persistObject.pref.deleteBranch("salastread.toggle.props");
		persistObject.pref.deleteBranch("salastread.toggle.quickQuoteDisableSmiliesDefault");
		persistObject.pref.deleteBranch("salastread.toggle.quickQuoteImagesAsLinks");
		persistObject.pref.deleteBranch("salastread.toggle.quickQuoteLivePreview");
		persistObject.pref.deleteBranch("salastread.toggle.quickQuoteSignatureDefault");
		persistObject.pref.deleteBranch("salastread.toggle.quickQuoteSubscribeDefault");
		persistObject.pref.deleteBranch("salastread.toggle.quickQuoteSwapPostPreview");
		persistObject.pref.deleteBranch("salastread.toggle.reanchorThreadOnLoad");
		persistObject.pref.deleteBranch("salastread.toggle.removeHeaderAndFooter");
		persistObject.pref.deleteBranch("salastread.toggle.removePageTitlePrefix");
		persistObject.pref.deleteBranch("salastread.toggle.resizeCustomTitleText");
		persistObject.pref.deleteBranch("salastread.toggle.scrollPostEnable");
		persistObject.pref.deleteBranch("salastread.toggle.showGoToLastIcon");
		persistObject.pref.deleteBranch("salastread.toggle.showMenuPinHelper");
		persistObject.pref.deleteBranch("salastread.toggle.showSAForumMenu");
		persistObject.pref.deleteBranch("salastread.toggle.showUnvisitIcon");
		persistObject.pref.deleteBranch("salastread.toggle.shrinkTextToImages");
		persistObject.pref.deleteBranch("salastread.toggle.suppressErrors");
		persistObject.pref.deleteBranch("salastread.toggle.thumbnailAllImages");
		persistObject.pref.deleteBranch("salastread.toggle.thumbnailQuotedImagesInThreads");
		persistObject.pref.deleteBranch("salastread.toggle.useQuickQuote");
		persistObject.pref.deleteBranch("salastread.toggle.useRemoteSyncStorage");
		persistObject.pref.deleteBranch("salastread.toggle.useSAForumMenuBackground");
		persistObject.pref.deleteBranch("salastread.url.markThreadUnvisited");
		persistObject.pref.deleteBranch("salastread.url.goToLastReadPost");
		persistObject.pref.deleteBranch("salastread.color.postedInThreadReHighlight");
		persistObject.pref.deleteBranch("salastread.color.readDarkHighlight");
		persistObject.pref.deleteBranch("salastread.color.readLightHighlight");
		persistObject.pref.deleteBranch("salastread.color.readWithNewDarkHighlight");
		persistObject.pref.deleteBranch("salastread.color.readWithNewLightHighlight");
		persistObject.pref.deleteBranch("salastread.color.unreadDarkHighlight");
		persistObject.pref.deleteBranch("salastread.color.unreadLightHighlight");
		persistObject.pref.deleteBranch("salastread.string.quoteIntroText");
		persistObject.pref.deleteBranch("salastread.string.threadIconOrder");
		persistObject.pref.deleteBranch("salastread.toggle.dontCheckKillSwitch");
		persistObject.pref.deleteBranch("salastread.toggle.hideSignature");
		persistObject.pref.deleteBranch("salastread.toggle.hideTitle");
		persistObject.pref.deleteBranch("salastread.toggle.removeTargetNewFromTorrentLinks");
	} catch(e) { dump(e); }
}
*/