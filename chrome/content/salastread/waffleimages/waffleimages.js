function checkDrag(event)
{
	// Enable dropping if something valid is dragged onto our window
	var isFile = event.dataTransfer.types.contains("application/x-moz-file");
	if (isFile)
		event.preventDefault();
}

function doDrop(event)
{
	try
	{
		var dropFile = event.dataTransfer.mozGetDataAt("application/x-moz-file", 0);
		if (dropFile instanceof Components.interfaces.nsIFile)
		{
			var allowed = [ 'jpg', 'jpeg', 'png', 'gif', 'apng', 'tiff', 'tif', 'bmp' ];
			var testExt = dropFile.path.split('.');
			if (allowed.indexOf(testExt[testExt.length - 1]) != -1)
			{
				var uploadmode = document.getElementById("urlopt");
				uploadmode.value = "file";
				var ufile = document.getElementById("img");
				//alert("filename = " + dropFile.path);
				ufile.type = "file";
				ufile.value = dropFile.path;
				//alert("ufilename = " + ufile.value);
				document.getElementById("uploaderform").submit();
				document.getElementById("choosebtn").label = "Please wait...";
				document.getElementById("choosebtn").disabled = true;
				document.getElementById("choosehttpbtn").disabled = true;

				//document.getElementById("imgTag").src = fp.file.path;

				document.getElementById("submitframe").addEventListener("DOMContentLoaded", iframeDCL, false);
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

function chooseImage()
{
	try
	{
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"]
				.createInstance(nsIFilePicker);
		fp.init(window, "Select an Image to Upload", nsIFilePicker.modeOpen);
		fp.appendFilters( nsIFilePicker.filterImages );
		var res = fp.show();
		if ( res == nsIFilePicker.returnOK ) {
			var uploadmode = document.getElementById("urlopt");
			uploadmode.value = "file";
			var ufile = document.getElementById("img");
			//alert("filename = " + fp.file.target);
			ufile.type = "file";
			ufile.value = fp.file.path;
			//alert("ufilename = " + ufile.value);
			document.getElementById("uploaderform").submit();
			document.getElementById("choosebtn").label = "Please wait...";
			document.getElementById("choosebtn").disabled = true;
			document.getElementById("choosehttpbtn").disabled = true;

			//document.getElementById("imgTag").src = fp.file.path;

			document.getElementById("submitframe").addEventListener("DOMContentLoaded", iframeDCL, false);
		}
		//alert("uploaded!?");
	}
	catch (e)
	{
		alert( e + "\nLine: "+ e.lineNumber );
	}
}

function chooseHttpImage()
{
	try
	{
		var transloadurl = prompt('Please enter the location of the image you would like to copy to Imgur.', '');
   
		if (transloadurl)
		{
			var uploadmode = document.getElementById("urlopt");
			uploadmode.value = "url";

			var formurl = document.getElementById("img");
			formurl.type = "url";
			formurl.value = transloadurl;
			//alert("transloadurl = " + transloadurl);
			document.getElementById("uploaderform").submit();
			document.getElementById("choosehttpbtn").label = "Please wait...";
			document.getElementById("choosebtn").disabled = true;
			document.getElementById("choosehttpbtn").disabled = true;

			//document.getElementById("imgTag").src = fp.file.path;

			document.getElementById("submitframe").addEventListener("DOMContentLoaded", iframeDCL, false);
		}
		//alert("uploaded!?");
	}
	catch (e)
	{
		alert( e + "\nLine: "+ e.lineNumber );
	}
}

function iframeDCL()
{
	var cdoc = document.getElementById("submitframe").contentDocument;
	//var imgTag = document.getElementById("imgTag");

	var useThumb = false; 

	var imageurl = selectSingleNode(cdoc, cdoc, "//original");
	if (imageurl && imageurl.firstChild)
		imageurl = imageurl.firstChild.nodeValue;
	else
		imageurl = null;

	if (imageurl)
	{
		if (confirm("Click OK to insert a thumbnail linked to the full image, or Cancel to insert the full sized image."))
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
		alert("Upload failed.");
		window.close();
	}
}

