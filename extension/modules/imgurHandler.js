/*

	Functions dealing with imgur

*/

let {DB} = require("db");
let {PageUtils} = require("pageUtils");

let ImgurHandler = exports.ImgurHandler =
{
	/**
	 * Cache of valid gif IDs we can convert to gifv.
	 * @type {Object}
	 */
	imgurGifCache: {},

	/**
	 * List of pending Gif links so we only make one request per image ID.
	 * @type {Object}
	 */
	_pendingGifs: {},

	/**
	 * Checks if we can replace a supported GIF with its video representation.
	 * @param {Node} image Node snapshot of image element to check.
	 */
	checkImgurGif: function(image)
	{
		if (!image.src.match(/\.gif$/i))
			return;
		let imgurGif = image.src.match(/^https?\:\/\/(?:www|i)\.imgur\.com\/(.*)\.gif$/i);
		if (!imgurGif)
			return;
		let cachedValidation = ImgurHandler.imgurGifCache[imgurGif[1]];
		if (cachedValidation === true)
		{
			ImgurHandler.embedNewGifv(ImgurHandler.replaceGifWithLink(image));
			return;
		}
		else if (cachedValidation === false)
		{
			return;
		}

		let link = ImgurHandler.replaceGifWithLink(image);
		if (ImgurHandler._gifHasPendingLinks(imgurGif[1]))
		{
			ImgurHandler._addPendingGifLink(imgurGif[1], link);
		}
		else
		{
			ImgurHandler._addPendingGifLink(imgurGif[1], link);
			let imgurApiTarg = "https://api.imgur.com/2/image/" + imgurGif[1] + ".json";
			let imgurChecker = new XMLHttpRequest();
			imgurChecker.open("GET", imgurApiTarg, true);
			imgurChecker.onreadystatechange = ImgurHandler.imgurGifCallback.bind(imgurChecker, link, imgurGif[1]);
			imgurChecker.ontimeout = function()
			{
				ImgurHandler._clearPendingGifLinks(imgurGif[1]);
			};
			imgurChecker.send(null);
		}
	},

	/**
	 * Replaces a gif with a [Loading...] link to that gif while we check
	 *     to see if we can convert it to a gifv.
	 * @param {Node} anImage Node snapshot of image element to check.
	 */
	replaceGifWithLink: function(anImage)
	{
		let doc = anImage.ownerDocument;
		let newLink = doc.createElement("a");
		newLink.href = anImage.src;
		// Replace original image with placeholder to halt its loading
		anImage.setAttribute('src', "chrome://salastread/skin/sa.png");
		newLink.textContent = "[Loading...]";
		anImage.parentNode.replaceChild(newLink, anImage);
		return newLink;
	},

	/**
	 * Restores a Gif if it turns out we can't convert it to Gifv.
	 * @param {Element} link Gif link to re-convert.
	 */
	restoreGif: function(link)
	{
		let doc = link.ownerDocument;
		let newImg = doc.createElement("img");
		newImg.src = link.href;
		link.parentNode.replaceChild(newImg, link);
		// TODO - image scaling?
	},

	/**
	 * Callback function for imgur gif check
	 * @param {Element} link    Link to image being checked.
	 * @param {string}  imgurId Image ID of imgur image being checked.
	 */
	imgurGifCallback: function(link, imgurId)
	{
		if (this.readyState !== 4)
			return;
		if (this.status === 404)
		{
			ImgurHandler.resolvePendingGifs(imgurId, false);
			return;
		}
		if (this.status === 403) // API limit hit
		{
			ImgurHandler.resolvePendingGifs(imgurId, null);
			return;
		}
		if (this.status === 200)
		{
			let imgurResponse = JSON.parse(this.responseText);
			if (!imgurResponse || !imgurResponse.image || !imgurResponse.image.image)
				return;
			let animated = imgurResponse.image.image.animated;
			if (!animated || animated !== "true")
			{
				ImgurHandler.resolvePendingGifs(imgurId, false);
				return;
			}
			ImgurHandler.resolvePendingGifs(imgurId, true);
		}
	},

	/**
	 * Iterates through our list of pending Gifs for an imgur ID and converts
	 *     or unconverts them as appropriate.
	 * @param {string}  imgurId ID of pending imgur images to resolve.
	 * @param {boolean} success Whether we convert to video or back to gif.
	 */
	resolvePendingGifs: function(imgurId, success)
	{
		ImgurHandler.imgurGifCache[imgurId] = success;
		while (this._gifHasPendingLinks(imgurId))
		{
			let popLink = this._pendingGifs[imgurId].pop();
			try
			{
				if (success === true)
					ImgurHandler.embedNewGifv(popLink, imgurId);
				else
					ImgurHandler.restoreGif(popLink);
			}
			catch (e)
			{
				PageUtils.logToConsole("Pending gifv error: " + e);
				continue;
			}
			if (this._gifHasPendingLinks(imgurId) === false)
				this._pendingGifs[imgurId] = null;
		}
	},

	/**
	 * Converts a link to a gifv embed.
	 * @param {Element} link Element to replace with a gifv embed.
	 */
	embedNewGifv: function(link)
	{
		let doc = link.ownerDocument;

		let gifvEmbed = doc.createElement("video");
		gifvEmbed.textContent = "ERROR! Something went wrong or your browser just can't play this video.";
		gifvEmbed.controls = true;
		gifvEmbed.autoplay = true;
		gifvEmbed.muted = true;
		gifvEmbed.loop = true;
		gifvEmbed.addEventListener('error', ImgurHandler.onGifvError.bind(null, link), true);
		let gifvSource = doc.createElement("source");
		gifvSource.src = link.href.replace(/\.gif$/i,'.mp4');
		gifvSource.type = 'video/mp4';
		gifvEmbed.appendChild(gifvSource);
		gifvSource = doc.createElement("source");
		gifvSource.src = link.href.replace(/\.gif$/i,'.webm');
		gifvSource.type ='video/webm';
		gifvEmbed.appendChild(gifvSource);

		link.parentNode.replaceChild(gifvEmbed, link);
	},

	/**
	 * Error callback function for mp4/webm player.
	 * @param {Element} link  Video element to re-convert to Gif.
	 * @param {Event}   event The error event.
	 */
	onGifvError: function(link, event)
	{
		let video = event.target.parentNode;
		video.removeEventListener('error', ImgurHandler.onGifvError.bind(null, link), true);
		let doc = video.ownerDocument;
		let imgurId = link.href.match(/^https?\:\/\/(?:www|i)\.imgur\.com\/(.*)\.gif$/i)[1];
		ImgurHandler.imgurGifCache[imgurId] = false;
		let newImg = doc.createElement("img");
		newImg.src = link.href;
		try
		{
			video.parentNode.replaceChild(newImg, video);
		}
		catch(e) {}
		// TODO - image scaling?
	},

	// util functions for pending gifs
	_clearPendingGifLinks: function(imgurId)
	{
		if (!imgurId)
			return;
		if (ImgurHandler._pendingGifs.hasOwnProperty(imgurId))
			delete ImgurHandler._pendingGifs[imgurId];
	},

	_clearAllPendingGifLinks: function()
	{
		for (let someVid in ImgurHandler._pendingGifs)
			if (ImgurHandler._pendingGifs.hasOwnProperty(someVid))
				delete ImgurHandler._pendingGifs[someVid];
	},

	_addPendingGifLink: function(imgurId, link)
	{
		if (ImgurHandler._gifHasPendingLinks(imgurId))
			ImgurHandler._pendingGifs[imgurId].push(link);
		else
			ImgurHandler._pendingGifs[imgurId] = [link];
	},

	_gifHasPendingLinks: function (imgurId)
	{
		return (ImgurHandler._pendingGifs[imgurId] && ImgurHandler._pendingGifs[imgurId].length > 0);
	},

	/**
	 * Hacky workaround for bad forum JS. Remove this and restore old logic
	 *     some time after the forum JS gets removed.
	 * @param {Node}    link    Node snapshot of target link to embed.
	 * @param {Element} newImg  The new image to use (or not).
	 * @param {Object}  options Values from preferences.
	 */
	needForumWorkaround: function(link, newImg, options)
	{
		let oldImgSrc = link.firstChild.src;

		let imgurImageInLink = oldImgSrc.match(/^https?\:\/\/(?:www|i)\.imgur\.com\/(.{5,})(s|l|t)\.(jpg|gif|png)$/i);
		if (!imgurImageInLink)
		{
			link.textContent = '';
			link.parentNode.replaceChild(newImg, link);
			return;
		}

		let badForumJSLinkCatcher = new RegExp("^https?\:\/\/(?:www|i)\.imgur\.com\/(?:" + imgurImageInLink[1] + ")\.(jpg|gif|png)$", "i");
		if (!link.href.match(badForumJSLinkCatcher))
		{
			link.textContent = '';
			link.parentNode.replaceChild(newImg, link);
			return;
		}

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
				//let linktoCheck = link;
				//let newImgtoCheck = newImg;
				imgurChecker.open("GET", imgurApiTarg, true);
				imgurChecker.onreadystatechange = function() { ImgurHandler.imgurWorkaroundCallback(this, link, newImg, imgurImageInLink[1], options); };
				imgurChecker.send(null);
				break;
		}
	},

	/**
	 * Callback for imgur workaround API requests.
	 * @param {Object}  imgurChecker  The XMLHttpRequest.
	 * @param {Node}    linktoCheck   Node snapshot of target link to embed.
	 * @param {Element} newImgtoCheck The new image to use (or not).
	 * @param {string}  imgurId       Image ID of imgur image being tested.
	 * @param {Object}  options       Values from preferences.
	 */
	imgurWorkaroundCallback: function(imgurChecker, linktoCheck, newImgtoCheck, imgurId, options)
	{
		if (imgurChecker.readyState === 4)
		{
			DB.imgurWorkaroundCache[imgurId] = true;
			if (imgurChecker.status === 404)
			{
				let oldImgSrc = linktoCheck.firstChild.src;
				newImgtoCheck.src = oldImgSrc;
				newImgtoCheck.title = "Forum bug-created link removed by SALR";
				newImgtoCheck.style.border = "none";
				DB.imgurWorkaroundCache[imgurId] = false;
			}
			linktoCheck.textContent = '';
			linktoCheck.parentNode.replaceChild(newImgtoCheck, linktoCheck);
			// Since this is delayed, check if we should thumbnail it
			let thumbnailAllImages = options.thumbnailAllImages;
			let maxWidth = options.maxWidth;
			let maxHeight = options.maxHeight;

			if (!thumbnailAllImages)
				return;
			if (maxWidth)
				newImgtoCheck.style.maxWidth = maxWidth;
			if (maxHeight)
				newImgtoCheck.style.maxHeight = maxHeight;
			if (!maxWidth && !maxHeight)
				return;
			newImgtoCheck.addEventListener("click",
				function()
				{
					if (maxWidth)
						this.style.maxWidth = (this.style.maxWidth == maxWidth) ? "" : maxWidth;
					if (maxHeight)
						this.style.maxHeight = (this.style.maxHeight == maxHeight) ? "" : maxHeight;
				}, false);
		}
	},

};
