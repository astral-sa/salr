//general init
function ignoreInit()
{
	updateIgnoredThreadList();
}

//this is only ever called once but eh
function updateIgnoredThreadList()
{
	var list = document.getElementById("ignored_thread_list");
	while (list.firstChild)
		list.removeChild(list.firstChild);

	var threads = DB.ignoreList;
	for(var id in threads)
	{
		var title = threads[id];
		addThreadToList(id, title);
	}

	// Disable 'Select all' button if the list is empty
	var selbtn = document.getElementById("unignore_selectall_button");
	if (list.firstChild)
		selbtn.setAttribute("disabled", false);
	else
		selbtn.setAttribute("disabled", true);
}

//adds a thread to the list
function addThreadToList(id, title)
{
	var list = document.getElementById("ignored_thread_list");

	var li = document.createElement("listitem");
		li.setAttribute("label", "[" + id + "] " + title);
		li.setAttribute("threadtitle", title);
		li.setAttribute("threadid", id);

	for (var i = (list.childNodes.length - 1); i >= 0 ; i--)
	{
		var tchild = list.childNodes[i];
		var tctitle = tchild.getAttribute("threadtitle");
		if (tctitle > title)
		{
			list.insertBefore(li, tchild);
			return;
		}
	}

	list.appendChild(li);
}

//enables or disables the remove button
function listSelect()
{
	var list = document.getElementById("ignored_thread_list");
	var btn = document.getElementById("unignore_thread_button");
	var selbtn = document.getElementById("unignore_selectall_button");

	if (list.selectedItems.length)
	{
		btn.setAttribute("disabled", false);

		// Update button text
		if (list.selectedItems.length > 1)
			btn.setAttribute("label", "Unignore Selected Threads");
		else
			btn.setAttribute("label", "Unignore Selected Thread");
	}
	else
		btn.setAttribute("disabled", true);

	// Disable 'Select all' button if this results in an empty list
	if (!list.firstChild)
		selbtn.setAttribute("disabled", true);
}

//toggles ignore status on all selected threads when the button is set
function unignoreThreads()
{
	var list = document.getElementById("ignored_thread_list");
	var items = list.selectedItems;

	for(var i = (items.length - 1); i >= 0; i--) {
		var item = items[i];
		DB.toggleThreadIgnore(item.getAttribute("threadid"));
		list.removeChild(item);
	}
}

function selectAllThreads()
{
	var list = document.getElementById("ignored_thread_list");
	list.selectAll();
}