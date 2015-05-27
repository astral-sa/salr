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
	 * @param {[type]} link The link to process.
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

};
