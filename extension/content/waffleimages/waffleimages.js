/**
 * @fileoverview Imgur upload tool
 */

/**
 * Drag handler for the image upload tool window
 * @param {Event} event The drag event
 */
function checkDrag(event)
{
	// Enable dropping if something valid is dragged onto our window
	var isFile = event.dataTransfer.types.contains("application/x-moz-file");
	if (isFile)
		event.preventDefault();
}

/**
 * Drop handler for the image upload tool window
 * @param {Event} event The drop event
 */
function doDrop(event)
{
	try
	{
		var dropFile = event.dataTransfer.mozGetDataAt("application/x-moz-file", 0);
		if (dropFile instanceof Components.interfaces.nsIFile)
		{
			var allowed = [ 'jpg', 'jpeg', 'png', 'gif', 'apng', 'tiff', 'tif', 'bmp' ];
			var testExt = dropFile.path.split('.');
			if (allowed.indexOf(testExt[testExt.length - 1]) !== -1)
			{
				imgurUpload(event.dataTransfer.files[0]);
			}
			else
			{
				alert("Disallowed file extension! Allowed: 'jpg', 'jpeg', 'png', 'gif', 'apng', 'tiff', 'tif', 'bmp'");
			}
		}
		else
		{
			alert("Unsupported drop type! This shouldn't ever happen.");
		}
	}
	catch (e)
	{
		alert( e + "\nLine: "+ e.lineNumber );
	}
}

/**
 * Requests user input for a transloaded image URL
 */
function chooseHttpImage()
{
	try
	{
		var transloadurl = prompt('Please enter the location of the image you would like to copy to Imgur.', '');
		if (transloadurl)
		{
			imgurUpload(transloadurl);
		}
	}
	catch (e)
	{
		alert( e + "\nLine: "+ e.lineNumber );
	}
}

/**
 * Uploads a file to imgur.
 * @param {(File|string)} file File or string URL to upload
 */
function imgurUpload(file)
{
	if (!file || (typeof file !== 'string' && !file.type.match(/image.*/)))
	{
		uploadFailed();
		return;
	}

	document.getElementById("choosebtn").label = "Please wait...";
	document.getElementById("choosebtn").disabled = true;
	document.getElementById("choosehttpbtn").disabled = true;

	var fd = new FormData();
	fd.append("image", file);
	var xhr = new XMLHttpRequest();
	xhr.open("POST", "https://api.imgur.com/3/upload.json");
	xhr.setRequestHeader('Authorization', "Client-ID " + atob("YjU2OTk5NDhkMTJiN2Rj"));
	// Ensure this flag is set to prevent issues with third-party cookies being disabled
	xhr.channel.QueryInterface(Components.interfaces.nsIHttpChannelInternal).forceAllowThirdPartyCookie = true;
	xhr.onload = function() {
		//window.alert("Got: " + xhr.responseText);
		processResult(xhr.responseText);
	};
	xhr.onerror = function() {
		uploadFailed();
	};
	var progressBar = document.getElementById('progressbar');
	progressBar.value = 0;
	progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
	xhr.upload.onprogress = function(e) {
		if (e.lengthComputable) {
			progressBar.value = (e.loaded / e.total) * 100;
			progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
		}
	};

	xhr.send(fd);
}

/**
 * Handler for imgur upload result
 * @param {string} respText Response text from imgur.
 */
function processResult(respText)
{
	var imgurResponse = JSON.parse(respText);
	if (!imgurResponse.data || !imgurResponse.data.link)
	{
		uploadFailed();
		return;
	}

	var useThumb;
	var imageurl = imgurResponse.data.link;
	if (imageurl)
	{
		if (imgurResponse.data.deletehash)
			Components.classes["@mozilla.org/consoleservice;1"]
				.getService(Components.interfaces.nsIConsoleService)
				.logStringMessage("Imgur upload success! If for some reason you need to delete it, " +
					"the deletion link is: https://imgur.com/delete/" + imgurResponse.data.deletehash);
		// The imgur API returns only http: URLs, so:
		imageurl = imageurl.replace(/^http:/, 'https:');
		if (confirm("Click OK to insert a thumbnail of the full image, or Cancel to insert the full sized image."))
			useThumb = true;

		var result = "";
		if (useThumb)
			result = "[TIMG]"+imageurl+"[/TIMG]";
		else
			result = "[IMG]"+imageurl+"[/IMG]";
		window.opener.imageShackResult = result;
		window.close();
	}
	else
	{
		uploadFailed();
	}
}

/**
 * Handler for failed image upload
 */
function uploadFailed()
{
	alert("Upload failed.");
	window.close();
}
