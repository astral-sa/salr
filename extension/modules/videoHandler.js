/*

	Everything to do with videos

*/

let {Prefs} = require("prefs");
let {DB} = require("db");
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

		let ytTest = link.href.match(/^https?\:\/\/(?:(?:www|[a-z]{2})\.)?(?:youtube\.com\/watch\?(?:feature=.*?&)?v=|youtu\.be\/)([-_0-9a-zA-Z]+)/i);
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
		else if ((link.href.search(/^http\:\/\/video\.google\.c(om|a|o\.uk)\/videoplay\?docid=([-0-9]+)/i) > -1) ||
		 link.href.match(/^https?\:\/\/(?:.)+\.(webm|gifv)$/i) ||
		 link.href.match(/^https?\:\/\/i\.imgur\.com\/(?:.)+\.gifv$/i))
		{
			link.style.backgroundColor = videoEmbedderBG;
			link.addEventListener('click', VideoHandler.videoClickHandler, false);
		}
	},

	/**
	 * Handles an embeddable video link being clicked.
	 * @param {Event} e The click event to handle.
	 */
	videoClickHandler: function(e)
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

		// Figure out the video type
		let videoIdSearch = link.href.match(/^https?\:\/\/((?:www|[a-z]{2})\.)?(?:youtube\.com\/watch\?(?:feature=.*?&)?v=|youtu\.be\/)([-_0-9a-zA-Z]+)(?:.*?t=(?:(\d*)h)?(?:(\d*)m)?(?:(\d*)s?)?)?/);
		if (videoIdSearch)
		{
			let yt_subd = (videoIdSearch[1] == null ? "www." : videoIdSearch[1]);
			// videoId = videoIdSearch[2];
			let yt_starttime = (videoIdSearch[3] == null ? 0 : parseInt(videoIdSearch[3])) * 3600 + 
				(videoIdSearch[4] == null ? 0 : parseInt(videoIdSearch[4])) * 60 + 
				(videoIdSearch[5] == null ? 0 : parseInt(videoIdSearch[5]));
			let yt_start = yt_starttime === 0 ? '' : 'start=' + yt_starttime;
			VideoHandler.embedYTVideo(link, yt_subd, videoIdSearch[2], yt_start);
			return;
		}

		let matchGifv = (link.href.match(/^https?\:\/\/i\.imgur\.com\/(.)+\.gifv$/i));
		if (matchGifv && matchGifv[1])
		{
			// gifv ID: matchGifv[1]
			VideoHandler.embedGifv(link);
			return;
		}

		if (link.href.match(/^https?\:\/\/(?:.)+\.webm$/i))
		{
			VideoHandler.embedWebM(link);
			return;
		}

		let matchGV = link.href.match(/^http\:\/\/video\.google\.c(om|a|o\.uk)\/videoplay\?docid=([-0-9]+)/);
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
		embedFrame.src = "http://" + yt_subd + "youtube.com/embed/" + videoId + qualstring + yt_start;
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
		embed.setAttribute('src', 'http://video.google.c' + videoTLD + '/googleplayer.swf?docId=' + videoId + '&hl=en&fs=true');
		embed.setAttribute('allowfullscreen', "true");

		p.appendChild(embed);
		link.parentNode.insertBefore(p, link.nextSibling);
	},

	/**
	 * Embeds a WebM video.
	 * @param {Node} link Node snapshot of target link to embed.
	 */
	embedWebM: function(link)
	{
		let doc = link.ownerDocument;
		let p = doc.createElement("p");

		let vidSize = VideoHandler.getVidSizeFromPrefs();
		let vidwidth = vidSize.width; // Height handled by browser

		let webmEmbed = doc.createElement("video");
		webmEmbed.textContent = "ERROR! Something went wrong or your browser just can't play this video.";
		webmEmbed.src = link.href;
		webmEmbed.setAttribute('type','video/webm');
		webmEmbed.className = 'salr_video';
		webmEmbed.width = vidwidth;
		webmEmbed.controls = true;

		p.appendChild(webmEmbed);
		link.parentNode.insertBefore(p, link.nextSibling);
	},

	/**
	 * Embeds a gifv video (looping webm or mp4).
	 * @param {Node} link Node snapshot of target link to embed.
	 */
	embedGifv: function(link)
	{
		// Special code for imgur gifv - looping webm/mp4
		let doc = link.ownerDocument;
		let p = doc.createElement("p");

		let vidSize = VideoHandler.getVidSizeFromPrefs();
		let vidwidth = vidSize.width; // Height handled by browser

		let gifvEmbed = doc.createElement("video");
		gifvEmbed.textContent = "ERROR! Something went wrong or your browser just can't play this video.";
		gifvEmbed.className = 'salr_video';
		gifvEmbed.width = vidwidth;
		gifvEmbed.poster = link.href.replace(/\.gifv$/i,'h.jpg');
		gifvEmbed.controls = true;
		gifvEmbed.autoplay = true;
		gifvEmbed.muted = true;
		gifvEmbed.loop = true;
		let gifvSource = doc.createElement("source");
		gifvSource.src = link.href.replace(/\.gifv$/i,'.mp4');
		gifvSource.type = 'video/mp4';
		gifvEmbed.appendChild(gifvSource);
		gifvSource = doc.createElement("source");
		gifvSource.src = link.href.replace(/\.gifv$/i,'.webm');
		gifvSource.type ='video/webm';
		gifvEmbed.appendChild(gifvSource);

		p.appendChild(gifvEmbed);
		link.parentNode.insertBefore(p, link.nextSibling);
	},

	/**
	 * Converts string video size preference to usable numbers.
	 * @return {Object} Width and Height from preferences.
	 */
	getVidSizeFromPrefs: function()
	{
		let vidSize = Prefs.getPref("videoEmbedSize");
		let vidwidth;
		let vidheight;

		switch(vidSize)
		{
			case "gigantic":
				vidwidth = 1280;
				vidheight = 750;
				break;
			case "large":
				vidwidth = 854;
				vidheight = 510;
				break;
			case "medium":
				vidwidth = 640;
				vidheight = 390;
				break;
			case "small":
				vidwidth = 560;
				vidheight = 345;
				break;
			case "tiny":
				vidwidth = 480;
				vidheight = 300;
				break;
			default: // vidsize is "custom"
				vidwidth = Prefs.getPref("videoEmbedCustomWidth");
				vidheight = Prefs.getPref("videoEmbedCustomHeight");
				break;
		}
		return {width: vidwidth, height: vidheight};
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
							if (this._vidHasPendingLinks(vidId) === false)
								delete this._pendingVideoTitles[vidId];
						}
					}
				}
			}.bind(this);
			ytTitleGetter.send(null);
		}
	},

};
