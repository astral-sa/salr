
function initColors() {
   loadColors(isDropDownFYAD(),isDropDownHighlights());
}

function isDropDownHighlights() {
   var ft = document.getElementById("ishighlights");
   return ft.selectedIndex==1;
}

function isDropDownFYAD() {
   var ft = document.getElementById("forumtype");
   return ft.selectedIndex==1;
}

function loadColors(isfyad,ishighlight) {
   for (var thisField in parent.prefobj) {
      if (thisField.indexOf("color_")==0) {
         var hasfyad = false;
         var hashighlight = false;
         var colorname = thisField.substring(6);
         if (colorname.indexOf("FYAD")!=-1) {
            hasfyad = true;
            colorname = colorname.replace("FYAD","");
         }
         if (colorname.indexOf("Highlight")!=-1) {
            hashighlight = true;
            colorname = colorname.replace("Highlight","");
         }
         var tel = document.getElementById("cp_"+colorname);
         //alert("colorname="+colorname+"\ntel="+tel);
         if (tel) {
            if ((isfyad && !hasfyad) || (ishighlight && !hashighlight)) {
               tel.value = "transparent";
               tel.setAttribute("disabled",true);
            } else {
               if (isfyad==hasfyad && ishighlight==hashighlight) {
                  tel.removeAttribute("disabled");
                  //alert("setting "+thisField+" with "+parent.prefobj[thisField]);
                  tel.value = parent.prefobj[thisField];
                  tel.prefName = thisField;
               }
            }
         }
      }
   }
}

function colorChanged(targetEl) {
   var isfyad = isDropDownFYAD();
   var ishighlight = isDropDownHighlights();
   var tid = "color_" + targetEl.id.substring(3) + (isfyad?"FYAD":"") + (ishighlight?"Highlight":"");
   if (targetEl.value != "transparent") {
      if ( parent.prefobj[tid] != targetEl.value ) {
         //alert(tid + ": "+targetEl.value);
         parent.prefobj[tid] = targetEl.value;
      }
   }
}

function setupUserHighlighting() {
   openDialog("chrome://salastread/content/pref/userhighlight/userhighlight.xul",
               "_blank", "chrome,titlebar,modal,resizable");
}

function loadDefaultColors() {
   for (var tx in parent.prefobj) {
      if (tx.indexOf("defaultcolor_")==0) {
         var cn = tx.substring(7);
         parent.prefobj[cn] = parent.prefobj[tx];
      }
   }
   var isfyad = isDropDownFYAD();
   var ishighlight = isDropDownHighlights();
   loadColors(isfyad,ishighlight);
}
