
function chooseImage() {
   try {
      var nsIFilePicker = Components.interfaces.nsIFilePicker;
      var fp = Components.classes["@mozilla.org/filepicker;1"]
              .createInstance(nsIFilePicker);
      fp.init(window, "Select an Image to Upload", nsIFilePicker.modeOpen);
      fp.appendFilters( nsIFilePicker.filterImages );
      var res = fp.show();
      if ( res == nsIFilePicker.returnOK ) {
    	 var wafflemode = document.getElementById("urlopt");
         wafflemode.value = "file";
         var ufile = document.getElementById("file");
         //alert("filename = " + fp.file.target);
         ufile.value = fp.file.path;
         //alert("ufilename = " + ufile.value);
         document.getElementById("uploaderform").submit();
         document.getElementById("choosebtn").label = "Please wait...";
         document.getElementById("choosebtn").disabled = true;
         document.getElementById("choosehttpbtn").disabled = true;

/*
         var itag = document.createElement("img", "http://www.w3.org/1999/xhtml");
         itag.id = "imgTag";
         itag.src = fp.file.path;
         itag.style.visibility = "hidden";
         itag.style.position = "absolute";
         itag.style.left = "0px";
         itag.style.top = "0px";
         document.getElementById("uploaderform").parentNode.appendChild(itag);
         alert("src="+ fp.file.path+"\nw="+itag.naturalWidth+"\nh="+itag.naturalHeight);
*/

         //document.getElementById("imgTag").src = fp.file.path;

         document.getElementById("submitframe").addEventListener("DOMContentLoaded", iframeDCL, false);
      }
      //alert("uploaded!?");
   }
   catch (e) {
      alert( e + "\nLine: "+ e.lineNumber );
   }
}

function chooseHttpImage() {
   try {
   
	  var waffleurl = prompt('Please enter the location of the image you would like to copy to Waffle Images.', '');
   
      if (waffleurl) {
         var wafflemode = document.getElementById("urlopt");
         wafflemode.value = "url";
         
         var waffleformurl = document.getElementById("url");
         waffleformurl.value = waffleurl;
         
         //alert("waffleurl = " + waffleurl);
         
         //alert("ufilename = " + ufile.value);
         document.getElementById("uploaderform").submit();
         document.getElementById("choosehttpbtn").label = "Please wait...";
         document.getElementById("choosebtn").disabled = true;
         document.getElementById("choosehttpbtn").disabled = true;

/*
         var itag = document.createElement("img", "http://www.w3.org/1999/xhtml");
         itag.id = "imgTag";
         itag.src = fp.file.path;
         itag.style.visibility = "hidden";
         itag.style.position = "absolute";
         itag.style.left = "0px";
         itag.style.top = "0px";
         document.getElementById("uploaderform").parentNode.appendChild(itag);
         alert("src="+ fp.file.path+"\nw="+itag.naturalWidth+"\nh="+itag.naturalHeight);
*/

         //document.getElementById("imgTag").src = fp.file.path;

         document.getElementById("submitframe").addEventListener("DOMContentLoaded", iframeDCL, false);
      }
      //alert("uploaded!?");
   }
   catch (e) {
      alert( e + "\nLine: "+ e.lineNumber );
   }
}

function iframeDCL() {
   var cdoc = document.getElementById("submitframe").contentDocument;
   //var imgTag = document.getElementById("imgTag");
  
   var useThumb = false; 
   //var iWidth = imgTag.naturalWidth;
   //var iHeight = imgTag.naturalHeight;
   //alert("nw="+iWidth+"\nnh="+iHeight);
   //if (iWidth > 400 || iHeight > 400) {
   //   if (confirm("This image is larger than 400x400 pixels. Click OK to insert a thumbnail linked to the full image, or Cancel to insert the full sized image."))
   //      useThumb = true;
   //}

   var imageurl = selectSingleNode(cdoc, cdoc, "//imageurl");
   if (imageurl && imageurl.firstChild) {
      imageurl = imageurl.firstChild.nodeValue;
   } else {
      imageurl = null;
   }
   var thumburl = selectSingleNode(cdoc, cdoc, "//thumburl");
   if (thumburl && thumburl.firstChild) {
      thumburl = thumburl.firstChild.nodeValue;
   } else {
      thumburl = null;
   }

   if (imageurl && thumburl) {
      if (confirm("Click OK to insert a thumbnail linked to the full image, or Cancel to insert the full sized image."))
         useThumb = true;
   }

   if (imageurl && (thumburl || !useThumb)) {
      var result = "";
      if (useThumb) {
         result = "[URL="+imageurl+"][IMG]"+thumburl+"[/IMG][/URL]";
      } else {
         result = "[IMG]"+imageurl+"[/IMG]";
      }
      window.opener.imageShackResult = result;
      window.close();
   } else {
      alert("Upload failed.");
      window.close();
   }
}

