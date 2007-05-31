
function chooseImage() {
   try {
      var nsIFilePicker = Components.interfaces.nsIFilePicker;
      var fp = Components.classes["@mozilla.org/filepicker;1"]
              .createInstance(nsIFilePicker);
      fp.init(window, "Select an Image to Upload", nsIFilePicker.modeOpen);
      fp.appendFilters( nsIFilePicker.filterImages );
      var res = fp.show();
      if ( res == nsIFilePicker.returnOK ) {
         var ufile = document.getElementById("userfile[1]");
         //alert("filename = " + fp.file.target);
         ufile.value = fp.file.path;
         //alert("ufilename = " + ufile.value);
         document.getElementById("uploaderform").submit();
         document.getElementById("choosebtn").label = "Please wait...";
         document.getElementById("choosebtn").disabled = true;

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
   var txtresult = cdoc.body.innerHTML;
   var sizematch = txtresult.match(/<br>(\d+) x (\d+)<br>(\d+) bytes/);
   var usesel = "select7";
   if (sizematch) {
      var iWidth = sizematch[1];
      var iHeight = sizematch[2];
      var iSize = sizematch[3];
      if (iWidth > 400 || iHeight > 400) {
         if (confirm("This image is larger than 400x400 pixels. Click OK to insert a thumbnail linked to the full image, or Cancel to insert the full sized image."))
            usesel = "select4";
      }
   }

   var dfield = selectSingleNode(cdoc, cdoc.body, "//TEXTAREA[@name='"+usesel+"']");
   if (dfield) {
      var result = dfield.value;
      result = addVia(result);
      window.opener.imageShackResult = result;
      window.close();
   } else {
      alert("Upload failed.");
      window.close();
   }
}

function addVia(txt) {
   var linkmatch = txt.match(/\[url=(.+?)\]\[img\](.+?)\[\/img\]\[\/url\]/i);
   if (linkmatch) {
      var linkUrl = addVia2(linkmatch[1]);
      return "[URL="+linkUrl+"][IMG]"+linkmatch[2]+"[/IMG][/URL]";
   } else {
      var imgmatch = txt.match(/\[img\](.+?)\[\/img\]/i);
      if (imgmatch) {
         var imgUrl = addVia2(imgmatch[1]);
         return "[IMG]"+imgUrl+"[/IMG]";
      } else {
         return txt;
      }
   }
}

function addVia2(inurl) {
   if (inurl.indexOf("?")!=-1) {
      return inurl + "&via=salr";
   } else {
      return inurl + "#via=salr";
   }
}
