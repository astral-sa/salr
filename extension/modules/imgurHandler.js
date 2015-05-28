/*

	Functions dealing with imgur

*/

let {DB} = require("db");

let ImgurHandler = exports.ImgurHandler =
{
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
						//let linktoCheck = link;
						//let newImgtoCheck = newImg;
						imgurChecker.open("GET", imgurApiTarg, true);
						imgurChecker.onreadystatechange = function() { ImgurHandler.imgurWorkaroundCallback(this, link, newImg, imgurImageInLink[1], options); };
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
	},

};
