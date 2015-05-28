/*

	Functions that deal exclusively with showthread & individual post handling

*/

// Called from old Overlay
let {DB} = require("db");
let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");
let {ImgurHandler} = require("imgurHandler");
let {VideoHandler} = require("videoHandler");

let ShowThreadHandler = exports.ShowThreadHandler =
{
	/**
	 * Adds "Search Thread" box to document.
	 * @param {Element}  doc        Document element.
	 * @param {number}   forumid    Forum ID used for search params.
	 * @param {number}   threadid   Thread ID used for search params.
	 * @param {Element}  placeHere  Destination for our search box.
	 * @param {string}   searchType Whether to use new search ('query')
	 *     or old search ('search').
	 */
	addThreadSearchBox: function(doc, forumid, threadid, placeHere, searchType)
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

		// Add specific parameters based on our searchType
		ShowThreadHandler.addSearchParams(doc, forumid, threadid, newSearchText, searchType);

		// Don't accidentally trigger keyboard navigation
		newSearchText.addEventListener("keypress", function(e) { e.stopPropagation(); }, true);

		placeHere.parentNode.insertBefore(newSearchBox,placeHere.nextSibling);
	},

	/**
	 * Adds action+parameters to a search box based on type of search.
	 * @param {Element}  doc           Document element.
	 * @param {number}   forumid       Forum ID.
	 * @param {number}   threadid      Thread ID.
	 * @param {Element}  newSearchText The search box text input element.
	 * @param {string}   searchType    Whether to use new search ('query')
	 *     or old search ('search').
	 */
	addSearchParams: function(doc, forumid, threadid, newSearchText, searchType)
	{
		let newSearchDiv = newSearchText.parentNode;
		let newSearchForm = newSearchDiv.parentNode;
		switch(searchType)
		{
			case "query":
				newSearchForm.action = 'http://forums.somethingawful.com/query.php';
				PageUtils.addHiddenFormInput(doc, newSearchDiv, 'action', 'query');
				PageUtils.addHiddenFormInput(doc, newSearchDiv, 'forums[]', forumid);
				// Work some magic on submit
				newSearchForm.addEventListener('submit', function(event)
				{
					event.preventDefault();
					PageUtils.addHiddenFormInput(doc,newSearchDiv,'q','threadid:'+threadid+' '+newSearchText.value);
					newSearchForm.submit();
				}, false);
				break;
			case "search":
				newSearchForm.action = 'http://forums.somethingawful.com/f/search/submit';
				let searchInputs = {
					'forumids': forumid,
					'groupmode': '0',
					'opt_search_posts': 'on',
					'perpage': '20',
					'search_mode': 'ext',
					'show_post_previews': '1',
					'sortmode': '1'
				};
				for (let p in searchInputs)
				{
					if (searchInputs.hasOwnProperty(p))
						PageUtils.addHiddenFormInput(doc, newSearchDiv, p, searchInputs[p]);
				}
				// Work some magic on submit
				newSearchForm.addEventListener('submit', function(event)
				{
					event.preventDefault();
					PageUtils.addHiddenFormInput(doc,newSearchDiv,'keywords','threadid:'+threadid+' '+newSearchText.value);
					newSearchForm.submit();
				}, false);
				break;
		}
	},

	// Convert links pointing at image/videos in threads to inline images/videos
	// @param: post body (td), document body
	// @return: nothing
	convertSpecialLinks: function(postbody, doc)
	{
		var newImg, imgNum, imgLink;
		// Snapshot links before doing any image unconverting
		var linksInPost = PageUtils.selectNodes(doc, postbody, "descendant::A");

		// Get preferences for imgur workaround
		let maxWidth = Prefs.getPref("maxWidthOfConvertedImages");
		let maxHeight = Prefs.getPref("maxHeightOfConvertedImages");
		let optionsForImgurWorkaround = {
			thumbnailAllImages: Prefs.getPref("thumbnailAllImages"),
			maxWidth: maxWidth ? maxWidth + "px" : null,
			maxHeight: maxHeight ? maxHeight + "px" : null
		};

		var convertImages = Prefs.getPref("convertTextToImage");
		var dontConvertReadImages = Prefs.getPref("dontConvertReadImages");
		var unconvertImages = Prefs.getPref("unconvertReadImages");
		var readPost = (postbody.parentNode.className.search(/seen/) > -1);
		convertImages = (convertImages && !(dontConvertReadImages && readPost));
		if (convertImages)
		{
			var dontTtiNWS = Prefs.getPref("dontTextToImageIfMayBeNws");
			var dontTtiSpoilers = Prefs.getPref("dontTextToImageInSpoilers");
			var dontTtiQuotedImages = Prefs.getPref("dontConvertQuotedImages");
		}
		unconvertImages = (unconvertImages && readPost);
		let enableVideoEmbeds = Prefs.getPref("enableVideoEmbedder");

		if (unconvertImages)
		{
			ShowThreadHandler.imagesToLinks(postbody, doc);
		}

		// Iterate over link snapshot from before we unconverted
		for (let i in linksInPost)
		{
			let link = linksInPost[i];

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
				if (dontTtiNWS &&
					link.parentNode.innerHTML.search(/(nsfw|nws|nms|t work safe|t safe for work)/i) > -1)
				{
					continue;
				}
				if (dontTtiSpoilers &&
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
				if (dontTtiQuotedImages)
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

			if (enableVideoEmbeds)
			{
				VideoHandler.processVideoLink(link);
			}
		}
	},

	/**
	 * Converts images in the body of a post to links.
	 * @param {Node}    postbody Node snapshot of post body TD.
	 * @param {Element} doc      Document element we're working in.
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

	// Called right after convertSpecialLinks; does thumbnailing & waffle
	// Process images in posts, consolidated into one function for speed
	// @param: body of the post, document body
	// @return: nothing
	processImages: function(postbody, doc)
	{
		var thumbnailAllImages = Prefs.getPref("thumbnailAllImages");
		if (thumbnailAllImages)
		{
			var maxWidth = Prefs.getPref("maxWidthOfConvertedImages");
			var maxHeight = Prefs.getPref("maxHeightOfConvertedImages");

			if (maxHeight)
				maxHeight += "px";
			if (maxWidth)
				maxWidth += "px";
		}

		var images = PageUtils.selectNodes(doc, postbody, ".//img");
		for (var i in images)
		{
			var image = images[i];

			// Scale all images in the post body to the user-specified size
			if (thumbnailAllImages && image.className.search(/timg/i) === -1 && (image.parentNode === postbody || image.parentNode.nodeName.toLowerCase() === 'blockquote'))
			{
				if (!image.src.match(/forumimages\.somethingawful\.com/i))
				{
					if (maxWidth)
						image.style.maxWidth = maxWidth;
					if (maxHeight)
						image.style.maxHeight = maxHeight;
					if (maxWidth || maxHeight)
					{
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
			}
			ShowThreadHandler.replaceWaffleImage(image);
		}
	},

	/**
	 * Replace old, unworking links to waffleimages with randomwaffle links.
	 * @param {Node} image Node snapshot of image element to check.
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

	// Takes a button and turns it into a quick button
	// @param: (html element) doc, (html element) button, (int) forumid
	// @return: (html element) quick button
	turnIntoQuickButton: function(doc, button, forumid)
	{
		var oldsrc = button.firstChild.src;
		var oldalt = button.firstChild.alt;
		//button.firstChild.style.width = "12px !important";
		button.firstChild.style.width = "12px";
		//button.firstChild.style.height = "20px !important";
		button.firstChild.style.height = "20px";
		button.firstChild.alt = "Normal " + oldalt;
		button.firstChild.title = "Normal " + oldalt;
		var quickbutton = doc.createElement("img");

		if (PageUtils.inBYOB(forumid))
		{
			button.firstChild.src = "chrome://salastread/skin/quickbutton-byob.gif";
		}
		else if (PageUtils.inYOSPOS(forumid))
		{
			button.firstChild.src = "chrome://salastread/skin/quickbutton.gif";
			button.firstChild.style.paddingBottom = "0px";
			quickbutton.style.backgroundImage = "none !important";
		}
		else
		{
			button.firstChild.src = "chrome://salastread/skin/quickbutton.gif";
		}
		quickbutton.src = oldsrc;
		quickbutton.alt = "Quick " + oldalt;
		quickbutton.title = "Quick " + oldalt;
		quickbutton.border = "0";
		quickbutton.style.cursor = "pointer";

		button.parentNode.insertBefore(quickbutton, button);
		return quickbutton;
	},

	// Colors a post based on details passed to it
	// @param: (html doc) document, (string) color to use for the post, (int) userid of poster
	// @return: nothing
	colorPost: function(doc, colorToUse, userid)
	{
		if (colorToUse == 0)
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
		if (colorToUse == 0)
		{
			return;
		}
		var CSSFile = 'div.bbc-block.salrQuoteOf'+userid+' {';
		CSSFile += 'background:';
		CSSFile += colorToUse;
		CSSFile += ' !important; };\n';
		PageUtils.insertDynamicCSS(doc, CSSFile);
	},

};
