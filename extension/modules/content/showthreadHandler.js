/**
 * @fileOverview Handler for inside threads.
 */

let {DB} = require("./dbHelper");
let {Prefs} = require("./prefsHelper");
let {PageUtils} = require("../pageUtils");
let {MenuHelper} = require("./menuHelper");
let {ImgurHandler} = require("./imgurHandler");
let {VideoHandler} = require("./videoHandler");
let {Styles} = require("./stylesHelper");
let {Navigation} = require("./navigation");
let {QuickQuoteHelper} = require("./quickQuoteHelper");

let ShowThreadHandler = exports.ShowThreadHandler =
{
	/**
	 * Handler for thread loads.
	 * @param {HTMLDocument} doc Thread document.
	 */
	handleShowThread: function(doc)
	{
		// If there is no thread div then abort since something's not right
		if (doc.getElementById('thread') === null)
			return;

		let forumid = PageUtils.getForumId(doc);
		let threadid = PageUtils.getThreadId(doc);
		if (!forumid || !threadid)
			return;

		// Deprecated thread flags: inDump, inAskTell
		let threadFlags = {
			forumid: forumid,
			threadid: threadid,
			inFYAD: PageUtils.inFYAD(forumid),
			inGasChamber: PageUtils.inGasChamber(forumid),
			singlePost: (doc.location.search.search(/action=showpost/i) > -1),
			inArchives: PageUtils.isThreadInArchives(doc),
			threadClosed: PageUtils.isThreadClosed(doc),
			threadMarkedPostedIn: false,
		};

		// Bail if we're in FYAD and FYAD support has been turned off
		if (threadFlags.inFYAD && !Prefs.getPref("enableFYAD"))
		{
			return;
		}

		// Add our ShowThread CSS
		PageUtils.insertDynamicCSS(doc, Styles.generateDynamicShowThreadCSS(forumid, threadid, threadFlags.singlePost));

		// Grab the thread title
		// Note: Only updates if the thread's already in the cache.
		DB.setThreadTitle(threadid, PageUtils.getCleanPageTitle(doc));

		// Grab the go to dropdown
		if (!DB.doWeHaveForumList() && !threadFlags.singlePost)
		{
			MenuHelper.grabForumList(doc);
		}

		Navigation.setupTFNavigation(doc, threadFlags.singlePost);

		ShowThreadHandler.updatePostsPerPage(doc);

		// Super grouped pref calls to avoid message passing overhead
		let prefsToGet = [
			'username',
			'useQuickQuote',
			'insertPostTargetLink',
			'highlightUsernames',
			'hideCustomTitles',
			'modColor',
			'modBackground',
			'modSubText',
			'adminColor',
			'adminBackground',
			'adminSubText',
			'opColor',
			'opBackground',
			'opSubText',
			'superIgnore',
			'cancerTreatment',
			'highlightQuotes',
			'reanchorThreadOnLoad',
			// for convertSpecialLinks:
			'maxWidthOfConvertedImages',
			'maxHeightOfConvertedImages',
			'thumbnailAllImages',
			'convertTextToImage',
			'dontConvertReadImages',
			'unconvertReadImages',
			'dontTextToImageIfMayBeNws',
			'dontTextToImageInSpoilers',
			'dontConvertQuotedImages',
			'enableVideoEmbedder',
			// for processImages:
			'thumbnailAllImages',
			'convertGifToVideo',
			// for stopping gif videos:
			'dontAutoplayGifVideos'
		];
		let gotPrefs = Prefs.getMultiplePrefs(prefsToGet);

		gotPrefs.username = unescape(gotPrefs.username);
		threadFlags.insertPostTargetLink = gotPrefs.insertPostTargetLink && !threadFlags.inArchives;

		// Replace post/reply buttons if we need to.
		if (gotPrefs.useQuickQuote && !threadFlags.inGasChamber)
		{
			QuickQuoteHelper.makeQuickPostReplyButtons(doc, forumid, threadid, threadFlags.threadClosed);
		}

		ShowThreadHandler.addWhoPostedAndSearchBox(doc, forumid, threadid);

		// get the posts to iterate through
		var postlist = doc.querySelectorAll("#thread table.post");

		var curPostId, postIdLink, profileLink, postbody;
		var userNameBox;
		/** @type {string} */
		var posterName;
		/** @type {string} */
		var posterId;

		// Loop through each post
		for (let post of postlist)
		{
			if (post.className.indexOf("ignored") > -1)
			{
				// Need to pass a forumid to enable SALR features in the linked post
				let ignoredPostLink = PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postbody')]/a");
				if (ignoredPostLink)
				{
					ignoredPostLink.href = ignoredPostLink.href.replace(/#/, '&forumid=' + forumid + '#');
				}
				// Check if we need to super ignore
				if (gotPrefs.superIgnore)
				{
					// Temporarily reuse these variables since we'll be moving on shortly
					profileLink = PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postdate')]//a[contains(@href,'userid=')]");
					if (profileLink)
					{
						posterId = profileLink.href.match(/userid=(\d+)/i)[1];
						if (posterId && DB.isUserIgnored(posterId))
							post.className += ' salrPostIgnored';
					}
				}
				// User is ignored by the system so skip doing anything else
				continue;
			}

			if (post.id === "post") // handle adbot
				continue;
			curPostId = post.id.match(/post(\d+)/)[1];
			profileLink = PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//ul[contains(@class,'profilelinks')]//a[contains(@href,'userid=')]");
			if (!profileLink)
				continue;
			posterId = profileLink.href.match(/userid=(\d+)/i)[1];
			if (gotPrefs.superIgnore && DB.isUserIgnored(posterId))
			{
				// They're ignored but not by the system
				post.className += ' salrPostIgnored';
			}

			// Should work for all thread types nowadays. (05/21/2015)
			userNameBox = PageUtils.selectSingleNode(doc, post, "TBODY//TR/TD//DL//DT[contains(@class,'author')]");

			if (userNameBox === null)
			{
				PageUtils.logToConsole("SALR error: can't find a user name box for post " + curPostId + " in thread " + threadid);
				continue;
			}
			posterName = userNameBox.textContent.trim();

			// Standard template - should work for all thread types nowadays. (05/21/2015)
			let titleBox = PageUtils.selectSingleNode(doc, post, "tbody//dl[contains(@class,'userinfo')]//dd[contains(@class,'title')]");
			// If that doesn't work, try old FYAD template
			if (titleBox === null)
				titleBox = PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postbody')]//div[contains(@class,'title')]");

			if (titleBox)
			{
				if (DB.isAvatarHidden(posterId))
				{
					// We hate this person's avatar and we want to banish it to the depths of Hell
					titleBox.style.display = "none";
				}
			}

			ShowThreadHandler.applyUserHighlightingToPost(doc, post, userNameBox, posterId, threadFlags, gotPrefs);

			postIdLink = PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postdate')]//a[contains(@href,'#post')]");
			if (!postIdLink)
			{
				postIdLink = PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//a[contains(@href,'#post')]");
			}
			if (!postIdLink)
				continue;

			ShowThreadHandler.insertSinglePostLink(doc, threadFlags, postIdLink, curPostId);

			if (gotPrefs.useQuickQuote && !threadFlags.threadClosed)
			{
				QuickQuoteHelper.makeQuickQuoteEditButtons(doc, post, threadFlags);
			}

			ShowThreadHandler.addUserLinksToPost(doc, profileLink, posterId, posterName, gotPrefs);

			postbody = PageUtils.selectSingleNode(doc, post, "TBODY//TD[contains(@class,'postbody')]");

			ShowThreadHandler.applyCancerTreatment(doc, post, gotPrefs);
			ShowThreadHandler.convertSpecialLinks(postbody, doc, gotPrefs);
			ShowThreadHandler.processImages(postbody, doc, gotPrefs);
		}

		if (gotPrefs.dontAutoplayGifVideos)
		{
			let mutationObs = ShowThreadHandler.setupMutationObserver(doc.getElementById('thread'));
			content.setTimeout(() => ShowThreadHandler.stopObservingMutations(mutationObs), 10000);
		}

		if (gotPrefs.reanchorThreadOnLoad)
			doc.addEventListener("load", ShowThreadHandler.pageFinishedLoading, true);
	},

	/**
	 * Event handler for 'load' event. Scrolls anchored post into view.
	 * @param {Event} evt Load event
	 */
	pageFinishedLoading: function(evt)
	{
		let doc = evt.target.ownerDocument;
		doc.removeEventListener("load", ShowThreadHandler.pageFinishedLoading, true);
		if (doc.location.href.match(/#(.*)$/))
		{
			let post = doc.getElementById(doc.location.href.match(/#(.*)$/)[1]);
			if (post)
				post.scrollIntoView(true);
		}
	},

	/**
	 * Updates "postsPerPage" preference based on value seen in thread.
	 * @param {HTMLDocument} doc Document element to identify posts per page value in.
	 */
	updatePostsPerPage: function(doc)
	{
		// Grab threads/posts per page
		let postsPerPageOld = Prefs.getPref("postsPerPage");
		let perpage = PageUtils.selectSingleNode(doc, doc, "//DIV[contains(@class,'pages')]//A[contains(@href,'perpage=')]");
		if (!perpage)
			return;
		perpage = parseInt(perpage.href.match(/perpage=(\d+)/i)[1], 10);
		if (postsPerPageOld !== perpage)
		{
			Prefs.setPref("postsPerPage", perpage);
		}
	},

	/**
	 * Process quotes in a post to determine if we need to color or ignore them.
	 * @param {HTMLDocument} doc              Document element to process quotes for a post in.
	 * @param {HTMLElement}  post             Node snapshot of post to check.
	 * @param {string}       username         Logged-in user's username.
	 * @param {boolean}      superIgnoreUsers Whether super ignore is active.
	 */
	processQuotes: function(doc, post, username, superIgnoreUsers)
	{
		let userQuoted;
		let anyQuotes = PageUtils.selectNodes(doc, post, "TBODY//TR/TD//DIV[contains(@class,'bbc-block')]");
		for (let quote of anyQuotes)
		{
			userQuoted = quote.textContent.match(/(.*) posted:/);
			if (!userQuoted)
				continue;
			userQuoted = userQuoted[1];
			if (userQuoted === username) // self-quotes handled by forum JS now
				continue;
			let userQuotedDetails = DB.isUsernameColored(userQuoted);
			let userQuotedId = DB.getUserId(userQuoted);
			if (superIgnoreUsers && DB.isUserIgnored(userQuotedId))
			{
				// They're quoting someone ignored, lets remove the entire post
				post.className += ' salrPostIgnored';
			}
			if (userQuotedDetails)
			{
				quote.className += ' salrQuoteOf' + userQuotedDetails.userid;
				ShowThreadHandler.colorQuote(doc, userQuotedDetails.background, userQuotedDetails.userid);
			}
		}
	},

	/**
	 * Inserts "1" link to single post view of the current post.
	 * @param {HTMLDocument} doc         Document element to insert "1" link for a post in.
	 * @param {Object}       threadFlags Various thread-related information.
	 * @param {HTMLElement}  postIdLink  Node snapshot of link to current post.
	 * @param {number}       postid      The post ID.
	 */
	insertSinglePostLink: function(doc, threadFlags, postIdLink, postid)
	{
		if (!threadFlags.insertPostTargetLink)
			return;
		let slink = doc.createElement("a");
		if (threadFlags.singlePost)
		{
			slink.href = "/showthread.php?goto=post&postid="+postid;
			slink.title = "Back to Thread";
		}
		else
		{
			slink.href = "/showthread.php?action=showpost&postid="+postid+"&forumid="+threadFlags.forumid;
			slink.title = "Show Single Post";
		}
		slink.textContent = "1";
		postIdLink.parentNode.insertBefore(slink, postIdLink);
		postIdLink.parentNode.insertBefore(doc.createTextNode(" "), postIdLink);
	},

	/**
	 * Event handler for clicking the "Hide Avatar" or "Unhide Avatar" links
	 * @param {string} idToToggle   User ID of poster to toggle avatar for.
	 * @param {string} nameToToggle Username of poster to toggle avatar for.
	 * @param {Event}  event        The click event to handle.
	 */
	clickToggleAvatar: function(idToToggle, nameToToggle, event)
	{
		event.stopPropagation();
		event.preventDefault();
		let clickedLink = event.target;
		var doc = clickedLink.ownerDocument;
		var alreadyHidden = DB.isAvatarHidden(idToToggle);
		var posts = PageUtils.selectNodes(doc, doc, "//table[contains(@id,'post')]");
		var post, profileLink, posterId, titleBox, toggleLink;

		for (var n = 0; n < posts.length; n++)
		{
			post = posts[n];
			let reachedSelf = false;
			profileLink = PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//ul[contains(@class,'profilelinks')]//a[contains(@href,'userid=')]");
			if (!profileLink)
				continue;
			posterId = profileLink.href.match(/userid=(\d+)/i)[1];
			if (posterId === idToToggle)
			{
				// Standard template
				titleBox = PageUtils.selectSingleNode(doc, post, "tbody//dl[contains(@class,'userinfo')]//dd[contains(@class,'title')]");
				// If that doesn't work, try FYAD template
				if (titleBox == null)
					titleBox = PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postbody')]//div[contains(@class,'title')]");

				toggleLink = PageUtils.selectSingleNode(doc, post, "tbody//td[contains(@class,'postlinks')]//a[text() = 'Hide Avatar' or text() = 'Show Avatar']");
				if (toggleLink === clickedLink)
					reachedSelf = true;

				if (alreadyHidden)
				{
					if (titleBox.style.visibility === "hidden")
						titleBox.style.visibility = "visible";
					else
						titleBox.style.display = "block";
					toggleLink.textContent = "Hide Avatar";
				}
				else
				{
					if (reachedSelf)
						titleBox.style.display = "none";
					else
						titleBox.style.visibility = "hidden";
					toggleLink.textContent = "Show Avatar";
				}
			}
		}
		DB.toggleAvatarHidden(idToToggle, nameToToggle);
	},

	/**
	 * Add a user to the highlighting/note section from clicking on a post link.
	 * @param {string} userid   Userid to add.
	 * @param {string} username Username to add.
	 * @param {Event}  evt      The click event.
	 */
	addHighlightedUser: function(userid, username, evt)
	{
		evt.stopPropagation();
		evt.preventDefault();
		sendAsyncMessage("salastread:RunConfigAddUser", {userid, username});
	},

	/**
	 * Adds 'Who posted?' and search box to thread table header.
	 * @param {HTMLDocument} doc      Document element to check in.
	 * @param {number}       forumid  Forum ID.
	 * @param {number}       threadid Thread ID.
	 */
	addWhoPostedAndSearchBox: function(doc, forumid, threadid)
	{
		var searchThis = PageUtils.selectSingleNode(doc, doc, "//FORM[contains(@class,'threadsearch')]");
		var placeHere = PageUtils.selectSingleNode(doc, doc, "//img[contains(@class,'thread_bookmark')]");
		if (!searchThis || !placeHere || !placeHere.parentNode || placeHere.parentNode.nodeName.toLowerCase() !== 'li')
			return;
		placeHere = placeHere.parentNode;
		if (Prefs.getPref("replyCountLinkinThreads"))
		{
			var replyCountLi = doc.createElement('li');
			var replyCountLink = doc.createElement("A");
			replyCountLi.appendChild(replyCountLink);
			replyCountLink.href = "/misc.php?action=whoposted&threadid=" + threadid + "#fromthread";
			replyCountLink.target = "_blank";
			replyCountLink.textContent = "Who posted?";
			replyCountLink.style.fontSize = "10px";
			replyCountLink.style.cssFloat = "left";
			replyCountLink.style.marginLeft = "8px";
			replyCountLink.style.color = "#FFFFFF";
			// Plug it in right after the "Search thread:" form
			placeHere.parentNode.insertBefore(replyCountLi,placeHere.nextSibling);
			placeHere.parentNode.insertBefore(doc.createTextNode(" "),placeHere.nextSibling);
		}
		// SA's "Search thread" box is disabled; add our own
		if (!Prefs.getPref("hideThreadSearchBox") && searchThis.firstChild.nodeName === '#text')
		{
			ShowThreadHandler.addThreadSearchBox(doc, forumid, threadid, placeHere);
		}
	},

	/**
	 * Adds "Search Thread" box to document.
	 * @param {HTMLDocument} doc        Document element.
	 * @param {number}       forumid    Forum ID used for search params.
	 * @param {number}       threadid   Thread ID used for search params.
	 * @param {HTMLElement}  placeHere  Destination for our search box.
	 */
	addThreadSearchBox: function(doc, forumid, threadid, placeHere)
	{
		let newSearchBox = doc.createElement('li');
		let newSearchForm = doc.createElement('form');
		newSearchBox.appendChild(newSearchForm);
		newSearchForm.method = 'post';
		newSearchForm.className = 'threadsearch'; 
		let newSearchDiv = doc.createElement('div');
		newSearchDiv.setAttribute('id','salrsearchdiv');
		newSearchForm.appendChild(newSearchDiv);
		let newSearchText = doc.createElement('input');
		newSearchText.setAttribute('id','salrsearchbox');
		newSearchText.setAttribute('required','');
		newSearchText.size = '25';
		newSearchText.placeholder = ' Added by SALR';
		newSearchDiv.appendChild(newSearchText);
		let newSearchButton = doc.createElement('input');
		newSearchButton.type = 'submit';
		newSearchButton.value = 'Search thread';
		newSearchDiv.appendChild(newSearchButton);

		// Add specific parameters
		ShowThreadHandler.addSearchParams(doc, forumid, threadid, newSearchText);

		// Don't accidentally trigger keyboard navigation
		newSearchText.addEventListener("keypress", function(e) { e.stopPropagation(); }, true);

		placeHere.parentNode.insertBefore(newSearchBox,placeHere.nextSibling);
	},

	/**
	 * Adds action+parameters to a search box based on type of search.
	 * @param {HTMLDocument}     doc           Document element.
	 * @param {number}           forumid       Forum ID.
	 * @param {number}           threadid      Thread ID.
	 * @param {HTMLInputElement} newSearchText The search box text input element.
	 */
	addSearchParams: function(doc, forumid, threadid, newSearchText)
	{
		let newSearchDiv = newSearchText.parentNode;
		let newSearchForm = newSearchDiv.parentNode;
		newSearchForm.action = 'https://forums.somethingawful.com/query.php';
		PageUtils.addHiddenFormInput(doc, newSearchDiv, 'action', 'query');
		PageUtils.addHiddenFormInput(doc, newSearchDiv, 'forums[]', forumid);
		// Work some magic on submit
		newSearchForm.addEventListener('submit', function(event)
		{
			event.preventDefault();
			PageUtils.addHiddenFormInput(doc,newSearchDiv,'q','threadid:'+threadid+' '+newSearchText.value);
			newSearchForm.submit();
		}, false);
	},

	/**
	 * Called for every post.
	 * Convert links pointing at image/videos in threads to inline images/videos
	 * @param {HTMLElement}  postbody Node snapshot of post body TD.
	 * @param {HTMLDocument} doc      Document element we're working in.
	 * @param {Object}       gotPrefs Preloaded preferences from main function.
	 */
	convertSpecialLinks: function(postbody, doc, gotPrefs)
	{
		var newImg, imgNum, imgLink;
		// Snapshot links before doing any image unconverting
		var linksInPost = PageUtils.selectNodes(doc, postbody, "descendant::A");

		// Get preferences for imgur workaround
		let optionsForImgurWorkaround = {
			thumbnailAllImages: gotPrefs.thumbnailAllImages,
			maxWidth: gotPrefs.maxWidthOfConvertedImages ? gotPrefs.maxWidthOfConvertedImages + "px" : null,
			maxHeight: gotPrefs.maxHeightOfConvertedImages ? gotPrefs.maxHeightOfConvertedImages + "px" : null
		};

		var readPost = (postbody.parentNode.className.search(/seen/) > -1);
		var convertImages = (gotPrefs.convertTextToImage && !(gotPrefs.dontConvertReadImages && readPost));

		if (gotPrefs.unconvertReadImages && readPost)
		{
			ShowThreadHandler.imagesToLinks(postbody, doc);
		}

		// Iterate over link snapshot from before we unconverted
		for (let link of linksInPost)
		{
			if (convertImages && (link.href.search(/\.(gif|jpg|jpeg|png)(#.*)?(%3C\/a%3E)?$/i) > -1))
			{
				if (link.href.search(/paintedover\.com/i) > -1 || // PaintedOver sucks, we can't embed them
					link.href.search(/xs\.to/i) > -1 || // xs.to sucks, we can't embed them
					link.href.search(/imagesocket\.com/i) > -1 || // ImageSocket sucks, we can't embed them
					link.href.search(/imgplace\.com/i) > -1 || // ImageSocket sucks, we can't embed them
					link.href.search(/echo\.cx\/.*\?/) > -1 || // Old school ImageShack links that go to a page
					link.href.search(/wiki(.*)Image/i) > -1 || // Wikipedia does funky stuff with their images too
					link.innerHTML == "") // Quotes have fake links for some reason
				{
					continue;
				}
				if (gotPrefs.dontTextToImageIfMayBeNws &&
					link.parentNode.innerHTML.search(/(nsfw|nws|nms|t work safe|t safe for work)/i) > -1)
				{
					continue;
				}
				if (gotPrefs.dontTextToImageInSpoilers &&
					(link.parentNode.className.search(/spoiler/i) > -1 ||
					link.textContent.search(/spoiler/i) > -1))
				{
					continue;
				}
				// Fix Imageshack links that went to a page instead of an image
				if ((link.href.search(/fi\.somethingawful\.com\/is\/img(\d+)\/(\d+)\//) > -1) ||
				 (link.href.search(/fi\.somethingawful\.com\/is\/.*\?loc=img(\d+)/) > -1))
				{
					imgNum = link.href.match(/img(\d+)/)[1];
					link.href = link.href.replace(/fi\.somethingawful\.com\/is/, 'img' + imgNum + '.imageshack.us');
					if (link.parentNode.nodeName == 'IMG')
					{
						link.parentNode.parentNode.replaceChild(link, link.parentNode);
					}
					continue;
				}
				if (link.href.search(/fi\.somethingawful\.com\/is\/.*\?image=/) > -1)
				{
					imgNum = link.getElementsByTagName('img');
					if (imgNum[0])
					{
						imgLink = link.getElementsByTagName('img')[0];
						imgNum = imgLink.src.match(/img(\d+)/)[1];
						link.href = link.href.replace(/fi\.somethingawful\.com\/is/, 'img' + imgNum + '.imageshack.us');
						if ((imgLink.src.search(/fi\.somethingawful\.com\/is\/img(\d+)\/(\d+)\//) > -1) ||
						 (imgLink.src.search(/fi\.somethingawful\.com\/is\/.*\?loc=img(\d+)/) > -1))
						{
							imgNum = imgLink.src.match(/img(\d+)/)[1];
							imgLink.src = imgLink.src.replace(/fi\.somethingawful\.com\/is/, 'img' + imgNum + '.imageshack.us');
						}
					}
					continue;
				}
				// Fix archived thumbnails
				if (link.href.search(/%3C\/a%3E/) > -1)
				{
					link.href = link.href.replace('%3C/a%3E', '');
				}
				if (gotPrefs.dontConvertQuotedImages)
				{
					// Check if it's in a blockquote
					if (link.parentNode.parentNode.className.search(/bbc-block/i) > -1 ||
						link.parentNode.parentNode.parentNode.className.search(/bbc-block/i) > -1)
					{
						continue;
					}
				}

				newImg = doc.createElement("img");
				newImg.src = link.href;
				newImg.title = "Link converted by SALR";
				newImg.style.border = "1px dashed red";
				// Check if the link was a text link to an image and move the text
				if ((link.firstChild == link.lastChild &&
				 (link.firstChild.tagName && link.firstChild.tagName.search(/img/i) > -1)) ||
				 link.textContent.search(/http:/i) === 0)
				{
					// Don't replace a (hopefully) good image with a broken link:
					if (link.firstChild && link.firstChild.tagName && link.firstChild.tagName.toLowerCase() === 'img' && link.firstChild.src)
					{
						let oldImgSrc = link.firstChild.src;
						// The forums have a weird mis-linking bug for imgur
						ImgurHandler.needForumWorkaround(link, newImg, optionsForImgurWorkaround);
						newImg.onerror = function()
						{
							this.src = oldImgSrc;
						};
					}
					else
					{
						link.textContent = '';
						link.parentNode.replaceChild(newImg, link);
					}
				}
				else
				{
					if (link.previousSibling)
					{
						link.previousSibling.textContent += link.textContent;
					}
					else
					{
						let newText = doc.createTextNode(link.textContent);
						link.parentNode.insertBefore(newText, link);
					}
					link.textContent = '';
					link.parentNode.replaceChild(newImg, link);
				}
			}

			if (gotPrefs.enableVideoEmbedder)
			{
				VideoHandler.processVideoLink(link);
			}
		}
	},

	/**
	 * Converts images in the body of a post to links.
	 * @param {HTMLElement}  postbody Node snapshot of post body TD.
	 * @param {HTMLDocument} doc      Document element we're working in.
	 */
	imagesToLinks: function(postbody, doc)
	{
		let imagesInPost = PageUtils.selectNodes(doc, postbody, 
			"descendant::IMG[not(contains(@src,'somethingawful.com/safs/smilies') or " + 
				"contains(@src,'somethingawful.com/forumsystem/emoticons') or " + 
				"contains(@src,'somethingawful.com/images/smilies'))]");

		for (let j in imagesInPost)
		{
			if (imagesInPost.hasOwnProperty(j))
			{
				let anImage = imagesInPost[j];
				let newLink = doc.createElement("a");
				newLink.href = anImage.src;
				newLink.title = "Image unconverted by SALR";
				newLink.textContent = "[Image hidden by SALR, click to view]";
				newLink.style.border = "1px dashed red";
				// Check if the image's parent is a link
				if (anImage.parentNode.tagName && (anImage.parentNode.tagName.search(/^a$/i) > -1))
				{
					// Link to the same image -> Don't add newLink 
					if (anImage.parentNode.href === anImage.src)
					{
						anImage.parentNode.replaceChild(doc.createTextNode("[Image hidden by SALR; click to view]"), anImage);
					}
					else
					{
						// Link is to something else -> Make a text node for 
						//     the link to indicate the image is linked below.
						// Insert the new link after the old link, as appropriate.
						if (anImage.parentNode.parentNode.lastChild === anImage.parentNode)
						{
							anImage.parentNode.parentNode.appendChild(newLink);
						}
						else
						{
							anImage.parentNode.parentNode.insertBefore(newLink, anImage.parentNode.nextSibling);
						}
						anImage.parentNode.replaceChild(doc.createTextNode("[Image hidden by SALR, linked below]"), anImage);
					}
				}
				else
				{
					// Simple replacement
					anImage.parentNode.replaceChild(newLink, anImage);
				}
			}
		}
	},

	/**
	 * Called right after convertSpecialLinks; does thumbnailing & waffle
	 * Process images in posts, consolidated into one function for speed
	 * @param {HTMLElement}  postbody Node snapshot of post body TD.
	 * @param {HTMLDocument} doc      Document element we're working in.
	 * @param {Object}       gotPrefs Preloaded preferences from main function.
	 */
	processImages: function(postbody, doc, gotPrefs)
	{
		if (gotPrefs.thumbnailAllImages)
		{
			var maxWidth = gotPrefs.maxWidthOfConvertedImages;
			var maxHeight = gotPrefs.maxHeightOfConvertedImages;

			if (maxHeight)
				maxHeight += "px";
			if (maxWidth)
				maxWidth += "px";
		}

		var images = PageUtils.selectNodes(doc, postbody, ".//img");
		for (let image of images)
		{
			// Scale all images in the post body to the user-specified size
			if (gotPrefs.thumbnailAllImages && image.className.search(/timg/i) === -1 && (image.parentNode === postbody || image.parentNode.nodeName.toLowerCase() === 'blockquote'))
			{
				if (!image.src.match(/forumimages\.somethingawful\.com/i))
				{
					if (maxWidth)
						image.style.maxWidth = maxWidth;
					if (maxHeight)
						image.style.maxHeight = maxHeight;
					if (!maxWidth && !maxHeight)
						continue;
					image.addEventListener("click",
						function()
						{
							if (maxWidth)
								this.style.maxWidth = (this.style.maxWidth == maxWidth) ? "" : maxWidth;
							if (maxHeight)
								this.style.maxHeight = (this.style.maxHeight == maxHeight) ? "" : maxHeight;
						}, false);
				}
			}
			if (gotPrefs.convertGifToVideo)
				ImgurHandler.checkImgurGif(image);
			ShowThreadHandler.replaceWaffleImage(image);
		}
	},

	/**
	 * Replace old, unworking links to waffleimages with randomwaffle links.
	 * @param {HTMLImageElement} image Node snapshot of image element to check.
	 */
	replaceWaffleImage: function(image)
	{
		if (image.src.match(/waffleimages\.com/i))
		{
			let match = image.src.match(/waffleimages\.com\/([0-9a-f]{40})\/.*(jpe?g|png|gif)(?:#via=salr)?$/i);
			if (match)
			{
				let hash = match[1];
				let ext = match[2];
				if (ext === 'jpeg')
					ext = 'jpg';
				let newSrc = 'http://randomwaffle.gbs.fm/images/' + hash.substr(0,2) + '/' + hash + '.' + ext;
				image.setAttribute('src', newSrc);
			}
		}
	},

	/**
	 * Adds user highlighting/notes to a post.
	 * Updates mod/admin status in DB.
	 * @param {HTMLDocument} doc         Document element we're working in.
	 * @param {HTMLElement}  post        Node snapshot of current post's table element.
	 * @param {HTMLElement}  userNameBox Node snapshot of current post's user name box element.
	 * @param {string}       posterId    User ID of poster.
	 * @param {Object}       threadFlags Various thread-related information.
	 * @param {Object}       gotPrefs    Preloaded preferences from main function.
	 */
	applyUserHighlightingToPost: function(doc, post, userNameBox, posterId, threadFlags, gotPrefs)
	{
		/** @type {string} */
		var posterName = userNameBox.textContent.trim();
		/** @type {(string|boolean)} */
		var posterColor = false;
		/** @type {(string|boolean)} */
		var posterBG = false;
		/** @type {(string|boolean)} */
		var posterNote = false;
		/** @type {(string|boolean)} */
		var userPosterNote = false;

		//apply this to every post
		post.className += " salrPostBy" + posterId + " salrPostBy" + escape(posterName);
		if (posterName === gotPrefs.username)
		{
			post.className += " salrPostOfSelf";
			if (threadFlags.threadMarkedPostedIn === false)
			{
				DB.iPostedHere(threadFlags.threadid);
				threadFlags.threadMarkedPostedIn = true;
			}
		}

		//apply custom user coloring
		if (userNameBox.className.search(/\bop/) > -1)
		{
			posterColor = gotPrefs.opColor;
			posterBG = gotPrefs.opBackground;
			posterNote = gotPrefs.opSubText;
		}

		// Check to see if there's a mod or admin star
		/** @type {(string|boolean)} */
		let posterImg = false;

		if (userNameBox.title.length > 0 && !threadFlags.inArchives)
		{
			posterImg = userNameBox.title;
			if (posterImg === 'Administrator')
			{
				DB.addAdmin(posterId, posterName);
			}
			else if (posterImg === 'Moderator')
			{
				DB.addMod(posterId, posterName);
			}
		}

		if (DB.isMod(posterId))
		{
			if (posterImg === "Moderator" || posterImg === "Internet Knight" || threadFlags.inArchives)
			{
				posterColor = gotPrefs.modColor;
				posterBG = gotPrefs.modBackground;
				posterNote = gotPrefs.modSubText;
				post.className += " salrPostByMod";
			}
			else if (!threadFlags.inArchives)
			{
				DB.removeMod(posterId);
			}
		}
		if (DB.isAdmin(posterId))
		{
			if (posterImg === "Administrator" || threadFlags.inArchives)
			{
				posterColor = gotPrefs.adminColor;
				posterBG = gotPrefs.adminBackground;
				posterNote = gotPrefs.adminSubText;
				post.className += " salrPostByAdmin";
			}
			else if (!threadFlags.inArchives)
			{
				DB.removeAdmin(posterId);
			}
		}
		var dbUser = DB.isUserIdColored(posterId);
		if (dbUser)
		{
			if (!dbUser.username || dbUser.username !== posterName)
			{
				DB.setUserName(posterId, posterName);
			}
			if (dbUser.color && dbUser.color !== "0")
			{
				posterColor = dbUser.color;
			}
			if (dbUser.background && dbUser.background !== "0")
			{
				posterBG = dbUser.background;
			}
		}

		if (posterBG && posterBG !== "0")
		{
			ShowThreadHandler.colorPost(doc, posterBG, posterId);
		}

		// Check for quotes that need to be colored or superIgnored
		if (gotPrefs.highlightQuotes || gotPrefs.superIgnore)
		{
			ShowThreadHandler.processQuotes(doc, post, gotPrefs.username, gotPrefs.superIgnore);
		}

		userPosterNote = DB.getPosterNotes(posterId);
		if (gotPrefs.highlightUsernames && posterColor !== false && posterColor !== "0")
		{
			userNameBox.style.color = posterColor;
		}
		if (posterNote || userPosterNote)
		{
			let newNoteBox = doc.createElement("p");
			newNoteBox.className = "salrUserNote";
			newNoteBox.innerHTML = posterNote ? posterNote : '';
			newNoteBox.innerHTML += userPosterNote ? (((posterNote && userPosterNote) ? '<br />':'') + userPosterNote):'';
			newNoteBox.style.color = userNameBox.style.color;
			userNameBox.parentNode.insertBefore(newNoteBox, userNameBox.nextSibling);
		}
	},

	// Colors a post based on details passed to it
	// @param: (html doc) document, (string) color to use for the post, (int) userid of poster
	// @return: nothing
	colorPost: function(doc, colorToUse, userid)
	{
		if (colorToUse === '0')
		{
			return;
		}
		var CSSFile = 'table.salrPostBy'+userid+' td, table.salrPostBy'+userid+' tr.seen1 td, table.salrPostBy'+userid+' tr.seen2 td { background-color:';
		CSSFile += colorToUse;
		CSSFile += ' !important; }\n';
		PageUtils.insertDynamicCSS(doc, CSSFile);
	},

	// Colors a quote based on details passed to it
	// @param: (html doc) document, (string) color to use for the post, (int) userid of quoted
	// @return: nothing
	colorQuote: function(doc, colorToUse, userid)
	{
		if (colorToUse === '0')
		{
			return;
		}
		var CSSFile = 'div.bbc-block.salrQuoteOf'+userid+' {';
		CSSFile += 'background:';
		CSSFile += colorToUse;
		CSSFile += ' !important; };\n';
		PageUtils.insertDynamicCSS(doc, CSSFile);
	},

	/**
	 * Adds User Highlighting/Notes and Toggle Avatar buttons to a post.
	 * @param {HTMLDocument} doc         Document element we're working in.
	 * @param {HTMLElement}  profileLink Node snapshot of profile link anchor.
	 * @param {string}       posterId    User ID of poster.
	 * @param {string}       posterName  Username of poster.
	 * @param {Object}       gotPrefs    Preloaded preferences from main function.
	 * @param {boolean}      gotPrefs.hideCustomTitles   Whether we are hiding all custom titles.
	 * @param {boolean}      gotPrefs.highlightUsernames Whether we are highlighting interesting users.
	 */
	addUserLinksToPost: function(doc, profileLink, posterId, posterName, gotPrefs)
	{
		var userLinks = profileLink.parentNode.parentNode;
		// Add a link to hide/unhide the user's avatar
		if (!gotPrefs.hideCustomTitles)
		{
			let avLink = doc.createElement("li");
			avLink.setAttribute('style', '-moz-user-select: none;');
			avLink.style.cssFloat = 'right';
			avLink.style.marginLeft = '4px';
			let avAnch = doc.createElement("a");
			avAnch.href = "#";
			avAnch.title = "Toggle displaying this poster's avatar.";
			if (DB.isAvatarHidden(posterId))
				avAnch.textContent = "Show Avatar";
			else
				avAnch.textContent = "Hide Avatar";

			avAnch.addEventListener("click", ShowThreadHandler.clickToggleAvatar.bind(null, posterId, posterName), false);
			avLink.appendChild(avAnch);
			userLinks.appendChild(doc.createTextNode(" "));
			userLinks.appendChild(avLink);
		}

		// Add user coloring/note links
		// Note: this is added after, but appears to the left thanks to CSS floats.
		if (gotPrefs.highlightUsernames)
		{
			var li = doc.createElement("li");
			li.setAttribute('style', '-moz-user-select: none;');
			li.style.cssFloat = 'right';
			li.style.marginLeft = '4px';
			var a = doc.createElement("a");
			a.href = "#";
			a.textContent = "Add Coloring/Note";
			a.title = "Add coloring and/or a note for this poster.";
			a.addEventListener("click", ShowThreadHandler.addHighlightedUser.bind(null,posterId,posterName), true);
			li.appendChild(a);
			userLinks.appendChild(doc.createTextNode(" "));
			userLinks.appendChild(li);
		}

		// Add a space for the Rap Sheet link added afterwards by forum JS:
		userLinks.appendChild(doc.createTextNode(" "));
	},

	/**
	 * Applies an alternate representation of a user's forum cancer.
	 * @param {HTMLDocument} doc         Document element we're working in.
	 * @param {HTMLElement}  post        Node snapshot of current post's table element.
	 * @param {Object}       gotPrefs    Preloaded preferences from main function.
	 */
	applyCancerTreatment: function(doc, post, gotPrefs)
	{
		// 0 - do nothing; 1 - restore opacity and add biohazard BG; 2 - hide post entirely
		if (gotPrefs.cancerTreatment === 0)
			return;
		if (!post.querySelector('.cancerous'))
			return;
		post.classList.add('salrbiohazard');
	},

	/**
	 * Sorta hacky workaround to stop videos embedded by forum JS from autoplaying.
	 * @param {HTMLElement} target Thread div to observe.
	 * @return {MutationObserver} Our observer.
	 */
	setupMutationObserver: function(target)
	{
		if (!target)
			return;
		var MutationObserver = content.MutationObserver;
		var observer = new MutationObserver(ShowThreadHandler.checkMutations);
		// configuration of the observer:
		var config = { childList: true, subtree: true };

		// pass in the target node, as well as the observer options
		observer.observe(target, config);
		return observer;
	},

	/**
	 * Look for mutations that add videos; stop them!
	 * @param {MutationRecord[]} mutations Array of mutations to check.
	 */
	checkMutations: function(mutations)
	{
		/** @type {HTMLElement} */
		var newNode;
		/** @type {HTMLVideoElement} */
		var newVideo;
		mutations.forEach(function(mutation)
		{
			if (mutation.type !== "childList")
				return;
			for (let i = 0; i < mutation.addedNodes.length; i++)
			{
				newNode = mutation.addedNodes[i];
				if (!newNode.classList)
					continue;
				if (newNode.classList.contains('gifv_video') || newNode.classList.contains('gfy_video'))
				{
					newVideo = newNode.firstChild;
					newVideo.autoplay = false;
					newVideo.preload = 'none';
					newVideo.controls = true;
				}
			}
		});
	},

	/**
	 * Cleanup function to stop observing DOM Mutations
	 * @param {MutationObserver} observer Our observer.
	 */
	stopObservingMutations: function(observer)
	{
		observer.disconnect();
	},

};
