let {Prefs} = require("prefs");

let Gestures = exports.Gestures =
{
	addGestureListeners: function(doc)
	{
		doc.body.addEventListener('mousedown', Gestures.pageMouseDown, false);
		doc.body.addEventListener('mouseup', Gestures.pageMouseUp, false);
	},

	directionalNavigate: function(doc, dir)
	{
		var urlbase = doc.location.href.match(/.*\.somethingawful\.com/);
		var curPage = doc.__SALR_curPage;
		var perpage = "&perpage=" + Prefs.getPref("postsPerPage");
		var forumid = doc.location.href.match(/forumid=[0-9]+/);
		var posticon = doc.location.href.match(/posticon=[0-9]+/);
		let inOldSearch = (doc.location.pathname === '/f/search/result');
		let inNewSearch = (doc.location.pathname === '/query.php');
		var searchid = doc.location.href.match(/qid=[0-9]+/);

		if (!posticon)
			posticon = "&posticon=0";
		var sortfield = doc.location.href.match(/&sortfield=[a-zA-Z0-9]+/);
		if (!sortfield)
			sortfield = "&sortfield=lastpost";
		var sortorder = doc.location.href.match(/&sortorder=[a-z]+/);
		if (!sortorder)
			sortorder = "&sortorder=desc";
		var daysprune = doc.location.href.match(/&daysprune=[0-9]+/);
		if (!daysprune)
			daysprune = "&daysprune=30";
		var userfilter = doc.location.href.match(/&userid=[0-9]+/);
		if (!userfilter)
			userfilter = "";
		let threadid;

		if (dir === "top")
		{
			var threadForum = doc.__SALR_forumid;

			if ((curPage === 1 && !threadForum) || inNewSearch || inOldSearch)
			{
				doc.location = urlbase + "/index.php";
			}
			else
			{
				if (threadForum)
					doc.location = urlbase + "/forumdisplay.php?s=&forumid=" + threadForum;
				else
					doc.location = urlbase + "/forumdisplay.php?s=&" + forumid + posticon;
			}
		}
		else if (dir === "left")
		{
			if (curPage > 1)
			{
				threadid = doc.__SALR_threadid;
				if (threadid)
					doc.location = urlbase + "/showthread.php?s=&threadid=" + threadid + userfilter + perpage + "&pagenumber=" + (curPage - 1);
				else if (inNewSearch)
					doc.location = urlbase + "/query.php?action=results&" + searchid + "&page=" + (curPage - 1);
				else if (inOldSearch)
					doc.location = urlbase + "/f/search/result?" + searchid + "&p=" + (curPage - 1);
				else
					doc.location = urlbase + "/forumdisplay.php?" + forumid + daysprune + sortorder + sortfield + perpage + posticon + "&pagenumber=" + (curPage - 1);
			}
		}
		else if (dir === "right")
		{
			var maxPage = doc.__SALR_maxPage;
			if (maxPage > curPage)
			{
				threadid = doc.__SALR_threadid;
				if (threadid)
					doc.location = urlbase + "/showthread.php?s=&threadid=" + threadid + userfilter + perpage + "&pagenumber=" + (curPage + 1);
				else if (inNewSearch)
					doc.location = urlbase + "/query.php?action=results&" + searchid + "&page=" + (curPage + 1);
				else if (inOldSearch)
					doc.location = urlbase + "/f/search/result?" + searchid + "&p=" + (curPage + 1);
				else
					doc.location = urlbase + "/forumdisplay.php?" + forumid + daysprune + sortorder + sortfield + perpage + posticon + "&pagenumber=" + (curPage + 1);
			}
		}
	},

	pageMouseUp: function pageMouseUp(event)
	{
		var targ = event.target;
		var doc = targ.ownerDocument;
		// Clean up event listener
		if (Prefs === null)
		{
			doc.body.removeEventListener('mouseup', pageMouseUp, false);
			return;
		}
		if (targ && targ.SALR_isGestureElement === true)
		{
			doc.body.addEventListener('contextmenu', Gestures.gestureContextMenu, false);
			Gestures.directionalNavigate(doc, targ.SALR_dir);
		}

		var gn = doc.getElementById("salastread_gesturenavtop");
		if (gn)
		{
			var rx = 	function(dir)
						{
							var el = doc.getElementById("salastread_gesturenav"+dir);
							el.parentNode.removeChild(el);
						};

			rx("top");
			rx("left");
			rx("right");
			rx("bottom");
		}
	},

	gestureContextMenu: function(event)
	{
		var targ = event.target;
		var doc = targ.ownerDocument;
		doc.body.removeEventListener('contextmenu', Gestures.gestureContextMenu, false);
		if (event.preventDefault)
		{
			event.preventDefault();
		}
		return false;
	},

	pageMouseDown: function pageMouseDown(event)
	{
		var doc = event.target.ownerDocument;
		// Clean up event listener
		if (Prefs === null)
		{
			doc.body.removeEventListener('mousedown', pageMouseDown, false);
			return;
		}

		// Suppress gesture nav on embeds
		if (event.target.nodeName.toLowerCase() === 'embed')
			return;

		var gn = doc.getElementById("salastread_gesturenavtop");
		if (gn)
		{
			return;
		}
		if (event.button === Prefs.getPref('gestureButton') && Prefs.getPref('gestureEnable'))
		{
			var cx =	function(dir, ofsy, ofsx)
						{
							var el = doc.createElement("IMG");
								el.SALR_dir = ""+dir;
								el.id = "salastread_gesturenav"+dir;
								el.className = "salastread_gesturenav";
								el.src = "chrome://salastread/skin/gesturenav-" + dir + ".png";
								el.style.left = ((event.clientX - 36) + (77 * ofsx)) + "px";
								el.style.top = ((event.clientY - 36) + (77 * ofsy)) + "px";
							doc.body.appendChild(el);
							el.SALR_isGestureElement = true;

							if (dir==="left" && (doc.__SALR_curPage <= 1 || !doc.__SALR_curPage))
							{
								el.className += " disab";
							}
							else if (dir==="right" && (doc.__SALR_maxPage <= doc.__SALR_curPage || !doc.__SALR_maxPage))
							{
								el.className += " disab";
							}
						};
			cx("top", -1, 0);
			cx("left", 0, -1);
			cx("right", 0, 1);
			cx("bottom", 1, 0);
		}
	},

};
