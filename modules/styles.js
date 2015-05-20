/*

	(Most) everything to do with styling
	May need to eventually break this up into chrome/content modules.

*/

let {DB} = require("db");
let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");

let Styles = exports.Styles =
{
	_salrStyleURI: null,

	init: function()
	{
		// Load stylesheet service styles
		Styles.updateStyles();
		// ...and remove it upon shutdown
		onShutdown.add(function() { Styles.unloadStyles(); });
	},
	// Return a string that contains thread list CSS instructions for our settings
	generateDynamicThreadListCSS: function(forumid)
	{
		var CSSFile = '';
		if (!Prefs.getPref('dontHighlightThreads'))
		{
			// Color types
			if (PageUtils.inFYAD(forumid))
			{
				CSSFile += 'tr.thread td { background-color:';
				CSSFile += Prefs.getPref('unreadLightFYAD');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread td.icon, tr.thread td.author,';
				CSSFile += 'tr.thread td.views, tr.thread td.lastpost { background-color:';
				CSSFile += Prefs.getPref('unreadDarkFYAD');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread.seen td { background-color:';
				CSSFile += Prefs.getPref('readLightFYAD');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread.seen td.icon, tr.thread.seen td.author,';
				CSSFile += 'tr.thread.seen td.views, tr.thread.seen td.lastpost { background-color:';
				CSSFile += Prefs.getPref('readDarkFYAD');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread.seen.newposts td { background-color:';
				CSSFile += Prefs.getPref('readWithNewLightFYAD');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread.seen.newposts td.icon, tr.thread.seen.newposts td.author,';
				CSSFile += 'tr.thread.seen.newposts td.views, tr.thread.seen.newposts td.lastpost { background-color:';
				CSSFile += Prefs.getPref('readWithNewDarkFYAD');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread.seen.newposts td.replies.salrPostedIn, tr.thread.category0 td.replies.salrPostedIn,';
				CSSFile += 'tr.thread.seen td.replies.salrPostedIn { background-color:';
				CSSFile += Prefs.getPref('postedInThreadReFYAD');
				CSSFile += ' !important; }\n';
			}
			else if (PageUtils.inBYOB(forumid))
			{
				CSSFile += 'tr.thread td { background-color:';
				CSSFile += Prefs.getPref('unreadLightBYOB');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread td.icon, tr.thread td.author,';
				CSSFile += 'tr.thread td.views, tr.thread td.lastpost { background-color:';
				CSSFile += Prefs.getPref('unreadDarkBYOB');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread.seen td { background-color:';
				CSSFile += Prefs.getPref('readLightBYOB');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread.seen td.icon, tr.thread.seen td.author,';
				CSSFile += 'tr.thread.seen td.views, tr.thread.seen td.lastpost { background-color:';
				CSSFile += Prefs.getPref('readDarkBYOB');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread.seen.newposts td { background-color:';
				CSSFile += Prefs.getPref('readWithNewLightBYOB');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread.seen.newposts td.icon, tr.thread.seen.newposts td.author,';
				CSSFile += 'tr.thread.seen.newposts td.views, tr.thread.seen.newposts td.lastpost { background-color:';
				CSSFile += Prefs.getPref('readWithNewDarkBYOB');
				CSSFile += ' !important; }\n';
				CSSFile += 'tr.thread.seen.newposts td.replies.salrPostedIn, tr.thread.category0 td.replies.salrPostedIn,';
				CSSFile += 'tr.thread.seen td.replies.salrPostedIn { background-color:';
				CSSFile += Prefs.getPref('postedInThreadReBYOB');
				CSSFile += ' !important; }\n';
			}
		}
		return CSSFile;
	},

	// Return a string that contains ShowThread CSS instructions for our settings
	generateDynamicShowThreadCSS: function(forumid, threadid, singlePost)
	{
		var CSSFile = '';
		// Op/Mods view
		if (DB.isThreadOPView(threadid) && !singlePost)
		{
			CSSFile += '#thread table.post:not(.salrPostByOP):not(.salrPostByMod):not(.salrPostByAdmin):not(.salrPostOfSelf) { display: none !important; }\n';
		}
		if (!Prefs.getPref('dontHighlightPosts'))
		{
			// "FYAD" colors
			if (PageUtils.inFYAD(forumid))
			{
				// These are for in thread coloring
				CSSFile += 'table.post tr.seen1 td { background-color:';
				CSSFile += Prefs.getPref('seenPostDarkFYAD');
				CSSFile += ' !important; }\n';
				CSSFile += 'table.post tr.seen2 td { background-color:';
				CSSFile += Prefs.getPref('seenPostLightFYAD');
				CSSFile += ' !important; }\n';
				// These are for unseen posts
				CSSFile += 'table.post tr.altcolor2 td { background-color:';
				CSSFile += Prefs.getPref('unseenPostDarkFYAD');
				CSSFile += '; }\n';
				CSSFile += 'table.post tr.altcolor1 td { background-color:';
				CSSFile += Prefs.getPref('unseenPostLightFYAD');
				CSSFile += '; }\n';
			}
			// BYOB colors
			else if (PageUtils.inBYOB(forumid))
			{
				// These are for in thread coloring
				CSSFile += 'table.post tr.seen1 td { background-color:';
				CSSFile += Prefs.getPref('seenPostLightBYOB');
				CSSFile += ' !important; }\n';
				CSSFile += 'table.post tr.seen2 td { background-color:';
				CSSFile += Prefs.getPref('seenPostDarkBYOB');
				CSSFile += ' !important; }\n';
				// These are for unseen posts
				CSSFile += 'table.post tr.altcolor2 td { background-color:';
				CSSFile += Prefs.getPref('unseenPostLightBYOB');
				CSSFile += ' !important; }\n';
				CSSFile += 'table.post tr.altcolor1 td { background-color:';
				CSSFile += Prefs.getPref('unseenPostDarkBYOB');
				CSSFile += ' !important; }\n';
			}
		}

		return CSSFile;
	},

	// Stylesheet service functions
	updateStyles: function()
	{
		// Called at first browser window load and after a change affecting our CSS
		try
		{
			this.unloadStyles();
			let ioService = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
			this._salrStyleURI = ioService.newURI("data:text/css," + encodeURIComponent(this.generateSSSCSS()), null, null);
			this.loadStyles();
		}
		catch(e)
		{
			if (!Prefs.getPref('suppressErrors'))
			{
				let promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                              .getService(Components.interfaces.nsIPromptService);
				promptService.alert(null, "SALR", "Stylesheet update error: " + e);
			}
		}
	},

	loadStyles: function()
	{
		if (this._salrStyleURI != null)
		{
			let styleService = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                    .getService(Components.interfaces.nsIStyleSheetService);
			// Reregister if necessary
			if (!styleService.sheetRegistered(this._salrStyleURI, styleService.AUTHOR_SHEET))
				styleService.loadAndRegisterSheet(this._salrStyleURI, styleService.AUTHOR_SHEET);
		}
	},

	unloadStyles: function()
	{
		if (this._salrStyleURI != null)
		{
			let styleService = Components.classes["@mozilla.org/content/style-sheet-service;1"]
						.getService(Components.interfaces.nsIStyleSheetService);
			if (styleService.sheetRegistered(this._salrStyleURI, styleService.AUTHOR_SHEET))
				styleService.unregisterSheet(this._salrStyleURI, styleService.AUTHOR_SHEET);
		}
	},

	generateSSSCSS: function()
	{
		// threadlist CSS
		let CSSFile = '@-moz-document url-prefix("http://forums.somethingawful.com/forumdisplay.php"),\n';
		CSSFile += 'url-prefix("http://forums.somethingawful.com/usercp.php"),\n';
		CSSFile += 'url-prefix("http://forums.somethingawful.com/bookmarkthreads.php") {\n';

		// Shrink 'Pages:' list in thread list
		if (Prefs.getPref('shrinkThreadListTitlePages') === true)
		{
			CSSFile += '.thread { height: 44px; min-height: 44px; }\n'; // Reduce the padding too
			CSSFile += '#forum td.title, #forum td.title .title_pages a { font-size: 10px !important; }\n';
		}

		// Allow usernames with multiple words to wrap in thread list
		if (Prefs.getPref('allowThreadListLastPostNameWrapping') === true)
			CSSFile += '#forum td.lastpost { white-space: inherit; }\n';

		// Show mod list if necessary
		if (Prefs.getPref('showForumModsList') === true)
		{
			CSSFile += '#mp_bar { visibility: visible; margin: 6px 0 6px 50px; }\n';
		}
		if (!Prefs.getPref('disableGradients'))
		{
			CSSFile += '#forum tr.thread.seen td, #forum tr.thread.category0 td, ';
			CSSFile += '#forum tr.thread.category1 td, #forum tr.thread.category2 td {';
			CSSFile += 'background-image:url("chrome://salastread/skin/gradient.png") !important;';
			CSSFile += 'background-repeat:repeat-x !important;';
			CSSFile += 'background-position:center left !important;}\n';
		}
		if (Prefs.getPref('showUnvisitIcon') && Prefs.getPref('showGoToLastIcon'))
		{
			CSSFile += 'td.title div.lastseen {';
			CSSFile += 'border:0 !important;';
			CSSFile += 'background:none !important;';
			CSSFile += '}\n';
		}
		if (Prefs.getPref('showUnvisitIcon'))
		{
			CSSFile += '#forum td.title div.lastseen a.x {';
			CSSFile += 'background:url(';
			CSSFile += Prefs.getPref("markThreadUnvisited");
			CSSFile += ') no-repeat center center !important;';
			CSSFile += 'text-indent:-9000px !important;';
			CSSFile += 'width:22px !important;';
			CSSFile += 'height:22px !important;';
			CSSFile += 'padding:0 !important;';
			CSSFile += '}\n';
		}
		if (Prefs.getPref('showGoToLastIcon'))
		{
			CSSFile += '#forum td.title div.lastseen a.count {';
			CSSFile += 'background:url(';
			CSSFile += Prefs.getPref("goToLastReadPost");
			CSSFile += ') no-repeat center center !important;';
			CSSFile += 'width:22px !important;';
			CSSFile += 'height:22px !important;';
			CSSFile += 'border:none !important;';
			CSSFile += 'padding:0 !important;';
			CSSFile += '}\n';
			CSSFile += '#forum td.title div.lastseen a:after { content: "" !important;}';
			CSSFile += '#forum td.title div.lastseen a.count { min-width: 0px !important; }';
			CSSFile += '#forum td.title div.lastseen a.count b { display: none !important; }';
		}
		else
		{
			CSSFile += '#forum td.title div.lastseen a.count b { display: !important; }';
			if (!Prefs.getPref("disableNewReCount"))
			{
				CSSFile += '#forum td.title div.lastseen a.count {';
				CSSFile += 'height:12px !important;';
				CSSFile += '}\n';
			}
		}
		if (!Prefs.getPref('dontHighlightThreads'))
		{
			CSSFile += '#forum tr.thread td.title, #forum tr.thread td.star, #forum tr.thread td.replies, #forum tr.thread td.rating, #forum tr.thread td.button_remove { background-color:';
			CSSFile += Prefs.getPref('unreadLight');
			CSSFile += '; }\n';
			CSSFile += '#forum tr.thread td.icon, #forum tr.thread td.icon2, #forum tr.thread td.author,';
			CSSFile += '#forum tr.thread td.views, #forum tr.thread td.lastpost { background-color:';
			CSSFile += Prefs.getPref('unreadDark');
			CSSFile += '; }\n';

//bookmarks need a special color if they're unread
//blue aka "tan"
			CSSFile += '#forum tr.thread.category0 td.title, #forum tr.thread.category0 td.star, #forum tr.thread.category0 td.replies, #forum tr.thread.category0 td.rating, #forum tr.thread.category0 td.button_remove { background-color:';
			CSSFile += Prefs.getPref('readWithNewLight');
			CSSFile += '; }\n'; //marking this and the below as important will cause blue-star threads with new posts to show up as blue instead of green
			CSSFile += '#forum tr.thread.category0 td.icon, #forum tr.thread.category0 td.icon2, #forum tr.thread.category0 td.author,';
			CSSFile += '#forum tr.thread.category0 td.views, #forum tr.thread.category0 td.lastpost { background-color:';
			CSSFile += Prefs.getPref('readWithNewDark');
			CSSFile += '; }\n';
//red for unread
			CSSFile += '#forum tr.thread.category1 td.title, #forum tr.thread.category1 td.star, #forum tr.thread.category1 td.replies, #forum tr.thread.category1 td.rating, #forum tr.thread.category1 td.button_remove { background-color:#f2dcdc; }\n';
			CSSFile += '#forum tr.thread.category1 td.icon, #forum tr.thread.category1 td.icon2, #forum tr.thread.category1 td.author,';
			CSSFile += '#forum tr.thread.category1 td.views, #forum tr.thread.category1 td.lastpost { background-color:#e3cfcf; }\n';
//yellow for unread
			CSSFile += '#forum tr.thread.category2 td.title, #forum tr.thread.category2 td.star, #forum tr.thread.category2 td.replies, #forum tr.thread.category2 td.rating, #forum tr.thread.category2 td.button_remove { background-color:#f2f2dc; }\n';
			CSSFile += '#forum tr.thread.category2 td.icon, #forum tr.thread.category2 td.icon2, #forum tr.thread.category2 td.author,';
			CSSFile += '#forum tr.thread.category2 td.views, #forum tr.thread.category2 td.lastpost { background-color:#e2e2cd; }\n';


			CSSFile += '#forum tr.thread.seen td.title, #forum tr.thread.seen td.star, #forum tr.thread.seen td.replies, #forum tr.thread.seen td.rating, #forum tr.thread.seen td.button_remove { background-color:';
			CSSFile += Prefs.getPref('readLight');
			CSSFile += '; }\n';
			CSSFile += '#forum tr.thread.seen td.icon, #forum tr.thread.seen td.icon2, #forum tr.thread.seen td.author,';
			CSSFile += '#forum tr.thread.seen td.views, #forum tr.thread.seen td.lastpost { background-color:';
			CSSFile += Prefs.getPref('readDark');
			CSSFile += '; }\n';
	
			CSSFile += '#forum tr.thread.seen.newposts td.title, #forum tr.thread.seen.newposts td.star, #forum tr.thread.seen.newposts td.replies, #forum tr.thread.seen.newposts td.rating, #forum tr.thread.seen.newposts td.button_remove { background-color:';
			CSSFile += Prefs.getPref('readWithNewLight');
			CSSFile += '; }\n';
			CSSFile += '#forum tr.thread.seen.newposts td.icon, #forum tr.thread.seen.newposts td.icon2, #forum tr.thread.seen.newposts td.author,';
			CSSFile += '#forum tr.thread.seen.newposts td.views, #forum tr.thread.seen.newposts td.lastpost { background-color:';
			CSSFile += Prefs.getPref('readWithNewDark');
			CSSFile += '; }\n';

//red with new
			CSSFile += '#forum tr.thread.category1.newposts td.title, #forum tr.thread.category1.newposts td.star, #forum tr.thread.category1.newposts td.replies, #forum tr.thread.category1.newposts td.rating, #forum tr.thread.category1.newposts td.button_remove { background-color:#f2dcdc; }\n';
			CSSFile += '#forum tr.thread.category1.newposts td.icon, #forum tr.thread.category1.newposts td.icon2, #forum tr.thread.category1.newposts td.author,';
			CSSFile += '#forum tr.thread.category1.newposts td.views, #forum tr.thread.category1.newposts td.lastpost { background-color:#e3cfcf; }\n';
//yellow with new
			CSSFile += '#forum tr.thread.category2.newposts td.title, #forum tr.thread.category2.newposts td.star, #forum tr.thread.category2.newposts td.replies, #forum tr.thread.category2.newposts td.rating, #forum tr.thread.category2.newposts td.button_remove { background-color:#f2f2dc; }\n';
			CSSFile += '#forum tr.thread.category2.newposts td.icon, #forum tr.thread.category2.newposts td.icon2, #forum tr.thread.category2.newposts td.author,';
			CSSFile += '#forum tr.thread.category2.newposts td.views, #forum tr.thread.category2.newposts td.lastpost { background-color:#e2e2cd; }\n';


			CSSFile += '#forum tr.thread.seen.newposts td.replies.salrPostedIn, #forum tr.thread.category0 td.replies.salrPostedIn,';
			CSSFile += '#forum tr.thread.seen td.replies.salrPostedIn { background-color:';
			CSSFile += Prefs.getPref('postedInThreadRe');
			CSSFile += ' !important; }\n';

		}
		// end threadlist CSS
		CSSFile += '}\n';


		// showthread CSS
		CSSFile += '@-moz-document url-prefix("http://forums.somethingawful.com/showthread.php") {\n';

		if (Prefs.getPref('highlightQuotes'))
		{
			var selfColor = 0;
			var quotedColor = Prefs.getPref("highlightQuotePost");
			var selfDetails = DB.isUsernameColored(Prefs.getPref('username'));

			// Someone may have given their own posts a custom background
			if (selfDetails)
			{
				selfColor = selfDetails.background;
			}

			// But override it if they have a custom color just for their quotes
			if (quotedColor != 0)
			{
				selfColor = quotedColor;
			}

			// Only apply this class if something is actually going to be colored
			if (selfColor != 0)
			{
				CSSFile += 'div.bbc-block.userquoted {';
				CSSFile += 'background:';
				CSSFile += selfColor;
				CSSFile += ' !important; }\n';
			}
		}
		if (Prefs.getPref('hideCustomTitles'))
		{
			CSSFile += 'dl.userinfo dd.title { display:none !important;}\n';
			CSSFile += 'dl.userinfo dd.title * { display:none !important; }\n';
		}
		else if (Prefs.getPref('resizeCustomTitleText'))
		{
			CSSFile += 'dl.userinfo dd.title { width: 159px !important;  overflow: auto !important;}\n';
			CSSFile += 'dl.userinfo dd.title * { font-size:10px !important; }\n';
		}
		if (Prefs.getPref('hideReportButtons'))
		{
			CSSFile += '#thread table.post.salrPostOfSelf ul.postbuttons a[href^=modalert] { display:none; }\n';
		}
		if (Prefs.getPref('superIgnore'))
		{
			CSSFile += 'table.salrPostIgnored { display:none !important; }\n';
		}
		if (Prefs.getPref('cancerTreatment') == 1)
		{
			// 0 - do nothing; 1 - restore opacity and add biohazard BG; 2 - hide post entirely
			CSSFile += 'td.postbody .cancerous { opacity: 1; }\n';
		}

		// Remove forum-added blue border from our video embeds
		CSSFile += 'td.postbody iframe.salr_video { border: none; }\n';

		// Shrink posts by ignored users (and restore gradients)
		CSSFile += '#thread table.ignored dd.registered, #thread table.ignored dd.title, #thread table.ignored td.postdate, #thread table.ignored td.postlinks { display: none !important; }\n';
		CSSFile += '#thread table.ignored tr.altcolor1 td.userinfo, #thread table.ignored tr.altcolor1 td.postbody { background-image: url("http://i.somethingawful.com/images/forum-bg-alt.png"); background-repeat: repeat-x; background-position: center bottom; padding-bottom: 6px;}\n';
		CSSFile += '#thread table.ignored tr.altcolor2 td.userinfo, #thread table.ignored tr.altcolor2 td.postbody { background-image: url("http://i.somethingawful.com/images/forum-bg-alt.png"); background-repeat: repeat-x; background-position: center bottom; padding-bottom: 6px;}\n';
		CSSFile += '#thread table.ignored tr.seen1 td.userinfo, #thread table.ignored tr.seen1 td.postbody { background-image: url("http://fi.somethingawful.com/images/forum-bg-alt-seen1.png"); background-repeat: repeat-x; background-position: center bottom; padding-bottom: 6px;}\n';
		CSSFile += '#thread table.ignored tr.seen2 td.userinfo, #thread table.ignored tr.seen2 td.postbody { background-image: url("http://fi.somethingawful.com/images/forum-bg-alt-seen2.png"); background-repeat: repeat-x; background-position: center bottom; padding-bottom: 6px;}\n';

		if (Prefs.getPref('quickPostJump'))
		{
			CSSFile += '#thread table.post.focused { outline: 2px dashed #c1c1c1 !important; }\n';
		}

		// Restore Arial font to date/time and postlinks
		CSSFile += '#thread table.post td.postdate, #thread table.post td.postlinks { font-family: Arial, Helvetica, sans-serif; }\n';
		// The margin between the ? and the postdate is a little wide. Slim it down:
		CSSFile += '#thread table.post td.postdate a:last-child { margin-right: 2px; }\n';

		if (!Prefs.getPref('dontHighlightPosts'))
		{
			// These are for in thread coloring
			CSSFile += 'table.post tr.seen1 td { background-color:';
			CSSFile += Prefs.getPref('seenPostLight');
			CSSFile += '; }\n';
			CSSFile += 'table.post tr.seen1 td.userinfo, table.post tr.seen1 td.postdate { background-color:';
			CSSFile += Prefs.getPref('seenPostLight2');
			CSSFile += '; }\n';

			CSSFile += 'table.post tr.seen2 td { background-color:';
			CSSFile += Prefs.getPref('seenPostDark');
			CSSFile += '; }\n';
			CSSFile += 'table.post tr.seen2 td.userinfo, table.post tr.seen2 td.postdate { background-color:';
			CSSFile += Prefs.getPref('seenPostDark2');
			CSSFile += '; }\n';

			// These are for unseen posts
			CSSFile += 'table.post tr.altcolor1 td { background-color:';
			CSSFile += Prefs.getPref('unseenPostLight');
			CSSFile += '; }\n';
			CSSFile += 'table.post tr.altcolor1 td.userinfo, table.post tr.altcolor1 td.postdate { background-color:';
			CSSFile += Prefs.getPref('unseenPostLight2');
			CSSFile += '; }\n';

			CSSFile += 'table.post tr.altcolor2 td { background-color:';
			CSSFile += Prefs.getPref('unseenPostDark');
			CSSFile += '; }\n';
			CSSFile += 'table.post tr.altcolor2 td.userinfo, table.post tr.altcolor2 td.postdate { background-color:';
			CSSFile += Prefs.getPref('unseenPostDark2');
			CSSFile += '; }\n';
		}

		// end showthread CSS
		CSSFile += '}\n';
		return CSSFile;
	},

};
Styles.init();
