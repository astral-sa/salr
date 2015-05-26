/*

	Functions that deal exclusively with showthread & individual post handling

*/

// Called from old Overlay
let {DB} = require("db");
let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");

let ShowThreadHandler = exports.ShowThreadHandler =
{
	_pendingVideoTitles: {},

	// Adds "Search Thread" box to document - new search
	addNewThreadSearchBox: function(doc, forumid, threadid, searchThis, placeHere)
	{
		let newSearchBox = doc.createElement('li');
		let newSearchForm = doc.createElement('form');
		newSearchBox.appendChild(newSearchForm);
		newSearchForm.action = 'http://forums.somethingawful.com/query.php';
		newSearchForm.method = 'post';
		newSearchForm.className = 'threadsearch'; 
		let newSearchDiv = doc.createElement('div');
		newSearchDiv.setAttribute('id','salrsearchdiv');
		newSearchForm.appendChild(newSearchDiv);
		PageUtils.addHiddenFormInput(doc, newSearchDiv, 'action', 'query');
		PageUtils.addHiddenFormInput(doc, newSearchDiv, 'forums[]', forumid);
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

		// Don't accidentally trigger keyboard navigation
		newSearchText.addEventListener("keypress", function(e) { e.stopPropagation(); }, true);

		// Work some magic on submit
		newSearchForm.addEventListener('submit', function(event)
		{
			event.preventDefault();
			PageUtils.addHiddenFormInput(doc,newSearchDiv,'q','threadid:'+threadid+' '+newSearchText.value);
			newSearchForm.submit();
		}, false);
		placeHere.parentNode.insertBefore(newSearchBox,placeHere.nextSibling);
	},

	// Adds "Search Thread" box to document - old search
	addOldThreadSearchBox: function(doc, forumid, threadid, searchThis, placeHere)
	{
		var newSearchBox = doc.createElement('li');
		var newSearchForm = doc.createElement('form');
		newSearchBox.appendChild(newSearchForm);
		newSearchForm.action = 'http://forums.somethingawful.com/f/search/submit';
		newSearchForm.method = 'post';
		newSearchForm.className = 'threadsearch'; 
		var newSearchDiv = doc.createElement('div');
		newSearchDiv.setAttribute('id','salrsearchdiv');
		newSearchForm.appendChild(newSearchDiv);
		PageUtils.addHiddenFormInput(doc,newSearchDiv,'forumids',forumid);
		PageUtils.addHiddenFormInput(doc,newSearchDiv,'groupmode','0');
		PageUtils.addHiddenFormInput(doc,newSearchDiv,'opt_search_posts','on');
		PageUtils.addHiddenFormInput(doc,newSearchDiv,'perpage','20');
		PageUtils.addHiddenFormInput(doc,newSearchDiv,'search_mode','ext');
		PageUtils.addHiddenFormInput(doc,newSearchDiv,'show_post_previews','1');
		PageUtils.addHiddenFormInput(doc,newSearchDiv,'sortmode','1');
		var newSearchText = doc.createElement('input');
		newSearchText.setAttribute('id','salrsearchbox');
		newSearchText.setAttribute('required','');
		newSearchText.size = '25';
		newSearchText.placeholder = ' Added by SALR';
		newSearchDiv.appendChild(newSearchText);
		var newSearchButton = doc.createElement('input');
		newSearchButton.type = 'submit';
		newSearchButton.value = 'Search thread';
		newSearchDiv.appendChild(newSearchButton);

		// Don't accidentally trigger keyboard navigation
		newSearchText.addEventListener("keypress", function(e) { e.stopPropagation(); }, true);

		// Work some magic on submit
		newSearchForm.addEventListener('submit', function(event)
		{
			event.preventDefault();
			PageUtils.addHiddenFormInput(doc,newSearchForm,'keywords','threadid:'+threadid+' '+newSearchText.value);
			newSearchForm.submit();
		}, false);
		placeHere.parentNode.insertBefore(newSearchBox,placeHere.nextSibling);
	},

	// Convert image/videos links in threads to inline images/videos
	// @param: post body (td), document body
	// @return: nothing
	convertSpecialLinks: function(postbody, doc)
	{
		var newImg, newLink, vidIdSearch, vidid, vidsrc, imgNum, imgLink;
		var linksInPost = PageUtils.selectNodes(doc, postbody, "descendant::A");
		var imagesInPost = PageUtils.selectNodes(doc, postbody,
		 "descendant::IMG[not(contains(@src,'somethingawful.com/safs/smilies') or contains(@src,'somethingawful.com/forumsystem/emoticons') or contains(@src,'somethingawful.com/images/smilies'))]");
		var thumbnailAllImages = Prefs.getPref("thumbnailAllImages");
		var maxWidth = Prefs.getPref("maxWidthOfConvertedImages");
		var maxHeight = Prefs.getPref("maxHeightOfConvertedImages");
		if (maxHeight)
			maxHeight += "px";
		if (maxWidth)
			maxWidth += "px";
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
		var enableVideoEmbeds = Prefs.getPref("enableVideoEmbedder");
		if (enableVideoEmbeds)
			var videoEmbedderBG = Prefs.getPref("videoEmbedderBG");

		if (unconvertImages)
		{
			for (var j in imagesInPost)
			{
				var anImage = imagesInPost[j];
				newLink = doc.createElement("a");
				newLink.href = anImage.src;
				newLink.title = "Image unconverted by SALR";
				newLink.textContent = "[Image hidden by SALR, click to view]";
				newLink.style.border = "1px dashed red";
				if (anImage.parentNode.tagName && (anImage.parentNode.tagName.search(/^a$/i) > -1))
				{
					if (anImage.parentNode.href == anImage.src)
					{
						anImage.parentNode.replaceChild(doc.createTextNode("[Image hidden by SALR; click to view]"), anImage);
					}
					else
					{
						if (anImage.parentNode.parentNode.lastChild == anImage.parentNode)
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
					anImage.parentNode.replaceChild(newLink, anImage);
				}
			}
		}


		for (var i in linksInPost)
		{
			var link = linksInPost[i];

			if (convertImages && (link.href.search(/\.(gif|jpg|jpeg|png)(#.*)?(%3C\/a%3E)?$/i) > -1))
			{
				// this doesn't actually work yet
				//if ((link.src.search(/imagesocket\.com/i) > -1) && (link.src.search(/content\.imagesocket\.com/i) == -1))
				//{
					//link.src = link.href.replace(/imagesocket/, 'content.imagesocket');
				//}
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
				 link.textContent.search(/http:/i) == 0)
				{
					// Don't replace a (hopefully) good image with a broken link:
					if (link.firstChild && link.firstChild.tagName && link.firstChild.tagName.toLowerCase() == 'img' && link.firstChild.src)
					{
						let oldImgSrc = link.firstChild.src;
						/* Hacky workaround for bad forum JS:
							Remove this and restore old logic after the forum JS gets removed. */
						let imgurImageInLink = oldImgSrc.match(/^https?\:\/\/(?:www|i)\.imgur\.com\/(.{5,})(s|l|t)\.(jpg|gif|png)$/i);
						if (imgurImageInLink)
						{
							let badForumJSLinkCatcher = new RegExp("^https?\:\/\/(?:www|i)\.imgur\.com\/(?:" + imgurImageInLink[1] + ")\.(jpg|gif|png)$", "i");
							if (link.href.match(badForumJSLinkCatcher))
							{
								let cachedValidation = DB.imgurWorkaroundCache[imgurImageInLink[1]];
								switch (cachedValidation)
								{
									case true:
										link.textContent = '';
										link.parentNode.replaceChild(newImg, link);
										break;
									case false:
										newImg.src = oldImgSrc;
										newImg.title = "Forum bug-created link removed by SALR";
										newImg.style.border = "none";
										link.textContent = '';
										link.parentNode.replaceChild(newImg, link);
										break;
									default:
										let XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");
										let imgurApiTarg = "https://api.imgur.com/2/image/" + imgurImageInLink[1] + ".json";
										let imgurChecker = new XMLHttpRequest();
										let linktoCheck = link;
										let newImgtoCheck = newImg;
										imgurChecker.open("GET", imgurApiTarg, true);
										imgurChecker.onreadystatechange = function()
										{
											if (imgurChecker.readyState === 4)
											{
												DB.imgurWorkaroundCache[imgurImageInLink[1]] = true;
												if (imgurChecker.status === 404)
												{
													newImgtoCheck.src = oldImgSrc;
													newImgtoCheck.title = "Forum bug-created link removed by SALR";
													newImgtoCheck.style.border = "none";
													DB.imgurWorkaroundCache[imgurImageInLink[1]] = false;
												}
												linktoCheck.textContent = '';
												linktoCheck.parentNode.replaceChild(newImgtoCheck, linktoCheck);
												// Since this is delayed, check if we should thumbnail it
												if (thumbnailAllImages)
												{
													if (maxWidth)
														newImgtoCheck.style.maxWidth = maxWidth;
													if (maxHeight)
														newImgtoCheck.style.maxHeight = maxHeight;
													if (maxWidth || maxHeight)
													{
														newImgtoCheck.addEventListener("click",
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
										}.bind(this);
										imgurChecker.send(null);
										break;
								}
							}
							else
							{
								link.textContent = '';
								link.parentNode.replaceChild(newImg, link);
							}
						}
						else
						{
							link.textContent = '';
							link.parentNode.replaceChild(newImg, link);
						}
						// End hacky workaround
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
				let ytTest = link.href.match(/^https?\:\/\/(?:(?:www|[a-z]{2})\.)?(?:youtube\.com\/watch\?(?:feature=.*?&)?v=|youtu\.be\/)([-_0-9a-zA-Z]+)/i);
				if (ytTest && ytTest[1])
				{
					link.style.backgroundColor = videoEmbedderBG;
					// Don't add yt icon/class if there's a direct image child
					if (!link.firstChild || link.firstChild.nodeName.toLowerCase() != "img")
					{
						if (!link.className.match(/bbtag_video/))
							link.className += " bbtag_video";
						link.style.backgroundImage = 'url("chrome://salastread/skin/yt-icon.png")';
					}
					if (Prefs.getPref('videoEmbedderGetTitles'))
						this.getYTVideoTitle(link, ytTest[1]);
					link.addEventListener('click', ShowThreadHandler.SALR_vidClick, false);
				}
				else if ((link.href.search(/^http\:\/\/video\.google\.c(om|a|o\.uk)\/videoplay\?docid=([-0-9]+)/i) > -1) ||
				 link.href.match(/^https?\:\/\/(?:.)+\.(webm|gifv)$/i) ||
				 link.href.match(/^https?\:\/\/i\.imgur\.com\/(?:.)+\.gifv$/i))
				{
					link.style.backgroundColor = videoEmbedderBG;
					link.addEventListener('click', ShowThreadHandler.SALR_vidClick, false);
				}
			}
		}
	},

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
			if (thumbnailAllImages && image.className.search(/timg/i) == -1 && (image.parentNode === postbody || image.parentNode.nodeName.toLowerCase() == 'blockquote'))
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

			if (image.src.match(/waffleimages\.com/i))
			{
				var match = image.src.match(/waffleimages\.com\/([0-9a-f]{40})\/.*(jpe?g|png|gif)(?:#via=salr)?$/i);
				if (match)
				{
					var hash = match[1];
					var ext = match[2];
					if (ext == 'jpeg')
						ext = 'jpg';
					var newSrc = 'http://randomwaffle.gbs.fm/images/' + hash.substr(0,2) + '/' + hash + '.' + ext;
					image.setAttribute('src', newSrc);
				}
			}
		}
	},

	// util functions for pending video titles
	_clearPendingVidLinks: function(vId)
	{
		if (vId)
		{
			if (this._pendingVideoTitles.hasOwnProperty(vId))
				delete this._pendingVideoTitles[vId];
		}
		else
		{
			for (var someVid in this._pendingVideoTitles)
				if (this._pendingVideoTitles.hasOwnProperty(someVid))
					delete this._pendingVideoTitles[someVid];
		}
	},

	_addPendingVidLink: function(vId, link)
	{
		if (this._vidHasPendingLinks(vId))
			this._pendingVideoTitles[vId].push(link);
		else
			this._pendingVideoTitles[vId] = [link];
	},

	_vidHasPendingLinks: function (vId)
	{
		return (this._pendingVideoTitles[vId] && this._pendingVideoTitles[vId].length > 0);
	},

	getYTVideoTitle: function(link, vidId)
	{
/*	var dConsole = Components.classes["@mozilla.org/consoleservice;1"]
		.getService(Components.interfaces.nsIConsoleService); */

		// Give up if it already has some kind of title or image
		if (link.innerHTML && !link.innerHTML.match(/^http/))
			return;

		// See if we need to make an API request at all
		var cachedTitle = DB.videoTitleCache[vidId];
		if (cachedTitle != null)
		{
			link.textContent = cachedTitle;
			link.style.fontWeight = "bold";
		}
		// Are we already getting the title for this video somewhere else?
		else if (this._vidHasPendingLinks(vidId))
		{
			this._addPendingVidLink(vidId, link);
		}
		else
		{
			// Add to pending list
			this._addPendingVidLink(vidId, link);
			// Get the title using YouTube's v3 API
			var XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");
			// Protect our secrets from lazy spiders
			var ytApiTarg = "https://www.googleapis.com/youtube/v3/videos?id=" + vidId + atob("JmtleT1BSXphU3lBTWJKVW1NMlhaSG9telpLaXRNS2FFd2Z3blpOekZESUk=") + "&fields=items(snippet(title))&part=snippet";
			var ytTitleGetter = new XMLHttpRequest();
			ytTitleGetter.open("GET", ytApiTarg, true);
			ytTitleGetter.setRequestHeader('Origin', "http://forums.somethingawful.com");
			ytTitleGetter.ontimeout = function()
			{
				this._clearPendingVidLinks(vidId);
			}.bind(this);
			ytTitleGetter.onreadystatechange = function()
			{
				if (ytTitleGetter.readyState == 4)
				{
					var newTitle = null;
					if (ytTitleGetter.status == 400)
					{
						newTitle = "(ERROR: Video does not exist; click to try to play anyway)";
					}
					else if (ytTitleGetter.status == 404)
					{
						newTitle = "(ERROR: Video unavailable; click to try to play anyway)";
					}
					else if (ytTitleGetter.status == 403)
					{
						newTitle = "(ERROR: Private or removed video; click to try to play anyway)";
					}
					else if (ytTitleGetter.status == 200)
					{
						var ytResponse = JSON.parse(ytTitleGetter.responseText);
						if (ytResponse.items[0] && ytResponse.items[0].snippet.title)
							newTitle = ytResponse.items[0].snippet.title;
						else
							newTitle = "(ERROR: Video unavailable or couldn't get title; click to try to play anyway)";
					}
					if (newTitle)
					{
						DB.videoTitleCache[vidId] = newTitle;
						while (this._vidHasPendingLinks(vidId))
						{
							let popLink = this._pendingVideoTitles[vidId].pop();
							try
							{
								popLink.textContent = newTitle;
								popLink.style.fontWeight = "bold";
							}
							catch (e)
							{
								PageUtils.logToConsole("Pending youtube title error: " + e);
								continue;
							}
							if (this._vidHasPendingLinks(vidId) == false)
								delete this._pendingVideoTitles[vidId];
						}
					}
				}
			}.bind(this);
			ytTitleGetter.send(null);
		}
	},

	SALR_vidClick: function(e)
	{
		e.preventDefault();
		e.stopPropagation();

		var link = e.currentTarget;

		//if they click again hide the video
		if (link.nextSibling)
		{
			var video = link.nextSibling.firstChild;
			if (video && video.className === 'salr_video')
			{
				link.parentNode.removeChild(link.nextSibling);
				return;
			}
		}

		//figure out the video type
		var videoId, videoType, videoTLD, yt_subd, yt_starttime, yt_start;

		var videoIdSearch = link.href.match(/^https?\:\/\/((?:www|[a-z]{2})\.)?(?:youtube\.com\/watch\?(?:feature=.*?&)?v=|youtu\.be\/)([-_0-9a-zA-Z]+)(?:.*?t=(?:(\d*)h)?(?:(\d*)m)?(?:(\d*)s?)?)?/);
		if (videoIdSearch)
		{
			yt_subd = (videoIdSearch[1] == null ? "www." : videoIdSearch[1]);
			videoId = videoIdSearch[2];
			videoType = "youtube";
			yt_starttime = (videoIdSearch[3] == null ? 0 : parseInt(videoIdSearch[3])) * 3600 + (videoIdSearch[4] == null ? 0 : parseInt(videoIdSearch[4])) * 60 + (videoIdSearch[5] == null ? 0 : parseInt(videoIdSearch[5]));
			yt_start = yt_starttime === 0 ? '' : 'start=' + yt_starttime;
		}
		else
		{
			var matchGV = link.href.match(/^http\:\/\/video\.google\.c(om|a|o\.uk)\/videoplay\?docid=([-0-9]+)/);
			if (matchGV)
			{
				videoTLD = matchGV[1];
				videoId = matchGV[2];
				videoType = "google";
			}
			else
			{
				var matchGifv = (link.href.match(/^https?\:\/\/i\.imgur\.com\/(.)+\.gifv$/i));
				// Handle imgur gifv
				if (matchGifv && matchGifv[1])
				{
					videoType = 'gifv';
					videoId = matchGifv[1];
				}
				// Handle WebM
				else if (link.href.match(/^https?\:\/\/(?:.)+\.webm$/i))
				{
					videoType = 'webm';
				}
			}
		}

		if (videoType)
		{
			var vidsize = Prefs.getPref("videoEmbedSize");
			var vidwidth, vidheight;

			if (vidsize === "gigantic")
			{
				vidwidth = 1280;
				vidheight = 750;
			}
			else if (vidsize === "large")
			{
				vidwidth = 854;
				vidheight = 510;
			}
			else if (vidsize === "medium")
			{
				vidwidth = 640;
				vidheight = 390;
			}
			else if (vidsize === "small")
			{
				vidwidth = 560;
				vidheight = 345;
			}
			else if (vidsize === "tiny")
			{
				vidwidth = 480;
				vidheight = 300;
			}
			else //if (vidsize == "custom")
			{
				vidwidth = Prefs.getPref("videoEmbedCustomWidth");
				vidheight = Prefs.getPref("videoEmbedCustomHeight");
			}

			//create the embedded elements (p containing video for linebreaky goodness)
			var doc = e.originalTarget.ownerDocument;
			var p = doc.createElement("p");

			switch (videoType)
			{
				case "webm":
					var webmEmbed = doc.createElement("video");
					webmEmbed.textContent = "ERROR! Something went wrong or your browser just can't play this video.";
					webmEmbed.setAttribute('src',link.href);
					webmEmbed.setAttribute('type','video/webm');
					webmEmbed.setAttribute('class', 'salr_video');
					webmEmbed.setAttribute('width', vidwidth);
					webmEmbed.controls = true;
					p.appendChild(webmEmbed);
					break;
				case "gifv":
					// Special code for imgur gifv - looping webm/mp4
					var gifvEmbed = doc.createElement("video");
					gifvEmbed.textContent = "ERROR! Something went wrong or your browser just can't play this video.";
					gifvEmbed.setAttribute('class', 'salr_video');
					gifvEmbed.setAttribute('width', vidwidth);
					gifvEmbed.setAttribute('poster',link.href.replace(/\.gifv$/i,'h.jpg'));
					gifvEmbed.controls = true;
					gifvEmbed.autoplay = true;
					gifvEmbed.muted = true;
					gifvEmbed.loop = true;
					var gifvSource = doc.createElement("source");
					gifvSource.setAttribute('src',link.href.replace(/\.gifv$/i,'.mp4'));
					gifvSource.setAttribute('type','video/mp4');
					gifvEmbed.appendChild(gifvSource);
					gifvSource = doc.createElement("source");
					gifvSource.setAttribute('src',link.href.replace(/\.gifv$/i,'.webm'));
					gifvSource.setAttribute('type','video/webm');
					gifvEmbed.appendChild(gifvSource);
					p.appendChild(gifvEmbed);
					break;
				case "google":
					var embed = doc.createElement("EMBED");
					embed.setAttribute('width', 450);
					embed.setAttribute('height', 370);
					embed.setAttribute('type', "application/x-shockwave-flash");
					embed.setAttribute('class', 'salr_video');
					embed.setAttribute('id', videoId);
					embed.setAttribute('flashvars', '');
					embed.setAttribute('src', 'http://video.google.c' + videoTLD + '/googleplayer.swf?docId=' + videoId + '&hl=en&fs=true');
					embed.setAttribute('allowfullscreen', "true");
					p.appendChild(embed);
					break;
				case "youtube":
					// Figure out quality and size to use
					var vidqual = Prefs.getPref("videoEmbedQuality");
					var qualstring = '';
					if (vidqual === "hd1080")
						qualstring = 'vq=hd1080';
					else if (vidqual === "hd")
						qualstring = 'vq=hd720';
					else if (vidqual === "hq")
						qualstring = 'vq=large';
					else if (vidqual === "low")
						qualstring = 'vq=small';

					// Format for URL:
					if (qualstring !== '' && yt_start !== '')
						yt_start = '&' + yt_start;
					if (qualstring !== '' || yt_start !== '')
						qualstring = '?' + qualstring;

					var embedFrame = doc.createElement("iframe");
					embedFrame.setAttribute('width', vidwidth);
					embedFrame.setAttribute('height', vidheight);
					embedFrame.setAttribute('class', 'salr_video');
					embedFrame.setAttribute('src', "http://" + yt_subd + "youtube.com/embed/" + videoId + qualstring + yt_start);
					embedFrame.setAttribute('frameborder', '0');
					embedFrame.setAttribute('mozallowfullscreen', true);
					p.appendChild(embedFrame);
					break;
			}
			//inserts video after the link
			link.parentNode.insertBefore(p, link.nextSibling);
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
