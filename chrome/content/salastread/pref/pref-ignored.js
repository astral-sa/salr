var persistObject;

//general init
function ignoreInit() {
	persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
					.createInstance(Components.interfaces.nsISupports);
	persistObject = persistObject.wrappedJSObject;
	
	updateIgnoredThreadList();
}

//this is only ever called once but eh
function updateIgnoredThreadList() {
	var list = document.getElementById("ignored_thread_list");
	while (list.firstChild)
		list.removeChild(list.firstChild);
	
	var threads = persistObject.ignoreList;
	for(var id in threads) {
		var title = threads[id];
		
		addThreadToList(id, title);
	}
}

//adds a thread to the list
function addThreadToList(id, title) {
	var list = document.getElementById("ignored_thread_list");
	
	var li = document.createElement("listitem");
		li.setAttribute("label", "[" + id + "] " + title);
		li.setAttribute("threadtitle", title);
		li.setAttribute("threadid", id);
	
	for(var i = (list.childNodes.length - 1); i >= 0 ; i--) {
		var tchild = list.childNodes[i];
		var tctitle = tchild.getAttribute("threadtitle");
		if (tctitle > title) {
			list.insertBefore(li, tchild);
			return;
		}
	}
	
	list.appendChild(li);
}

//enables or disables the remove button
function listSelect() {
	var list = document.getElementById("ignored_thread_list");
	var btn = document.getElementById("unignore_thread_button");
	
	if(list.selectedItems.length) {
		btn.setAttribute("disabled", false);
	} else {
		btn.setAttribute("disabled", true);
	}
}

//toggles ignore status on all selected threads when the button is set
function unignoreThreads() {
	var list = document.getElementById("ignored_thread_list");
	var items = list.selectedItems;
	
	for(var i = (items.length - 1); i >= 0; i--) {
		var item = items[i];
		
		persistObject.toggleThreadIgnore(item.getAttribute("threadid"));
		list.removeChild(item);
	}
}