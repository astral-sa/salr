/**
 * @fileoverview Everything to do with embedding video links.
 */

let {Prefs} = require("content/prefsHelper");
let {PageUtils} = require("pageUtils");

let VideoHandler = exports.VideoHandler =
{
	/**
	 * Holds references to links awaiting video titles
	 * @type {Object}
	 */
	_pendingVideoTitles: {},

	/**
	 * Examines a link to see if it needs to be converted to an embeddable video.
	 * @param {Node} link Node snapshot of the link to process.
	 */
	processVideoLink: function(link)
	{
		let videoEmbedderBG = Prefs.getPref("videoEmbedderBG");

		let ytTest = link.href.match(/^https?\:\/\/(?:(?:www|m|[a-z]{2})\.)?(?:youtube\.com\/(?:#\/)?watch\?(?:feature=.*?&)?v=|youtu\.be\/)([-_0-9a-zA-Z]+)/i);
		if (ytTest && ytTest[1])
		{
			link.style.backgroundColor = videoEmbedderBG;
			// Don't add yt icon/class if there's a direct image child
			if (!link.firstChild || link.firstChild.nodeName.toLowerCase() !== "img")
			{
				if (!link.className.match(/bbtag_video/))
					link.className += " bbtag_video";
				link.style.backgroundImage = 'url("chrome://salastread/skin/yt-icon.png")';
			}
			if (Prefs.getPref('videoEmbedderGetTitles'))
				this.getYTVideoTitle(link, ytTest[1]);
			link.addEventListener('click', VideoHandler.videoClickHandler, false);
		}
		else if (link.href.search(/^https?\:\/\/video\.google\.c(om|a|o\.uk)\/videoplay\?docid=([-0-9]+)/i) > -1)
		{
			link.style.backgroundColor = videoEmbedderBG;
			link.addEventListener('click', VideoHandler.videoClickHandler, false);
		}
	},

	/**
	 * Handles an embeddable video link being clicked.
	 * @param {Event} e The click event to handle.
	 */
	videoClickHandler: function videoClickHandler(e)
	{
		let link = e.currentTarget;
		// Clean up if SALR was unloaded.
		if (!VideoHandler)
		{
			link.removeEventListener('click', videoClickHandler, false);
			return;
		}
		e.preventDefault();
		e.stopPropagation();

		//if they click again hide the video
		if (link.nextSibling)
		{
			let video = link.nextSibling.firstChild;
			if (video && video.className === 'salr_video')
			{
				link.parentNode.removeChild(link.nextSibling);
				return;
			}
		}

		VideoHandler.embedVideo(link);
	},

	/**
	 * Embeds a video below its supplied link.
	 * @param {Node} link Node snapshot of target link to embed.
	 */
	embedVideo: function(link)
	{
		// Figure out the video type
		let videoIdSearch = link.href.match(/^https?\:\/\/((?:www|m|[a-z]{2})\.)?(?:youtube\.com\/(?:#\/)?watch\?(?:feature=.*?&)?v=|youtu\.be\/)([-_0-9a-zA-Z]+)(?:.*?t=(?:(\d*)h)?(?:(\d*)m)?(?:(\d*)s?)?)?/);
		if (videoIdSearch)
		{
			let yt_subd = (videoIdSearch[1] == null || videoIdSearch[1] === 'm.') ? "www." : videoIdSearch[1];
			// videoId = videoIdSearch[2];
			let yt_starttime = (videoIdSearch[3] == null ? 0 : parseInt(videoIdSearch[3])) * 3600 + 
				(videoIdSearch[4] == null ? 0 : parseInt(videoIdSearch[4])) * 60 + 
				(videoIdSearch[5] == null ? 0 : parseInt(videoIdSearch[5]));
			let yt_start = yt_starttime === 0 ? '' : 'start=' + yt_starttime;
			VideoHandler.embedYTVideo(link, yt_subd, videoIdSearch[2], yt_start);
			return;
		}

		if (link.href.match(/^https?\:\/\/(?:.)+\.webm$/i))
		{
			VideoHandler.embedWebM(link);
			return;
		}

		let matchGV = link.href.match(/^https?\:\/\/video\.google\.c(om|a|o\.uk)\/videoplay\?docid=([-0-9]+)/);
		if (matchGV)
		{
			// videoTLD = matchGV[1];
			// videoId = matchGV[2];
			VideoHandler.embedGoogleVideo(link, matchGV[1], matchGV[2]);
			return;
		}
	},

	/**
	 * Embeds a YouTube Video.
	 * @param {Node}   link     Node snapshot of target link to embed.
	 * @param {string} yt_subd  Subdomain from the video link to use.
	 * @param {string} videoId  ID of video to embed.
	 * @param {string} yt_start Time string for the embed.
	 */
	embedYTVideo: function(link, yt_subd, videoId, yt_start)
	{
		let doc = link.ownerDocument;
		let p = doc.createElement("p");

		// Figure out quality and size to use
		let vidqual = Prefs.getPref("videoEmbedQuality");
		var qualstring = '';
		if (vidqual === "hd1080")
			qualstring = 'vq=hd1080';
		else if (vidqual === "hd")
			qualstring = 'vq=hd720';
		else if (vidqual === "hq")
			qualstring = 'vq=large';
		else if (vidqual === "low")
			qualstring = 'vq=small';

		let vidSize = VideoHandler.getVidSizeFromPrefs();
		let vidwidth = vidSize.width;
		let vidheight = vidSize.height;

		// Format for URL:
		if (qualstring !== '' && yt_start !== '')
			yt_start = '&' + yt_start;
		if (qualstring !== '' || yt_start !== '')
			qualstring = '?' + qualstring;

		let embedFrame = doc.createElement("iframe");
		embedFrame.width = vidwidth;
		embedFrame.height = vidheight;
		embedFrame.className = 'salr_video';
		embedFrame.src = "https://" + yt_subd + "youtube.com/embed/" + videoId + qualstring + yt_start;
		embedFrame.setAttribute('frameborder', '0');
		embedFrame.setAttribute('allowfullscreen', true);

		//inserts video after the link
		p.appendChild(embedFrame);
		link.parentNode.insertBefore(p, link.nextSibling);
	},

	/**
	 * Embeds a Google Video.
	 * @param {Node}   link     Node snapshot of target link to embed.
	 * @param {string} videoTLD TLD of the domain to use.
	 * @param {string} videoId  ID of video to embed.
	 */
	embedGoogleVideo: function(link, videoTLD, videoId)
	{
		let doc = link.ownerDocument;
		let p = doc.createElement("p");

		let embed = doc.createElement("EMBED");
		embed.setAttribute('width', 450);
		embed.setAttribute('height', 370);
		embed.setAttribute('type', "application/x-shockwave-flash");
		embed.className = 'salr_video';
		embed.setAttribute('id', videoId);
		embed.setAttribute('flashvars', '');
		embed.setAttribute('src', 'https://video.google.c' + videoTLD + '/googleplayer.swf?docId=' + videoId + '&hl=en&fs=true');
		embed.setAttribute('allowfullscreen', "true");

		p.appendChild(embed);
		link.parentNode.insertBefore(p, link.nextSibling);
	},

	/**
	 * Converts string video size preference to usable numbers.
	 * @return {Object} Width and Height from preferences.
	 */
	getVidSizeFromPrefs: function()
	{
		let prefSize = Prefs.getPref("videoEmbedSize");
		let vidSizes = {
			gigantic: [1280, 750],
			large: [854, 510],
			medium: [640, 390],
			small: [560, 345],
			tiny: [480, 300],
			custom: [Prefs.getPref("videoEmbedCustomWidth"), Prefs.getPref("videoEmbedCustomHeight")]
		};

		return {width: vidSizes[prefSize][0], height: vidSizes[prefSize][1]};
	},

	// util functions for pending video titles
	_clearPendingVidLinks: function(vId)
	{
		if (!vId)
			return;
		if (this._pendingVideoTitles.hasOwnProperty(vId))
			delete this._pendingVideoTitles[vId];
	},

	_clearAllPendingVidLinks: function()
	{
		for (let someVid in this._pendingVideoTitles)
			if (this._pendingVideoTitles.hasOwnProperty(someVid))
				delete this._pendingVideoTitles[someVid];
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
		// Give up if it already has some kind of title or image
		if (link.innerHTML && !link.innerHTML.match(/^http/) && link.innerHTML.length > 1)
			return;

		// See if we need to make an API request at all
		let cachedTitle = sendSyncMessage("salastread:GetVideoTitleCacheInfo", vidId);
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
			// Get the title using YouTube's v3 API; protect our secrets from lazy spiders
			var ytApiTarg = "https://www.googleapis.com/youtube/v3/videos?id=" + vidId + atob("JmtleT1BSXphU3lBTWJKVW1NMlhaSG9telpLaXRNS2FFd2Z3blpOekZESUk=") + "&fields=items(snippet(title))&part=snippet";
			var ytTitleGetter = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
			ytTitleGetter.open("GET", ytApiTarg, true);
			ytTitleGetter.setRequestHeader('Origin', "http://forums.somethingawful.com");
			ytTitleGetter.ontimeout = function()
			{
				this._clearPendingVidLinks(vidId);
			}.bind(this);
			ytTitleGetter.onreadystatechange = function()
			{
				if (ytTitleGetter.readyState !== 4)
					return;
				var newTitle = null;
				if (ytTitleGetter.status === 400)
				{
					newTitle = "(ERROR: Video does not exist; click to try to play anyway)";
				}
				else if (ytTitleGetter.status === 404)
				{
					newTitle = "(ERROR: Video unavailable; click to try to play anyway)";
				}
				else if (ytTitleGetter.status === 403)
				{
					newTitle = "(ERROR: Private or removed video; click to try to play anyway)";
				}
				else if (ytTitleGetter.status === 200)
				{
					var ytResponse = JSON.parse(ytTitleGetter.responseText);
					if (ytResponse.items[0] && ytResponse.items[0].snippet.title)
						newTitle = ytResponse.items[0].snippet.title;
					else
						newTitle = "(ERROR: Video unavailable or couldn't get title; click to try to play anyway)";
				}
				if (!newTitle)
					return;
				sendAsyncMessage("salastread:SetVideoTitleCacheInfo", {vidId, newTitle});
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
					if (this._vidHasPendingLinks(vidId) === false)
						delete this._pendingVideoTitles[vidId];
				}
			}.bind(this);
			ytTitleGetter.send(null);
		}
	},

};
