
var persistObject;

function ignoreInit()
{
   persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
                    .createInstance(Components.interfaces.nsISupports);
   persistObject = persistObject.wrappedJSObject;

   updateIgnoredThreadList();
}

function updateIgnoredThreadList()
{
   var itl = document.getElementById("ignored_thread_list");
   while (itl.firstChild)
      itl.removeChild(itl.firstChild);

   var seen = new Object();
   for (var i=0; i<persistObject._cachedThreadEntryList.length; i++) {
      var el = persistObject._cachedThreadEntryList[i];
      if (el.getAttribute("ignore")) {
         var id = el.getAttribute("id");
         var title = el.getAttribute("title");
         addThreadToList(id, title, el);
         seen[id] = true;
      }
   }

   var nodes = persistObject.xmlDoc.evaluate("/salastread/thread", persistObject.xmlDoc, null, 7 /* XPathResult.ORDERED_NODE_SNAPSHOT_TYPE */, null);
   for (var x=0; x<nodes.snapshotLength; x++) {
      var tchild = nodes.snapshotItem(x);

      var id = tchild.getAttribute("id");
      if (tchild.nodeName == "thread" && !seen[id]) {
         if (tchild.getAttribute("ignore"))
         {
            var title = tchild.getAttribute("title");
            addThreadToList(id, title, tchild);
            seen[id] = true;
         }
      }
   }
}

function addThreadToList(id, title, el)
{
   var itl = document.getElementById("ignored_thread_list");

   var li = document.createElement("listitem");
   li.setAttribute("label", "["+id+"] "+title);
   li.setAttribute("threadtitle", title);
   li.setAttribute("threadid", id);
   li._el = el;
   for (var i=0; i<itl.childNodes.length; i++)
   {
      var tchild = itl.childNodes[i];
      var tctitle = tchild.getAttribute("threadtitle");
      if (tctitle > title)
      {
         itl.insertBefore(li, tchild);
         return;
      }
   }
   itl.appendChild(li);

   if (!title)
   {
      var xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function() { orsc(id, li, xmlhttp); };
      xmlhttp.open("GET", "http://forums.somethingawful.com/showthread.php?s=&threadid="+id, true);
      xmlhttp.send("");
   }
}

function orsc(id, li, xmlhttp)
{
   if (xmlhttp.readyState == 4) {
      xmlhttp.onreadystatechange = null;
      if (xmlhttp.status == 200) {
         var rtxt = xmlhttp.responseText;
         var tm = rtxt.match(/<title>The Awful Forums \- (.*?)<\/title>/i);
         if (tm) {
            li.setAttribute("label", "["+id+"] "+tm[1]);
            li.setAttribute("threadtitle", tm[1]);
            li._el.setAttribute("title", tm[1]);
         }
      }
   }
}

function itlSelect()
{
   var itl = document.getElementById("ignored_thread_list");
   var itb = document.getElementById("unignoreThreadButton");
   var sellist = itl.selectedItems;
   if (sellist) {
      sellist = sellist[0];
   }
   if (sellist) {
      itb.setAttribute("disabled", false);
   } else {
      itb.setAttribute("disabled", true);
   }
}

function unignoreThread()
{
   var itl = document.getElementById("ignored_thread_list");
   var sellist = itl.selectedItems;
   if (sellist) {
      sellist = sellist[0];
   }
   if (sellist) {
      var el = sellist._el;
      el.removeAttribute("ignore");
   }
   itl.removeChild(sellist);
}
