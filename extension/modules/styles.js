/**
 * @fileoverview (Most) everything to do with styling
 */

let {DB} = require("db");
let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");
let {Utils} = require("utils");

let Styles = exports.Styles =
{
	_salrStyleURI: null,

	init: function()
	{
		// Load stylesheet service styles
		Styles.updateStyles();
		// ...and remove it upon shutdown
		onShutdown.add(function() { Styles.unloadStyles(); });
		Utils.addFrameMessageListener("salastread:GenDTLCSS", genDTLCSSWrapper);
		Utils.addFrameMessageListener("salastread:GenDSTCSS", genDSTCSSWrapper);
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
				CSSFile += 'tr.thread td { background-color:' +
							Prefs.getPref('unreadLightFYAD') +
							' !important; }\n' +
							'tr.thread td.icon, tr.thread td.author,' +
							'tr.thread td.views, tr.thread td.lastpost { background-color:' +
							Prefs.getPref('unreadDarkFYAD') +
							' !important; }\n' +
							'tr.thread.seen td { background-color:' +
							Prefs.getPref('readLightFYAD') +
							' !important; }\n' +
							'tr.thread.seen td.icon, tr.thread.seen td.author,' +
							'tr.thread.seen td.views, tr.thread.seen td.lastpost { background-color:' +
							Prefs.getPref('readDarkFYAD') +
							' !important; }\n' +
							'tr.thread.seen.newposts td { background-color:' +
							Prefs.getPref('readWithNewLightFYAD') +
							' !important; }\n' +
							'tr.thread.seen.newposts td.icon, tr.thread.seen.newposts td.author,' +
							'tr.thread.seen.newposts td.views, tr.thread.seen.newposts td.lastpost { background-color:' +
							Prefs.getPref('readWithNewDarkFYAD') +
							' !important; }\n' +
							'tr.thread.seen.newposts td.replies.salrPostedIn, tr.thread.category0 td.replies.salrPostedIn,' +
							'tr.thread.seen td.replies.salrPostedIn { background-color:' +
							Prefs.getPref('postedInThreadReFYAD') +
							' !important; }\n';
			}
			else if (PageUtils.inBYOB(forumid))
			{
				CSSFile += 'tr.thread td { background-color:' +
							Prefs.getPref('unreadLightBYOB') +
							' !important; }\n' +
							'tr.thread td.icon, tr.thread td.author,' +
							'tr.thread td.views, tr.thread td.lastpost { background-color:' +
							Prefs.getPref('unreadDarkBYOB') +
							' !important; }\n' +
							'tr.thread.seen td { background-color:' +
							Prefs.getPref('readLightBYOB') +
							' !important; }\n' +
							'tr.thread.seen td.icon, tr.thread.seen td.author,' +
							'tr.thread.seen td.views, tr.thread.seen td.lastpost { background-color:' +
							Prefs.getPref('readDarkBYOB') +
							' !important; }\n' +
							'tr.thread.seen.newposts td { background-color:' +
							Prefs.getPref('readWithNewLightBYOB') +
							' !important; }\n' +
							'tr.thread.seen.newposts td.icon, tr.thread.seen.newposts td.author,' +
							'tr.thread.seen.newposts td.views, tr.thread.seen.newposts td.lastpost { background-color:' +
							Prefs.getPref('readWithNewDarkBYOB') +
							' !important; }\n' +
							'tr.thread.seen.newposts td.replies.salrPostedIn, tr.thread.category0 td.replies.salrPostedIn,' +
							'tr.thread.seen td.replies.salrPostedIn { background-color:' +
							Prefs.getPref('postedInThreadReBYOB') +
							' !important; }\n';
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
				CSSFile += 'table.post tr.seen1 td { background-color:' +
							Prefs.getPref('seenPostDarkFYAD') +
							' !important; }\n' +
							'table.post tr.seen2 td { background-color:' +
							Prefs.getPref('seenPostLightFYAD') +
							' !important; }\n';
				// These are for unseen posts
				CSSFile += 'table.post tr.altcolor2 td { background-color:' +
							Prefs.getPref('unseenPostDarkFYAD') +
							'; }\n' +
							'table.post tr.altcolor1 td { background-color:' +
							Prefs.getPref('unseenPostLightFYAD') +
							'; }\n';
			}
			// BYOB colors
			else if (PageUtils.inBYOB(forumid))
			{
				// These are for in thread coloring
				CSSFile += 'table.post tr.seen1 td { background-color:' +
							Prefs.getPref('seenPostLightBYOB') +
							' !important; }\n' +
							'table.post tr.seen2 td { background-color:' +
							Prefs.getPref('seenPostDarkBYOB') +
							' !important; }\n';
				// These are for unseen posts
				CSSFile += 'table.post tr.altcolor2 td { background-color:' +
							Prefs.getPref('unseenPostLightBYOB') +
							' !important; }\n' +
							'table.post tr.altcolor1 td { background-color:' +
							Prefs.getPref('unseenPostDarkBYOB') +
							' !important; }\n';
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
			Styles.unloadStyles();
			let ioService = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
			Styles._salrStyleURI = ioService.newURI("data:text/css," + encodeURIComponent(Styles.generateSSSCSS()), null, null);
			Styles.loadStyles();
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
		if (Styles._salrStyleURI !== null)
		{
			let styleService = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                    .getService(Components.interfaces.nsIStyleSheetService);
			// Reregister if necessary
			if (!styleService.sheetRegistered(Styles._salrStyleURI, styleService.AUTHOR_SHEET))
				styleService.loadAndRegisterSheet(Styles._salrStyleURI, styleService.AUTHOR_SHEET);
		}
	},

	unloadStyles: function()
	{
		if (Styles._salrStyleURI !== null)
		{
			let styleService = Components.classes["@mozilla.org/content/style-sheet-service;1"]
						.getService(Components.interfaces.nsIStyleSheetService);
			if (styleService.sheetRegistered(Styles._salrStyleURI, styleService.AUTHOR_SHEET))
				styleService.unregisterSheet(Styles._salrStyleURI, styleService.AUTHOR_SHEET);
		}
	},

	generateSSSCSS: function()
	{
		let CSSFile = Styles.generateThreadListSSSCSS();

		CSSFile += Styles.generateShowThreadSSSCSS();

		if (Prefs.getPref('removeHeaderAndFooter'))
		{
			// global forum CSS
			CSSFile += '@-moz-document domain("forums.somethingawful.com") {\n';
			CSSFile += '#globalmenu, #nav_purchase, #navigation, #copyright { display:none; }\n';
			// end global forum CSS
			CSSFile += '}\n';
		}

		return CSSFile;
	},

	/**
	 * Generates thread list CSS for stylesheet service.
	 * @return {string} CSS applying to the thread list.
	 */
	generateThreadListSSSCSS: function()
	{
		let CSSFile = '@-moz-document url-prefix("http://forums.somethingawful.com/forumdisplay.php"),\n' +
						'url-prefix("https://forums.somethingawful.com/forumdisplay.php"),\n' +
						'url-prefix("http://forums.somethingawful.com/usercp.php"),\n' +
						'url-prefix("https://forums.somethingawful.com/usercp.php"),\n' +
						'url-prefix("http://forums.somethingawful.com/bookmarkthreads.php"),\n' +
						'url-prefix("https://forums.somethingawful.com/bookmarkthreads.php") {\n';

		// Shrink 'Pages:' list in thread list
		if (Prefs.getPref('shrinkThreadListTitlePages') === true)
		{
			// Reduce the padding too
			CSSFile += '.thread { height: 44px; min-height: 44px; }\n' +
						'#forum td.title, #forum td.title .title_pages a { font-size: 10px !important; }\n';
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
			CSSFile += '#forum tr.thread.seen td, #forum tr.thread.category0 td, ' +
						'#forum tr.thread.category1 td, #forum tr.thread.category2 td {' +
						'background-image:url("chrome://salastread/skin/gradient.png") !important;' +
						'background-repeat:repeat-x !important;' +
						'background-position:center left !important;}\n';
		}
		if (Prefs.getPref('showUnvisitIcon') && Prefs.getPref('showGoToLastIcon'))
		{
			CSSFile += 'td.title div.lastseen {' +
						'border:0 !important;' +
						'background:none !important;' +
						'}\n';
		}
		if (Prefs.getPref('showUnvisitIcon'))
		{
			CSSFile += '#forum td.title div.lastseen a.x {' +
						'background:url(' +
						Prefs.getPref("markThreadUnvisited") +
						') no-repeat center center !important;' +
						'text-indent:-9000px !important;' +
						'width:22px !important;' +
						'height:22px !important;' +
						'padding:0 !important;' +
						'}\n';
		}
		if (Prefs.getPref('showGoToLastIcon'))
		{
			CSSFile += '#forum td.title div.lastseen a.count {' +
						'background:url(' +
						Prefs.getPref("goToLastReadPost") +
						') no-repeat center center !important;' +
						'width:22px !important;' +
						'height:22px !important;' +
						'border:none !important;' +
						'padding:0 !important;' +
						'}\n' +
						'#forum td.title div.lastseen a:after { content: "" !important;}' +
						'#forum td.title div.lastseen a.count { min-width: 0px !important; }' +
						'#forum td.title div.lastseen a.count b { display: none !important; }\n';
		}
		else
		{
			CSSFile += '#forum td.title div.lastseen a.count b { display: !important; }';
			if (!Prefs.getPref("disableNewReCount"))
			{
				CSSFile += '#forum td.title div.lastseen a.count {' +
							'height:12px !important;' +
							'}\n';
			}
		}
		if (!Prefs.getPref('dontHighlightThreads'))
		{
// gray threads
			CSSFile += '#forum tr.thread td.title, #forum tr.thread td.star, #forum tr.thread td.replies, #forum tr.thread td.rating, #forum tr.thread td.button_remove { background-color:' +
						Prefs.getPref('unreadLight') +
						'; }\n' +
						'#forum tr.thread td.icon, #forum tr.thread td.icon2, #forum tr.thread td.author,' +
						'#forum tr.thread td.views, #forum tr.thread td.lastpost { background-color:' +
						Prefs.getPref('unreadDark') +
						'; }\n';

//bookmarks need a special entry if they're completely unread
//blue aka "tan"
			CSSFile += '#forum tr.thread.category0 td.title, #forum tr.thread.category0 td.star, #forum tr.thread.category0 td.replies, #forum tr.thread.category0 td.rating, #forum tr.thread.category0 td.button_remove { background-color:' +
						Prefs.getPref('readWithNewLight') +
						'; }\n'; //marking this and the below as important will cause blue-star threads with new posts to show up as blue instead of green
			CSSFile += '#forum tr.thread.category0 td.icon, #forum tr.thread.category0 td.icon2, #forum tr.thread.category0 td.author,' +
						'#forum tr.thread.category0 td.views, #forum tr.thread.category0 td.lastpost { background-color:' +
						Prefs.getPref('readWithNewDark') +
						'; }\n';

//tan completely unread - forums only
			CSSFile += '#content > #forum tr.thread.category0 td.title, #content > #forum tr.thread.category0 td.star, #content > #forum tr.thread.category0 td.replies, #content > #forum tr.thread.category0 td.rating, #content > #forum tr.thread.category0 td.button_remove { background-color:#ffe1b7; }\n';
			CSSFile += '#content > #forum tr.thread.category0 td.icon, #content > #forum tr.thread.category0 td.icon2, #content > #forum tr.thread.category0 td.author,' +
						'#content > #forum tr.thread.category0 td.views, #content > #forum tr.thread.category0 td.lastpost { background-color:#fad6a3; }\n';

//red completely unread
			CSSFile += '#forum tr.thread.category1 td.title, #forum tr.thread.category1 td.star, #forum tr.thread.category1 td.replies, #forum tr.thread.category1 td.rating, #forum tr.thread.category1 td.button_remove { background-color:#f2dcdc; }\n' +
						'#forum tr.thread.category1 td.icon, #forum tr.thread.category1 td.icon2, #forum tr.thread.category1 td.author,' +
						'#forum tr.thread.category1 td.views, #forum tr.thread.category1 td.lastpost { background-color:#e3cfcf; }\n';
//yellow completely unread
			CSSFile += '#forum tr.thread.category2 td.title, #forum tr.thread.category2 td.star, #forum tr.thread.category2 td.replies, #forum tr.thread.category2 td.rating, #forum tr.thread.category2 td.button_remove { background-color:#f2f2dc; }\n' +
						'#forum tr.thread.category2 td.icon, #forum tr.thread.category2 td.icon2, #forum tr.thread.category2 td.author,' +
						'#forum tr.thread.category2 td.views, #forum tr.thread.category2 td.lastpost { background-color:#e2e2cd; }\n';

// no new posts
			CSSFile += '#forum tr.thread.seen td.title, #forum tr.thread.seen td.star, #forum tr.thread.seen td.replies, #forum tr.thread.seen td.rating, #forum tr.thread.seen td.button_remove { background-color:' +
						Prefs.getPref('readLight') +
						'; }\n' +
						'#forum tr.thread.seen td.icon, #forum tr.thread.seen td.icon2, #forum tr.thread.seen td.author,' +
						'#forum tr.thread.seen td.views, #forum tr.thread.seen td.lastpost { background-color:' +
						Prefs.getPref('readDark') +
						'; }\n';

// tan with no new posts (forums only)
			CSSFile += '#content > #forum tr.thread.category0.seen td.title, #content > #forum tr.thread.category0.seen td.star, #content > #forum tr.thread.category0.seen td.replies, #content > #forum tr.thread.category0.seen td.rating, #content > #forum tr.thread.category0.seen td.button_remove { background-color:' +
						Prefs.getPref('readLight') +
						'; }\n' +
						'#content > #forum tr.thread.category0.seen td.icon, #content > #forum tr.thread.category0.seen td.icon2, #content > #forum tr.thread.category0.seen td.author,' +
						'#content > #forum tr.thread.category0.seen td.views, #content > #forum tr.thread.category0.seen td.lastpost { background-color:' +
						Prefs.getPref('readDark') +
						'; }\n';

// generic new posts
			CSSFile += '#forum tr.thread.seen.newposts td.title, #forum tr.thread.seen.newposts td.star, #forum tr.thread.seen.newposts td.replies, #forum tr.thread.seen.newposts td.rating, #forum tr.thread.seen.newposts td.button_remove { background-color:' +
						Prefs.getPref('readWithNewLight') +
						'; }\n' +
						'#forum tr.thread.seen.newposts td.icon, #forum tr.thread.seen.newposts td.icon2, #forum tr.thread.seen.newposts td.author,' +
						'#forum tr.thread.seen.newposts td.views, #forum tr.thread.seen.newposts td.lastpost { background-color:' +
						Prefs.getPref('readWithNewDark') +
						'; }\n';

//tan with new - so it doesn't get overwritten by generic new (forums only)
			CSSFile += '#content > #forum tr.thread.category0.newposts td.title, #content > #forum tr.thread.category0.newposts td.star, #content > #forum tr.thread.category0.newposts td.replies, #content > #forum tr.thread.category0.newposts td.rating, #content > #forum tr.thread.category0.newposts td.button_remove { background-color:#ffe1b7; }\n' +
						'#content > #forum tr.thread.category0.newposts td.icon, #content > #forum tr.thread.category0.newposts td.icon2, #content > #forum tr.thread.category0.newposts td.author,' +
						'#content > #forum tr.thread.category0.newposts td.views, #content > #forum tr.thread.category0.newposts td.lastpost { background-color:#fad6a3; }\n';
//red with new - so it doesn't get overwritten by generic new
			CSSFile += '#forum tr.thread.category1.newposts td.title, #forum tr.thread.category1.newposts td.star, #forum tr.thread.category1.newposts td.replies, #forum tr.thread.category1.newposts td.rating, #forum tr.thread.category1.newposts td.button_remove { background-color:#f2dcdc; }\n' +
						'#forum tr.thread.category1.newposts td.icon, #forum tr.thread.category1.newposts td.icon2, #forum tr.thread.category1.newposts td.author,' +
						'#forum tr.thread.category1.newposts td.views, #forum tr.thread.category1.newposts td.lastpost { background-color:#e3cfcf; }\n';
//yellow with new - so it doesn't get overwritten by generic new
			CSSFile += '#forum tr.thread.category2.newposts td.title, #forum tr.thread.category2.newposts td.star, #forum tr.thread.category2.newposts td.replies, #forum tr.thread.category2.newposts td.rating, #forum tr.thread.category2.newposts td.button_remove { background-color:#f2f2dc; }\n' +
						'#forum tr.thread.category2.newposts td.icon, #forum tr.thread.category2.newposts td.icon2, #forum tr.thread.category2.newposts td.author,' +
						'#forum tr.thread.category2.newposts td.views, #forum tr.thread.category2.newposts td.lastpost { background-color:#e2e2cd; }\n';

// I-replied col
			CSSFile += '#forum tr.thread.seen.newposts td.replies.salrPostedIn, #forum tr.thread.category0 td.replies.salrPostedIn,' +
						'#forum tr.thread.seen td.replies.salrPostedIn { background-color:' +
						Prefs.getPref('postedInThreadRe') +
						' !important; }\n';

		} // end thread highlighting

		// end threadlist CSS
		CSSFile += '}\n';
		return CSSFile;
	},

	/**
	 * Generates showthread CSS for stylesheet service.
	 * @return {string} CSS applying to threads.
	 */
	generateShowThreadSSSCSS: function()
	{
		let CSSFile = '@-moz-document url-prefix("http://forums.somethingawful.com/showthread.php"),\n' +
						'url-prefix("https://forums.somethingawful.com/showthread.php") {\n';

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
			if (quotedColor !== "0")
			{
				selfColor = quotedColor;
			}

			// Only apply this class if something is actually going to be colored
			if (selfColor !== "0")
			{
				CSSFile += 'div.bbc-block.userquoted {' +
							'background:' + selfColor + ' !important; }\n';
			}
		}
		if (Prefs.getPref('hideCustomTitles'))
		{
			CSSFile += 'dl.userinfo dd.title { display:none !important;}\n' +
						'dl.userinfo dd.title * { display:none !important; }\n';
		}
		else if (Prefs.getPref('resizeCustomTitleText'))
		{
			CSSFile += 'dl.userinfo dd.title { width: 159px !important; overflow: auto !important; line-height: normal !important; }\n';
			if (Prefs.getPref('resizeAllCustomTitleText'))
				CSSFile += 'dl.userinfo dd.title, dl.userinfo dd.title * { font-size:10px !important; }\n';
			else
				CSSFile += 'dl.userinfo dd.title *:not(.bbc-center) { font-size:10px !important; }\n';
		}
		if (Prefs.getPref('hideReportButtons'))
		{
			CSSFile += '#thread table.post.salrPostOfSelf ul.postbuttons a[href^=modalert] { display:none; }\n';
		}
		if (Prefs.getPref('superIgnore'))
		{
			CSSFile += 'table.salrPostIgnored { display:none !important; }\n';
		}
		if (Prefs.getPref('cancerTreatment') === 1)
		{
			// 0 - do nothing; 1 - restore opacity and add biohazard BG; 2 - hide post entirely
			CSSFile += 'td.postbody .cancerous { opacity: 1; }\n';
		}

		// Hide timgs in spoilers - workaround forum bug
		CSSFile += '.bbc-spoiler img.timg { visibility: hidden; }\n' +
					'.bbc-spoiler:hover img.timg { visibility: visible; }\n';

		// Remove forum-added blue border from our video embeds
		CSSFile += 'td.postbody iframe.salr_video { border: none; }\n';

		/* Style SALR search box.
			:-moz-placeholder - Firefox <19
			::-moz-placeholder - Firefox 19+ */
		CSSFile += 'div.threadbar.top { overflow: hidden; }\n' +
					'#salrsearchdiv { margin-left: 6px; line-height: 22px; }\n' +
					':-moz-placeholder { font-style: italic; color: #999; }\n' +
					'#salrsearchbox::-moz-placeholder { font-style: italic; color: #999; }\n';

		// Shrink posts by ignored users (and restore gradients)
		CSSFile += '#thread table.ignored dd.registered, #thread table.ignored dd.title, #thread table.ignored td.postdate, #thread table.ignored td.postlinks { display: none !important; }\n' +
					'#thread table.ignored tr.altcolor1 td.userinfo, #thread table.ignored tr.altcolor1 td.postbody { background-image: url("https://i.somethingawful.com/images/forum-bg-alt.png"); background-repeat: repeat-x; background-position: center bottom; padding-bottom: 6px;}\n' +
					'#thread table.ignored tr.altcolor2 td.userinfo, #thread table.ignored tr.altcolor2 td.postbody { background-image: url("https://i.somethingawful.com/images/forum-bg-alt.png"); background-repeat: repeat-x; background-position: center bottom; padding-bottom: 6px;}\n' +
					'#thread table.ignored tr.seen1 td.userinfo, #thread table.ignored tr.seen1 td.postbody { background-image: url("https://fi.somethingawful.com/images/forum-bg-alt-seen1.png"); background-repeat: repeat-x; background-position: center bottom; padding-bottom: 6px;}\n' +
					'#thread table.ignored tr.seen2 td.userinfo, #thread table.ignored tr.seen2 td.postbody { background-image: url("https://fi.somethingawful.com/images/forum-bg-alt-seen2.png"); background-repeat: repeat-x; background-position: center bottom; padding-bottom: 6px;}\n';

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
			CSSFile += 'table.post tr.seen1 td { background-color:' +
						Prefs.getPref('seenPostLight') +
						'; }\n' +
						'table.post tr.seen1 td.userinfo, table.post tr.seen1 td.postdate { background-color:' +
						Prefs.getPref('seenPostLight2') +
						'; }\n' +
						'table.post tr.seen2 td { background-color:' +
						Prefs.getPref('seenPostDark') +
						'; }\n' +
						'table.post tr.seen2 td.userinfo, table.post tr.seen2 td.postdate { background-color:' +
						Prefs.getPref('seenPostDark2') +
						'; }\n';

			// These are for unseen posts
			CSSFile += 'table.post tr.altcolor1 td { background-color:' +
						Prefs.getPref('unseenPostLight') +
						'; }\n' +
						'table.post tr.altcolor1 td.userinfo, table.post tr.altcolor1 td.postdate { background-color:' +
						Prefs.getPref('unseenPostLight2') +
						'; }\n' +
						'table.post tr.altcolor2 td { background-color:' +
						Prefs.getPref('unseenPostDark') +
						'; }\n' +
						'table.post tr.altcolor2 td.userinfo, table.post tr.altcolor2 td.postdate { background-color:' +
						Prefs.getPref('unseenPostDark2') +
						'; }\n';
		}

		// end showthread CSS
		CSSFile += '}\n';
		return CSSFile;
	},

};

function genDTLCSSWrapper(forumid)
{
	return Styles.generateDynamicThreadListCSS(forumid);
}

function genDSTCSSWrapper({forumid, threadid, singlePost})
{
	return Styles.generateDynamicShowThreadCSS(forumid, threadid, singlePost);
}

Styles.init();
