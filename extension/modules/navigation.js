/*

	Functions dealing with navigation (gesture + paginator)

*/

let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");
let {QuickQuoteHelper} = require("quickQuoteHelper");
let {Gestures} = require("gestures");

let Navigation = exports.Navigation = 
{
	/**
	 * Sets up navigation for a thread.
	 * @param {Element} doc        Document element of thread to set up navigation for.
	 * @param {boolean} singlePost Whether we're in single post view.
	 */
	setupThreadNavigation: function(doc, singlePost)
	{
		let pageList = PageUtils.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
		if (pageList[0])
		{
			if (pageList.length >  1)
			{
				pageList = pageList[pageList.length-1];
			}
			else
			{
				pageList = pageList[0];
			}
			if (pageList.childNodes.length > 1 && pageList.lastChild && pageList.lastChild.textContent) // Are there pages
			{
				var numPages = pageList.lastChild.textContent.match(/(\d+)/);
				var curPage = PageUtils.selectSingleNode(doc, pageList, "//OPTION[@selected='selected']");
				numPages = parseInt(numPages[1], 10);
				curPage = parseInt(curPage.textContent, 10);
			}
			else
			{
				numPages = 1;
				curPage = 1;
			}
		}

		doc.__SALR_curPage = curPage;
		doc.__SALR_maxPage = numPages;

		// Insert the thread paginator
		if (Prefs.getPref("enablePageNavigator") && !singlePost)
		{
			Navigation.addPagination(doc);
		}
		if (Prefs.getPref("gestureEnable"))
		{
			Gestures.addGestureListeners(doc);
		}
		if (Prefs.getPref('quickPostJump'))
		{
			doc.addEventListener('keypress', Navigation.quickPostJump, false);
		}
	},

	/**
	 * Adds the quick page jump paginator to a document.
	 * @param {Element} doc Document element to add paginator to.
	 */
	addPagination: function(doc)
	{
		let pages = Navigation.getPagesForDoc(doc);
		if (pages.total === 1)
			return;

		var navDiv = doc.createElement("div");
		navDiv.className = "salastread_pagenavigator";

		// Create first and previous page buttons
		let firstButton = {
			title: "Go to First Page",
			image: "chrome://salastread/skin/nav-firstpage.png",
			linkreq: pages.current !== 1,
			page: "1"
		};
		Navigation.addPaginatorButton(doc, navDiv, firstButton);

		let prevButton = {
			title: "Go to Previous Page",
			image: "chrome://salastread/skin/nav-prevpage.png",
			linkreq: pages.current !== 1,
			page: (pages.current - 1).toString(10)
		};
		Navigation.addPaginatorButton(doc, navDiv, prevButton);

		// Create select element
		Navigation.addPaginatorSelectBox(doc, pages, navDiv);

		// Create next and last page buttons
		let nextButton = {
			title: "Go to Next Page",
			image: "chrome://salastread/skin/nav-nextpage.png",
			linkreq: pages.current !== pages.total,
			page: (pages.current + 1).toString(10)
		};
		Navigation.addPaginatorButton(doc, navDiv, nextButton);

		let lastButton = {
			title: "Go to Last Page",
			image: "chrome://salastread/skin/nav-lastpage.png",
			linkreq: pages.current !== pages.total,
			page: (pages.total).toString(10)
		};
		Navigation.addPaginatorButton(doc, navDiv, lastButton);

		// Extra functionality in threads - Last Post button and bookmark star
		if (doc.location.pathname === "/showthread.php" )
		{
			Navigation.createPaginatorThreadButtons(doc, navDiv);
		}

		doc.body.appendChild(navDiv);
	},

	/**
	 * Attempts to determine the number of pages in a document.
	 * @param  {Element} doc Document element to check.
	 * @return {Object} Object containing total number of pages and current page.
	 */
	getPagesForDoc: function(doc)
	{
		let pageList = PageUtils.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
		pageList = pageList[pageList.length-1];
		// Check if there's only one page
		if (pageList.childNodes.length <= 1)
			return {'total': 1, 'current': 1};
		if (!pageList.lastChild || !pageList.lastChild.innerHTML)
			return {'total': 1, 'current': 1};
		let numPages = pageList.lastChild.innerHTML.match(/(\d+)/);
		let curPage = PageUtils.selectSingleNode(doc, pageList, ".//OPTION[@selected='selected']");
		return {'total': parseInt(numPages[1], 10), 'current': parseInt(curPage.innerHTML, 10)};
	},

	/**
	 * Creates a button and adds it to the paginator.
	 * @param {Element} doc        Document element to build in.
	 * @param {Element} target     Paginator div to add to.
	 * @param {Object}  buttonInfo Object with necessary button information:
	 *                             title:     Tooltip for button.
	 *                             image:     URL of image to use.
	 *                             linkreq:   Whether or not we add URL. (optional)
	 *                             page:      Page number to add URL for. (optional)
	 */
	addPaginatorButton: function(doc, target, buttonInfo)
	{
		if (!buttonInfo.image)
			return;
		let buttonImg = Navigation.createPaginatorButtonImg(doc, buttonInfo.title, buttonInfo.image);
		if (!buttonInfo.linkreq || !buttonInfo.page)
		{
			buttonImg.className = "disab";
			target.appendChild(buttonImg);
			return;
		}
		Navigation.addPaginatorButtonLink(doc, 
				this.editPageNumIntoURI(doc, "pagenumber=" + buttonInfo.page), 
				buttonImg, target);
	},

	/**
	 * Create a button image for a paginator button.
	 * @param  {Element} doc   Document element to build in.
	 * @param  {string}  title Title for the image.
	 * @param  {string}  src   Source URL for the image.
	 * @return {Element} Newly created image element.
	 */
	createPaginatorButtonImg: function(doc, title, src)
	{
		let newImg = doc.createElement("img");
		newImg.title = title;
		newImg.src = src;
		return newImg;
	},

	/**
	 * Creates a link around a button image and appends it to a paginator.
	 * @param {Element} doc    Document element to build in.
	 * @param {string}  href   Target for link.
	 * @param {Element} image  Image child to append.
	 * @param {Element} target Paginator div.
	 */
	addPaginatorButtonLink: function(doc, href, image, target)
	{
		let newButton = doc.createElement("a");
		newButton.href = href;
		newButton.appendChild(image);
		target.appendChild(newButton);
	},

	/**
	 * Create and append the paginator select box.
	 * @param {Element} doc    Document element to build in.
	 * @param {Object}  pages  Object containing total number of pages and current page.
	 * @param {Element} navDiv Paginator div.
	 */
	addPaginatorSelectBox: function(doc, pages, navDiv)
	{
		let pageSel = doc.createElement("select");
		pageSel.size = 1;
		for (let pp = 1; pp <= pages.total; pp++)
		{
			let topt = doc.createElement("option");
			topt.text=pp;
			topt.value = pp;
			if (pp === pages.current)
				topt.selected = true;
			pageSel.add(topt);
		}
		if (pages.current === 1 && !doc.baseURI.match(/pagenumber=(\d+)/))
		{
			pageSel.onchange = function() { doc.location = doc.baseURI + "&pagenumber="+this.value; };
		}
		else
		{
			pageSel.onchange = function() {
				if (doc.location.pathname === "/showthread.php")
				{
					let threadid = doc.evaluate("//DIV[contains(@class,'pages')]//A[contains(@href,'threadid=')]", doc, null, 9, null).singleNodeValue.href.match(/threadid=(\d+)/i)[1];
					let hasuserid = doc.baseURI.match(/userid=(\w+)/);
					let uidstring = (!hasuserid) ? '' : '&' + hasuserid[0];
					doc.location = doc.location.pathname+"?threadid="+threadid+"&pagenumber="+this.value+uidstring;
				}
				else
				{
					doc.location = doc.baseURI.replace(/pagenumber=(\d+)/, "pagenumber="+this.value);
				}
			};
		}
		navDiv.appendChild(pageSel);
	},

	/**
	 * Create the paginator thread buttons (bookmark + last post)
	 * @param {Element} doc    Document element to build thread buttons in.
	 * @param {Element} navDiv Paginator div element to create children for.
	 */
	createPaginatorThreadButtons: function(doc, navDiv)
	{
		if (Prefs.getPref("lastPostOnNavigator"))
		{
			let lastPostButtonImg = Navigation.createPaginatorButtonImg(doc, "Go to First Unread Post", 
				"chrome://salastread/skin/lastpost.png");
			Navigation.addPaginatorButtonLink(doc, 
				this.editPageNumIntoURI(doc, "goto=newpost"), 
				lastPostButtonImg, navDiv);
		}
		let hasAStar = PageUtils.selectSingleNode(doc, doc, "//img[contains(@class,'thread_bookmark')]");
		if (hasAStar)
		{
			let starButton = doc.createElement("img");
			starButton.src = "http://fi.somethingawful.com/images/buttons/button-bookmark.png";
			starButton.className = 'thread_bookmark';
			navDiv.appendChild(starButton);
		}
	},

	/**
	 * Helper function for addPagination()
	 * @param  {Element} doc        Document element to build thread buttons in.
	 * @param  {number}  newPageNum String to edit into URI.
	 * @return {string}  Edited URI.
	 */
	editPageNumIntoURI: function(doc, newPageNum)
	{
		if (doc.baseURI.search(/pagenumber=(\d+)/) > -1) // Is the pagenumber already in the uri?
		{
			let newURI = doc.baseURI;
			// If we're in showthread, remove the anchor since it's page specific
			if (doc.location.pathname === "/showthread.php")
			{
				newURI = newURI.replace(/#.*/, '');
			}
			return newURI.replace(/pagenumber=(\d+)/, newPageNum);
		}
		if (doc.baseURI.search('#') === -1) // No anchor, just add pagenumber to the end
		{
			return doc.baseURI + "&" + newPageNum;
		}
		if (doc.location.pathname === "/showthread.php") // In showthread, special handling
		{
			let threadid = PageUtils.getThreadId(doc);
			return doc.location.pathname + "?threadid=" + threadid + "&" + newPageNum;
		}
		// Has an anchor; not in showthread
		return doc.location.pathname + doc.location.search + "&" + newPageNum + doc.location.hash;
	},

	// Keyboard navigation
	quickPostJump: function quickPostJump(event)
	{
		if (!Navigation)
		{
			this.removeEventListener('keypress', quickPostJump, false);
			return;
		}
		let {Utils} = require("utils");
		let win = Utils.getRecentWindow();

		try {
			var ctrlKey = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
			if (ctrlKey)
			{
				// If any special keys were pressed, don't bother processing
				return;
			}
			var targ = event.target;
			var doc = targ.ownerDocument;
			var pressed = event.which;
			var postId, post, classChange, rescroll = false;

			// This should probably be edited to get the # of posts on the current page
			var maxPosts = Prefs.getPref('postsPerPage');
			if (maxPosts === 0)
				maxPosts = 40;

			if (doc.__SALR_curFocus)
			{
				postId = doc.__SALR_curFocus;
			}
			else if (doc.location.href.match(/\#pti(\d+)$/))
			{
				postId = doc.location.href.match(/\#pti(\d+)$/)[1];
			}
			else if (doc.location.href.match(/\#(post\d+)$/))
			{
				postId = doc.location.href.match(/\#(post\d+)$/)[1];
				postId = doc.getElementById(postId).getElementsByTagName('tr')[0].id;
				postId = postId.match(/pti(\d+)$/)[1];
			}
			else
			{
				postId = '1';
			}
			let fakeEvent;
			let forumid;
			let threadid;
			switch (String.fromCharCode(pressed).toLowerCase())
			{
				case Prefs.getPref('kb.reanchor'):
				case Prefs.getPref('kb.reanchorAlt'):
					doc.getElementById('pti' + postId).parentNode.parentNode.className += ' focused';
					post = doc.getElementById('pti' + postId);
					rescroll = true;
					break;
				case Prefs.getPref('kb.nextPage'):
				case Prefs.getPref('kb.nextPageAlt'):
					// Goto next page
					if (doc.__SALR_curPage < doc.__SALR_maxPage)
					{
						doc.location = Navigation.editPageNumIntoURI(doc, "pagenumber=" + (doc.__SALR_curPage + 1));
					}
					break;
				case Prefs.getPref('kb.nextPost'):
				case Prefs.getPref('kb.nextPostAlt'):
					// Goto next post
					postId++;
					if (postId <= maxPosts)
					{
						if (doc.getElementById('pti' + (postId - 1)))
						{
							classChange = doc.getElementById('pti' + (postId - 1)).parentNode.parentNode;
							classChange.className = classChange.className.replace(/(^|\s)focused($|\s)/, '');
							doc.getElementById('pti' + postId).parentNode.parentNode.className += ' focused';
						}
						post = doc.getElementById('pti' + postId);
						rescroll = true;
					}
					break;
				case Prefs.getPref('kb.prevPage'):
				case Prefs.getPref('kb.prevPageAlt'):
					// Goto previous page
					if (doc.__SALR_curPage > 1)
					{
						doc.location = Navigation.editPageNumIntoURI(doc, "pagenumber=" + (doc.__SALR_curPage - 1));
					}
					break;
				case Prefs.getPref('kb.prevPost'):
				case Prefs.getPref('kb.prevPostAlt'):
					// Goto previous post
					postId--;
					if (postId > 0)
					{
						if (doc.getElementById('pti' + (postId + 1)))
						{
							classChange = doc.getElementById('pti' + (postId + 1)).parentNode.parentNode;
							classChange.className = classChange.className.replace(/(^|\s)focused($|\s)/, '');
							doc.getElementById('pti' + postId).parentNode.parentNode.className += ' focused';
						}
						post = doc.getElementById('pti' + postId);
						rescroll = true;
					}
					break;
				case Prefs.getPref('kb.quickEdit'):
					// Activate Quick Edit Post
					fakeEvent = {};
					forumid = PageUtils.getForumId(doc);
					threadid = PageUtils.getThreadId(doc);
					fakeEvent.originalTarget = PageUtils.selectSingleNode(doc, doc.getElementById('pti' + postId).parentNode, 'TR/TD/UL/LI/IMG[@title="Quick Edit"]');
					QuickQuoteHelper.quickButtonClicked(forumid, threadid, fakeEvent);
					break;
				case Prefs.getPref('kb.quickReply'):
					// Activate Quick Reply to Thread
					fakeEvent = {};
					forumid = PageUtils.getForumId(doc);
					threadid = PageUtils.getThreadId(doc);
					fakeEvent.originalTarget = PageUtils.selectSingleNode(doc, doc, '//UL[contains(@class,"postbuttons")]//IMG[@title="Quick Reply"]');
					QuickQuoteHelper.quickButtonClicked(forumid, threadid, fakeEvent);
					break;
				case Prefs.getPref('kb.quickQuote'):
					// Activate Quick Quote Post
					fakeEvent = {};
					forumid = PageUtils.getForumId(doc);
					threadid = PageUtils.getThreadId(doc);
					fakeEvent.originalTarget = PageUtils.selectSingleNode(doc, doc.getElementById('pti' + postId).parentNode, 'TR/TD/UL/LI/IMG[@title="Quick Quote"]');
					QuickQuoteHelper.quickButtonClicked(forumid, threadid, fakeEvent);
					break;
			}
			if (rescroll)
			{
				post.scrollIntoView(true);
				doc.__SALR_curFocus = postId;
			}
		} catch(e) {win.dump('error:'+e);}
	},

};
