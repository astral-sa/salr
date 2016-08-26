/**
 * @fileOverview Everything to do with imgur.
 */

let {PageUtils} = require("../pageUtils");

let ImgurHandler = exports.ImgurHandler =
{
	/**
	 * List of pending Gif images so we only make one request per image ID.
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
		let cachedValidation = sendSyncMessage("salastread:GetImgurGifInfo", imgurGif[1]);
		if (cachedValidation === true)
		{
			ImgurHandler.replaceGifWithPlaceholder(image);
			ImgurHandler.embedNewGifv(image);
			return;
		}
		else if (cachedValidation === false)
		{
			return;
		}

		ImgurHandler.replaceGifWithPlaceholder(image);
		if (ImgurHandler._gifHasPendingItems(imgurGif[1]))
		{
			ImgurHandler._addPendingGifItem(imgurGif[1], image);
		}
		else
		{
			ImgurHandler._addPendingGifItem(imgurGif[1], image);
			let imgurApiTarg = "https://api.imgur.com/3/image/" + imgurGif[1] + ".json";
			let imgurChecker = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
			imgurChecker.open("GET", imgurApiTarg, true);
			imgurChecker.setRequestHeader('Authorization', "Client-ID " + atob("YjU2OTk5NDhkMTJiN2Rj"));
			imgurChecker.onreadystatechange = ImgurHandler.imgurGifCallback.bind(imgurChecker, imgurGif[1]);
			imgurChecker.ontimeout = function()
			{
				ImgurHandler._clearPendingGifItems(imgurGif[1]);
			};
			imgurChecker.send(null);
		}
	},

	/**
	 * Replaces a gif with a placeholder image to halt its loading while
	 *     we check to see if we can convert it to a gifv.
	 * @param {Node} anImage Node snapshot of image element to replace.
	 */
	replaceGifWithPlaceholder: function(anImage)
	{
		anImage.dataset.oldSrc = anImage.src;
		anImage.setAttribute('src', "chrome://salastread/skin/imageuploadicon.png");
	},

	/**
	 * Restores a Gif if it turns out we can't convert it to Gifv.
	 * @param {Node} anImage Node snapshot of gif image to restore.
	 */
	restoreGif: function(anImage)
	{
		anImage.src = anImage.dataset.oldSrc;
		// TODO - image scaling?
	},

	/**
	 * Callback function for imgur gif check
	 * @param {string} imgurId Image ID of imgur image being checked.
	 */
	imgurGifCallback: function(imgurId)
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
			// Model: https://api.imgur.com/models/image
			let imgurResponse = JSON.parse(this.responseText);
			if (!imgurResponse || !imgurResponse.data || !imgurResponse.data.id)
				return;
// data.size, data.nsfw
			if (!imgurResponse.data.animated)
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
		sendAsyncMessage("salastread:SetImgurGifInfo", {imgurId, success});
		while (this._gifHasPendingItems(imgurId))
		{
			let popImage = this._pendingGifs[imgurId].pop();
			try
			{
				if (success === true)
					ImgurHandler.embedNewGifv(popImage, imgurId);
				else
					ImgurHandler.restoreGif(popImage);
			}
			catch (e)
			{
				PageUtils.logToConsole("Pending gifv error: " + e);
				continue;
			}
			if (this._gifHasPendingItems(imgurId) === false)
				this._pendingGifs[imgurId] = null;
		}
	},

	/**
	 * Converts an image to a gifv embed.
	 * @param {Node} anImage Node snapshot of image element to replace with a gifv embed.
	 */
	embedNewGifv: function(anImage)
	{
		let doc = anImage.ownerDocument;

		let gifvEmbed = doc.createElement("video");
		gifvEmbed.textContent = "ERROR! Something went wrong or your browser just can't play this video.";
		gifvEmbed.controls = true;
		gifvEmbed.autoplay = true;
		gifvEmbed.muted = true;
		gifvEmbed.loop = true;
		gifvEmbed.addEventListener('error', ImgurHandler.onGifvError.bind(null, anImage), true);
		let gifvSource = doc.createElement("source");
		gifvSource.src = anImage.dataset.oldSrc.replace(/\.gif$/i,'.webm');
		gifvSource.type ='video/webm';
		gifvEmbed.appendChild(gifvSource);
		gifvSource = doc.createElement("source");
		gifvSource.src = anImage.dataset.oldSrc.replace(/\.gif$/i,'.mp4');
		gifvSource.type = 'video/mp4';
		gifvEmbed.appendChild(gifvSource);

		anImage.parentNode.replaceChild(gifvEmbed, anImage);
	},

	/**
	 * Error callback function for mp4/webm player.
	 * @param {Node}  anImage  Node snapshot of old gif to readd to DOM.
	 * @param {Event} event    The error event.
	 */
	onGifvError: function(anImage, event)
	{
		let video = event.target.parentNode;
		video.removeEventListener('error', ImgurHandler.onGifvError.bind(null, anImage), true);
		let imgurId = anImage.dataset.oldSrc.match(/^https?\:\/\/(?:www|i)\.imgur\.com\/(.*)\.gif$/i)[1];
		let success = false;
		sendAsyncMessage("salastread:SetImgurGifInfo", {imgurId, success});

		anImage.src = anImage.dataset.oldSrc;
		try
		{
			video.parentNode.replaceChild(anImage, video);
		}
		catch(e) {
			// Do nothing
		}
		// TODO - image scaling?
	},

	// util functions for pending gifs
	_clearPendingGifItems: function(imgurId)
	{
		if (!imgurId)
			return;
		if (ImgurHandler._pendingGifs.hasOwnProperty(imgurId))
			ImgurHandler._pendingGifs[imgurId] = null;
	},

	_clearAllPendingGifItems: function()
	{
		for (let someVid in ImgurHandler._pendingGifs)
			if (ImgurHandler._pendingGifs.hasOwnProperty(someVid))
				ImgurHandler._pendingGifs[someVid] = null;
	},

	_addPendingGifItem: function(imgurId, item)
	{
		if (ImgurHandler._gifHasPendingItems(imgurId))
			ImgurHandler._pendingGifs[imgurId].push(item);
		else
			ImgurHandler._pendingGifs[imgurId] = [item];
	},

	_gifHasPendingItems: function (imgurId)
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

		let cachedValidation = sendSyncMessage("salastread:GetImgurWorkaroundInfo", imgurImageInLink[1]);
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
			default: {
				let imgurApiTarg = "https://api.imgur.com/3/image/" + imgurImageInLink[1] + ".json";
				let imgurChecker = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
				imgurChecker.open("GET", imgurApiTarg, true);
				imgurChecker.setRequestHeader('Authorization', "Client-ID " + atob("YjU2OTk5NDhkMTJiN2Rj"));
				imgurChecker.onreadystatechange = function() { ImgurHandler.imgurWorkaroundCallback(this, link, newImg, imgurImageInLink[1], options); };
				imgurChecker.send(null);
				break;
			}
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
			sendAsyncMessage("salastread:SetImgurWorkaroundTrue", imgurId);
			if (imgurChecker.status === 404)
			{
				let oldImgSrc = linktoCheck.firstChild.src;
				newImgtoCheck.src = oldImgSrc;
				newImgtoCheck.title = "Forum bug-created link removed by SALR";
				newImgtoCheck.style.border = "none";
				sendAsyncMessage("salastread:SetImgurWorkaroundFalse", imgurId);
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
