
function initColors() {
   loadColors(isDropDownFYAD());
}

function loadColorLauncher() {
   loadColors(isDropDownFYAD());
}

function isDropDownFYAD() {
   var ft = document.getElementById("forumtype");
   return ft.selectedIndex==1;
}

function HexToNumber(hex) {
   var res = 0;
   for (var i=0; i<hex.length; i++) {
      res = res * 16;
      switch (hex[i]) {
         case "0": res += 0; break;
         case "1": res += 1; break;
         case "2": res += 2; break;
         case "3": res += 3; break;
         case "4": res += 4; break;
         case "5": res += 5; break;
         case "6": res += 6; break;
         case "7": res += 7; break;
         case "8": res += 8; break;
         case "9": res += 9; break;
         case "a": case "A": res += 10; break;
         case "b": case "B": res += 11; break;
         case "c": case "C": res += 12; break;
         case "d": case "D": res += 13; break;
         case "e": case "E": res += 14; break;
         case "f": case "F": res += 15; break;
      }
   }
   return res;
}

function loadColors(isfyad) {
   try {
      if ( isfyad ) {
         document.getElementById("sampletableholder").style.backgroundColor = "#f99";
      } else {
         document.getElementById("sampletableholder").style.backgroundColor = "#fff";
      }
      var gradientsOn = !document.getElementById("toggle_disableGradients").checked;
      var ctypes = new Array("readWithNew", "read", "unread");
      for (var cn=0; cn<ctypes.length; cn++) {
         for (var dnum=0; dnum<5; dnum++) {
            var ctype = ctypes[cn];
            var mobj = document.getElementById(ctype+"-"+dnum);
            var suffix = "";
            if ( ctype=="readWithNew" && dnum==4 ) {
               ctype = "postedInThreadRe";
            } else {
               var isdark = ((dnum % 2)==1);
               suffix = (isdark) ? "Light" : "Dark";
            }
            var prefname = "color_"+ctype+suffix;
            if ( isfyad ) {
               prefname += "FYAD";
            }
            if ( parent.prefobj[prefname] ) {
               var bcolor = parent.prefobj[prefname];
               mobj.style.backgroundColor = bcolor;
               if ( gradientsOn && parent.prefobj[prefname+"Highlight"] ) {
                  var hlcolor = parent.prefobj[prefname+"Highlight"];
                  mobj.style.backgroundRepeat = "repeat-x";
                  mobj.style.backgroundImage = GradientURLFromColor(hlcolor, mobj.offsetHeight);
               } else {
                  mobj.style.backgroundImage = "";
               }
               mobj.style.color = "#000";
            } else {
               mobj.style.backgroundColor = "#666";
               mobj.style.backgroundImage = "";
               mobj.style.color = "#aaa";
            }
            mobj.style.border = "1px solid " +
               ((isfyad) ? "#000" : "#ddd");
         }
      }
      var ptypes = new Array("seenPost", "unseenPost");
      var ldtypes = new Array("Light", "Dark");
      for ( var pn=0; pn<ptypes.length; pn++ ) {
         for ( var ln=0; ln<ldtypes.length; ln++ ) {
            var colorname = ptypes[pn]+ldtypes[ln];
            var suffix = (isfyad) ? "FYAD" : "";
            document.getElementById(colorname).style.backgroundColor =
               parent.prefobj["color_"+colorname+suffix];
            document.getElementById(colorname).style.border = "1px solid " +
               ((isfyad) ? "#000" : "#ddd");
         }
      }
      document.getElementById("sampletable").style.border = "1px solid " +
               ((isfyad) ? "#000" : "#ddd");
      document.getElementById("postsampletable").style.border = "1px solid " +
               ((isfyad) ? "#000" : "#ddd");
   } catch(e) { alert("loadColors error: "+e); }
}

function GradientURLFromColor(hlcolor, height) {
   return "url(x-salr-gradientpng:"+
                     HexToNumber(hlcolor.substring(1,3))+","+
                     HexToNumber(hlcolor.substring(3,5))+","+
                     HexToNumber(hlcolor.substring(5,7))+","+
                     height+")";
}

function loadDefaultColors() {
   for (var tx in parent.prefobj) {
      if (tx.indexOf("defaultcolor_")==0) {
         var cn = tx.substring(7);
         parent.prefobj[cn] = parent.prefobj[tx];
      }
   }
   var isfyad = isDropDownFYAD();
   loadColors(isfyad);
}

var saveevent;
var saveel;
var savectype;
var saveldtype;

function choseTopOrBottom(chosetop) {
   editColor(saveevent, saveel, savectype, saveldtype, chosetop);
}

function editColor(event, targetEl, ctype, ldtype, ishighlight) {
   try {
      var isfyad = isDropDownFYAD();
      var colorname = "color_"+ctype+ldtype + ((isfyad)?"FYAD":"");
      var fcolorname = colorname;
      if (ishighlight) {
         fcolorname += "Highlight";
      }

      if ( parent.prefobj[colorname] ) {
         if ( typeof(ishighlight)=="undefined" ) {
            if ( targetEl.style.backgroundImage != "" ) {
               saveevent = event;
               saveel = targetEl;
               savectype = ctype;
               saveldtype = ldtype;
               document.getElementById("gradientSelectorPopup").showPopup(
                     targetEl, 
                     event.screenX,
                     event.screenY, "context", "at_pointer", "topleft"
                  );
               return;
            } else {
               ishighlight = false;
            }
         }

         var pobj = new Object();
         pobj.value = parent.prefobj[fcolorname].substring(1);
         pobj.accepted = false;
         pobj.isGradient = ishighlight;
         if ( targetEl.style.backgroundImage != "" ) {
            if ( ishighlight ) {
               //alert("0 oc = "+ colorname+"Highlight");
               pobj.otherColor = parent.prefobj[colorname];
            } else {
               if ( parent.prefobj[colorname+"Highlight"] ) {
                  //alert("1 oc = "+ colorname+"Highlight");
                  pobj.otherColor = parent.prefobj[colorname+"Highlight"];
               }
            }
         }
         window.openDialog("chrome://salastread/content/colorpickerdialog.xul",
            "colorpickerdialog",
            "chrome", pobj);
         if (pobj.accepted) {
            var newvalue = "#" + pobj.value;
            if ( ishighlight==true ) {
               targetEl.style.backgroundImage = GradientURLFromColor(newvalue, targetEl.offsetHeight);
            } else {
               targetEl.style.backgroundColor = newvalue;
            }
            parent.prefobj[fcolorname] = newvalue;
         }
      }
   } catch(e) { alert("editColor error: "+e); }
}
