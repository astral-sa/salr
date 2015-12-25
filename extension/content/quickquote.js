Components.utils.import("resource://gre/modules/Services.jsm");
function require(module)
{
  let result = {};
  result.wrappedJSObject = result;
  Services.obs.notifyObservers(result, "salr-require", module);
  return result.exports;
}
let {Prefs} = require("prefs");
let {DB} = require("db");
let {PageUtils} = require("pageUtils");
let {QuickQuoteHelper} = require("quickQuoteInterface");
//
// Note: quickquote sticks some extra vars into DB that aren't dealt with by DB.
// This should be dealt with in the quick post overhaul.
//
var quickParams = null;

var hasSpellCheck = false;

var attachedFileName = "";

var imageShackResult = null;
var isDetached = false;

var quoteWaitString = "[[ Please wait, retrieving information... ]]";

function detachFromDocument() {
	isDetached = true;
	document.getElementById("submit-swap").disabled = true;
	document.getElementById("submit-normal").disabled = true;
	document.getElementById("previewbtn").disabled = true;
	document.getElementById("submit-swap").setAttribute("label","Detached");
	document.getElementById("submit-normal").setAttribute("label","Detached");
}

function reattach()
{
	// TODO: Make sure we have everything we need first.
	// need to make sure we still have thread info
	isDetached = false;
	document.getElementById("submit-swap").removeAttribute('disabled');
	document.getElementById("submit-normal").removeAttribute('disabled');
	document.getElementById("previewbtn").disabled = false;
	document.getElementById("submit-swap").setAttribute("label","Submit");
	document.getElementById("submit-normal").setAttribute("label","Submit");
	switch(QuickQuoteHelper.quickWindowParams.quicktype)
	{
		case "quote":
		case "reply":
			document.title = 'Quick Reply';
			document.getElementById('qrtitle').setAttribute('value', 'Quick Reply');
			break;
		case "editpost":
			document.title = 'Quick Edit';
			document.getElementById('qrtitle').setAttribute('value', 'Quick Edit');
			break;
		case "newthread":
			document.title = 'Quick Post';
			document.getElementById('qrtitle').setAttribute('value', 'Quick Post');
			break;
		default:
			throw "ERROR! The quick window has no idea what you're trying to do.";
	}
}

function doWaffleImages() {
	imageShackResult = null;
	openDialog("chrome://salastread/content/waffleimages/waffleimages.xul", "_blank", "chrome, titlebar, modal");
	if(imageShackResult) {
		insertTextAtCursor(imageShackResult);
	}
}

function recoverLastPost() {
	if(DB.__quickreply__lastpost) {
		if(confirm("Do you want to replace the contents of this Quick Reply window with the text of the last reply you attempted to submit? The text of the current reply will be lost.")) {
			document.getElementById("messagearea").value = DB.__quickreply__lastpost;
		}
	} else {
		window.alert("There is no last post to recover.");
	}
}

function checkKeys(e) {
	if(e.ctrlKey) {
		switch(e.charCode) {
			case 119: case 87: // "w"
				releaseVars();
				window.close();
				break;

			case 98: case 66: // "b"
				getvBcode(e, 'bold');
				break;

			case 105: case 73: // "i"
				getvBcode(e, 'italic');
				break;

			case 115: case 83: // "s"
				getvBcode(e, 'strike');
				break;

			case 45: case 109: // numpad -, normal -/_
				getvBcode(e, 'sub');
				break;

			case 43: case 107: // numpad +, =/+
				getvBcode(e, 'super');
				break;

			case 117: case 85: // "u"
				getvBcode(e, 'underline');
				break;

			case 102: case 70: // "f"
				getvBcode(e, 'fixed');
				break;

			case 112: case 80: // "p"
				getvBcode(e, 'spoiler');
				break;

			case 56: case 42: // "*" or shift+8
				getvBcode(e, 'listitem');
				break;

			case 113: case 81: // q
				getvBcode(e, 'quote');
				break;
		}
	}
}

function addQuoteText(txt) {
	document.getElementById("messagearea").value += "\n" + txt;
}

function emotRegex(s) {
	let emotRe = /<div class="text">(.*?)<\/div>[\s\S]*?src="(.*?)"/i;
	emotRe.exec(s);
	DB.emoticons.push(new Array(RegExp.$1, RegExp.$2));
}

var emoteGetter = null;

function getEmoticonsFromServerASync()
{
	emoteGetter = new XMLHttpRequest();
	emoteGetter.open("GET", "http://forums.somethingawful.com/misc.php?s=&action=showsmilies", true);
	emoteGetter.onreadystatechange = getEmoticonsCallback;
	// Ensure this load flag is set to prevent issues with third-party cookies being disabled
	emoteGetter.channel.loadFlags |= Components.interfaces.nsIChannel.LOAD_DOCUMENT_URI;
	emoteGetter.send(null);
}

function getEmoticonsCallback()
{
	try {
		if (emoteGetter.readyState === 2)
		{
			if(emoteGetter.status !== 200)
			{
				emoteGetter.abort();
				DB.gettingemoticons = false;
				window.alert("Failed to communicate with forums.somethingawful.com for emoticons");
			}
		}
		else if (emoteGetter.readyState === 4)
		{
			var respText = emoteGetter.responseText;
			if (respText)
				finalizeEmotesGrab(respText);
			else
			{
				DB.gettingemoticons = false;
				window.alert("Failed to communicate with forums.somethingawful.com for emoticons");
			}
		}
	} catch(ex) {}
}

function finalizeEmotesGrab(restext)
{
	DB.emoticons = new Array();

	let emotRe = /<li class="smilie">([\s\S]*?)<img.*?>/gi;
	let emotArray = restext.match(emotRe);

	emotArray.forEach(emotRegex);
	DB.emoticons.sort();
	DB.gettingemoticons = false;

	// Make sure we see the emoticons we just got.
	doPreview();

	// Update emoticon list
	updateEmoticonList();
}

function updateEmoticonList()
{
	clearChildrenFrom("menu_a");
	clearChildrenFrom("menu_d");
	clearChildrenFrom("menu_g");
	clearChildrenFrom("menu_j");
	clearChildrenFrom("menu_m");
	clearChildrenFrom("menu_p");
	clearChildrenFrom("menu_s");
	clearChildrenFrom("menu_v");
	clearChildrenFrom("menu_y");
	var menu = document.getElementById("emoticonmenu");
	//while(menu.firstChild!=null) {
	//   menu.removeChild(menu.firstChild);
	//}
	for (let i = 0; i < DB.emoticons.length; i++)
	{
		var thisemot = DB.emoticons[i];
		if (thisemot[0] != null && thisemot[0].length > 0)
		{
			addMenuItem(menu, thisemot[0], thisemot[1]);
		}
	}
	var children = menu.childNodes;
	for (let i = 0; i < children.length; i++)
	{
		children[i].hidden = false;
	}
	document.getElementById("menu_wait").hidden = true;
}

var pageGetter = null;

var sa_formkey =(DB.__cachedFormKey && DB.__cachedFormKey!=="") ? DB.__cachedFormKey : "";

function showDebugData(event) {
	if(event.button === 2) {
		window.alert("threadid = "+quickParams.threadid+"\nformkey = "+ sa_formkey);
	}
}

// grab the actual SA reply page - we need a form key and a form cookie
function startPostTextGrab(getFormKeyOnly, postid)
{
	pageGetter = new XMLHttpRequest();

	// If a postid is specified, fetch it as a quote.
	// Otherwise, check the params.
	var getType = "quote";
	if (!postid)
	{
		postid = quickParams.postid;
		getType = quickParams.quicktype;
	}

	var targeturl;
	switch(getType)
	{
		case "quote":
			targeturl = "http://forums.somethingawful.com/newreply.php?s=&action=newreply&postid=" + postid;
			break;
		case "reply":
			targeturl = "http://forums.somethingawful.com/newreply.php?s=&action=newreply&threadid=" + quickParams.threadid;
			break;
		case "editpost":
			targeturl = "http://forums.somethingawful.com/editpost.php?s=&action=editpost&postid=" + postid;
			document.title = 'Quick Edit';
			document.getElementById('qrtitle').setAttribute('value', 'Quick Edit');
			break;
		case "newthread":
			targeturl = "http://forums.somethingawful.com/newthread.php?forumid=" + quickParams.forumid;
			document.title = 'Quick Post';
			document.getElementById('qrtitle').setAttribute('value', 'Quick Post');
			break;
		default:
			throw "ERROR! The quick window has no idea what you're trying to do.";
	}

	//alert("targeturl = "+targeturl);

	pageGetter.open("GET", targeturl, true);
	pageGetter.onreadystatechange = postTextGrabCallback;
	// Ensure this load flag is set to prevent issues with third-party cookies being disabled
	pageGetter.channel.loadFlags |= Components.interfaces.nsIChannel.LOAD_DOCUMENT_URI;
	pageGetter.send(null);
}

//callback for startPostTextGrab
function postTextGrabCallback()
{
	try {
		if (pageGetter.readyState === 2) {
			if (pageGetter.status !== 200) {
				window.alert("Failed to communicate with forums.somethingawful.com");
				pageGetter.abort();
			}
		} else if (pageGetter.readyState === 4) {
			var respText = pageGetter.responseText;
			if (respText)
				finalizeTextGrab(respText);
			else
				window.alert("Failed to communicate with forums.somethingawful.com");
		}
	} catch(ex) {}
}

function finalizeTextGrab(restext)
{
	var before = document.getElementById("messagearea").value;
		before = before.replace(quoteWaitString, "");

	var el = document.getElementById("replypage").contentDocument.body;
	let fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"]
                         .getService(Components.interfaces.nsIScriptableUnescapeHTML)
                         .parseFragment(restext, false, null, el);
/* For Firefox 14+ we can switch to: 
	let fragment = Components.classes["@mozilla.org/parserutils;1"]
					.getService(Components.interfaces.nsIParserUtils)
					.parseFragment(restext, 0, false, null, el);
*/
	while (el.firstChild)
		el.removeChild(el.firstChild);
	el.appendChild(fragment);

	var tnode = PageUtils.selectSingleNode(document.getElementById("replypage").contentDocument, el, "//TEXTAREA[@name='message']");

	// There was a response, but it wasn't what we expected.
	// This can be caused by not accepting third-party cookies, but we add a load flag that should fix that.
	if (tnode === null)
	{
		window.alert("SALR got a response it didn't expect. Please close the quick post window and try again.");
		return;
	}

	document.getElementById("messagearea").value = before + tnode.value;

	var fknode = PageUtils.selectSingleNode(document.getElementById("replypage").contentDocument, el, "//INPUT[@name='formkey']");
	if (fknode)
	{
		sa_formkey = fknode.value;
		DB.__cachedFormKey = sa_formkey;
	}

	var fcnode = PageUtils.selectSingleNode(document.getElementById("replypage").contentDocument, el, "//INPUT[@name='form_cookie']");
	if (fcnode)
	{
		window.__salastread_form_cookie = fcnode.value;
	}

	if(!isDetached) {
		document.getElementById("submit-swap").removeAttribute('disabled');
		document.getElementById("submit-normal").removeAttribute('disabled');
	}

	// Only update the preview if we need to
	if (document.getElementById("preview").checked)
	{
		doPreview();
	}

	// Post Thread stuff
	if (quickParams.quicktype === 'newthread')
	{
		document.getElementById('quickpostoptions').setAttribute('collapsed', 'false');
		//Uh, also load the post icons
		var iconz = PageUtils.selectNodes(document.getElementById("replypage").contentDocument, el, "//INPUT[@name='iconid']");
		var iconmenu = document.getElementById('posticonmenu');
		var hbox = document.getElementById('posticonmenuhbox');
		
		document.getElementById('posticonbutton').iconid = 0;
		for(var i = 0; i < iconz.length; i++) {
			var l = iconz[i];
			var iconid = l.value;
			while(l.nextSibling) {
				l = l.nextSibling;
				if(l.src) {
					var newel = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","menuitem");
						newel.className = "menuitem-iconic";
						newel.setAttribute("image", l.src);
						newel.iconid = iconid;
						newel.addEventListener('click', qpSetPostIcon, false);
						hbox.appendChild(newel);
					
					if(i % 5 === 0) {
						hbox = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","hbox");
						iconmenu.appendChild(hbox);
					}
					break;
				}
			}
		}
	}
	// Work around single post edits not getting subscribed status from thread itself
	else if (quickParams.quicktype === 'editpost')
	{
		let needToSubscribe = PageUtils.selectSingleNode(document.getElementById("replypage").contentDocument, el, "//INPUT[@name='bookmark']");
		if (needToSubscribe.hasAttribute("checked"))
		{
			document.getElementById("subscribe").setAttribute("checked",true);
		}
	}
	return;
}

function qpSetPostIcon(e) {
	var el = e.originalTarget;
	var pib = document.getElementById('posticonbutton');
		pib.setAttribute('image', el.getAttribute('image'));
		pib.iconid = el.iconid;
}

function addQuoteFromPost(postid)
{
	var textarea = document.getElementById("messagearea");
		textarea.value = textarea.value.replace(/[\r\n]*$/, "") + "\n\n" + quoteWaitString;

	startPostTextGrab(false, postid);
}

//grab necessary info
function importData()
{
	try
	{
		var messagearea = document.getElementById("messagearea");
	
		if (Prefs.getPref('quickQuoteSwapPostPreview'))
		{
			document.getElementById("submit-swap").style.display = "-moz-box";
			document.getElementById("submit-normal").style.display = "none";
		}
		else
		{
			document.getElementById("submit-normal").style.display = "-moz-box";
			document.getElementById("submit-swap").style.display = "none";
		}

		//put in the please wait message every time, there's always something to wait on (:rolleyes:)
		messagearea.value = quoteWaitString;

		// Get initial quick window parameters (reference)
		quickParams = QuickQuoteHelper.quickWindowParams;

		//if we don't have a cached form key go get it
		if (DB.__cachedFormKey)
		{
			startPostTextGrab(false);
			
			//enable the buttons so long as we have an attached window
			if (!isDetached)
			{
				document.getElementById("submit-swap").removeAttribute('disabled');
				document.getElementById("submit-normal").removeAttribute('disabled');
			}
		}
		else
		{
			startPostTextGrab(true);
		}
		messagearea.focus();

		if (Prefs.getPref('quickQuoteSubscribeDefault') || 
			(quickParams.quicktype !== "newthread" && 
				PageUtils.selectSingleNode(quickParams.doc,quickParams.doc,"//ul[contains(@class, 'postbuttons')]//img[contains(@class, 'unbookmark')]")))
		{
			document.getElementById("subscribe").setAttribute("checked",true);
		}

		if (Prefs.getPref('quickQuoteDisableSmiliesDefault'))
		{
			document.getElementById("disablesmilies").setAttribute("checked",true);
		}

		if (Prefs.getPref('quickQuoteSignatureDefault') && (quickParams.quicktype === "newthread" || !DB.didIPostHere(quickParams.threadid)))
		{
			document.getElementById("signature").setAttribute("checked",true);
		}

		if (Prefs.getPref('quickQuoteLivePreview'))
		{
			document.getElementById("preview").setAttribute("checked",true);
			togglePreview(false);
		}
	}
	catch(e) { 
		window.alert(e); 
	}
}

function releaseVars() {
	QuickQuoteHelper.releaseQuickQuoteVars();
}

function doSubmit(subtype) {
	DB.__quickreply__lastpost = document.getElementById("messagearea").value;
	QuickQuoteHelper.quickQuoteSubmit(
		document.getElementById("messagearea").value,
		document.getElementById("parseurl").checked,
		document.getElementById("subscribe").checked,
		document.getElementById("disablesmilies").checked,
		document.getElementById("signature").checked,
		subtype,
		sa_formkey,
		attachedFileName,
		window.__salastread_form_cookie
	);
}

function clearChildrenFrom(xid) {
	var xel = document.getElementById(xid).firstChild;
	while(xel.firstChild !== null) {
		xel.removeChild(xel.firstChild);
	}
}

function getEmoticons() {
	try
	{
		if (DB.gettingemoticons !== true && 
			(typeof(DB.emoticons) === typeof undefined || DB.emoticons === null))
		{
			DB.gettingemoticons = true;
			getEmoticonsFromServerASync();
		}
		else
		{
			if (DB.gettingemoticons === false)
				updateEmoticonList();
		}
	}
	catch(e)
	{
		window.alert(e);
	}
}

function addMenuItem(menu, label, image) {
	var targetid = "menu_y";
	var menuch = label.match(/[a-z]/i);
	if(menuch) {
		var mstr = "ABCabc";
		if(mstr.indexOf(menuch[0]) !== -1) { targetid = "menu_a"; }
		mstr = "DEFdef";
		if(mstr.indexOf(menuch[0]) !== -1) { targetid = "menu_d"; }
		mstr = "GHIghi";
		if(mstr.indexOf(menuch[0]) !== -1) { targetid = "menu_g"; }
		mstr = "JKLjkl";
		if(mstr.indexOf(menuch[0]) !== -1) { targetid = "menu_j"; }
		mstr = "MNOmno";
		if(mstr.indexOf(menuch[0]) !== -1) { targetid = "menu_m"; }
		mstr = "PQRpqr";
		if(mstr.indexOf(menuch[0]) !== -1) { targetid = "menu_p"; }
		mstr = "STUstu";
		if(mstr.indexOf(menuch[0]) !== -1) { targetid = "menu_s"; }
		mstr = "VWXvwx";
		if(mstr.indexOf(menuch[0]) !== -1) { targetid = "menu_v"; }
		mstr = "YZyz";
		if(mstr.indexOf(menuch[0]) !== -1) { targetid = "menu_y"; }
	}

	var newel = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","menuitem");
		newel.className = "menuitem-iconic";
		newel.setAttribute("label", label);
		newel.setAttribute("image", image);

	//menu.appendChild(newel);
	document.getElementById(targetid).firstChild.appendChild(newel);
	newel.addEventListener("command", function() { selectedEmoticon(label); }, true);
}

function selectedEmoticon(emotlabel) {
	insertTextAtCursor(emotlabel);
}

function insertTextAtCursor(emotlabel) {
	var ebtext = document.getElementById("messagearea").value;
	var selstart = document.getElementById("messagearea").selectionStart;
	var selend = document.getElementById("messagearea").selectionEnd;
	ebtext = ebtext.substring(0,selstart) + emotlabel + ebtext.substring(selend);
	document.getElementById("messagearea").focus();
	document.getElementById("messagearea").value = ebtext;
	document.getElementById("messagearea").setSelectionRange(selstart+emotlabel.length, selstart+emotlabel.length);
	doPreview();
}

// Insert BBcode tags into our message box, maintaining cursor/selection position in a variery of situations
// Params: (string) tag to insert, (bool) maintain selection after insertion,
//			(string) text to insert tags around, (string) tag option string (i.e. [url=(OPTION)])
function insertTags(tag, saveSel, inner, tagEquals)
{
	var msgBox = document.getElementById("messagearea");
	if (msgBox && tag)
	{
		var tagOpen;
		var tagClose;
		if (tagEquals)
		{
			tagOpen = "[" + tag + "=" + tagEquals + "]";
		}
		else
		{
			tagOpen = "[" + tag + "]";
		}
		tagClose = "[/" + tag + "]";
		
		var selStart = msgBox.selectionStart;
		var selEnd = msgBox.selectionEnd;

		if (tag === "*") { // special case for [*] tags which should to be inside a [list]
			if (msgBox.value.indexOf("[list]") === -1 || msgBox.value.indexOf("[list]") > selStart)
			{
				tagOpen = "[list]\n" + tagOpen;
			}
			if (msgBox.value.indexOf("[/list]") < selEnd)
			{
				tagClose = "\n[/list]";
			} else {
				tagClose = '';
			}
		}

		msgBox.focus();
		if (inner)
		{
			let insert = tagOpen + inner + tagClose;
			msgBox.value = msgBox.value.substring(0, selStart) + insert + msgBox.value.substring(selEnd);
			if (saveSel)
			{
				msgBox.setSelectionRange(selStart + tagOpen.length, selStart + tagOpen.length + inner.length);
			}
			else
			{
				msgBox.setSelectionRange(selStart + insert.length, selStart + insert.length);
			}
		}
		else
		{
			msgBox.value = msgBox.value.substring(0, selStart) + tagOpen + tagClose + msgBox.value.substring(selEnd);
			msgBox.setSelectionRange(selStart + tagOpen.length, selStart + tagOpen.length);
		}
		doPreview();
	}
}

function doAttach() {
	if (attachedFileName === "") {
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"]
					.createInstance(nsIFilePicker);
			fp.init(window, "Select an Image to Attach", nsIFilePicker.modeOpen);
			fp.appendFilter("Image Files","*.gif; *.jpg; *.jpeg; *.png");
		var res = fp.show();
		if(res === nsIFilePicker.returnOK) {
			attachedFileName = fp.file.path;
			document.getElementById("attachbtn").setAttribute("label", "Remove");
		}
	} else {
		document.getElementById("attachbtn").setAttribute("label", "Attach...");
		attachedFileName = "";
	}
}

function getvBcode(event, command) {
	var str = null;
	
	var theBox = document.getElementById("messagearea");
	var oPosition = theBox.scrollTop;
	var oHeight = theBox.scrollHeight;

	var startPos = theBox.selectionStart;
	var endPos = theBox.selectionEnd;
	str = theBox.value.substring(startPos, endPos);

	var nHeight = theBox.scrollHeight - oHeight;
	theBox.scrollTop = oPosition + nHeight;

	var saveSel = event.ctrlKey;
	
	switch(command) {
		case "img":
			var menuch = str.match(/^(http:\/\/)|(https:\/\/)|(ftp:\/\/)/i);
			if(menuch) {
				insertTags("img", saveSel, str);
			} else {
				var url = prompt('Enter a URL to an image below.', ' ');
				if(url) {
					insertTags("img", saveSel, url);
				}
			}
			break;
		
		case "urltag":
			var menuch = str.match(/^(http:\/\/)|(https:\/\/)|(ftp:\/\/)/i);
			if(menuch) {
				insertTags("url", saveSel, str);
			} else {
				var url = prompt('You have selected text that may not be a URL. Enter a URL to link to with the selected text or press cancel to make the selected text a link.', ' ');
				if(!url) {
					insertTags("url", saveSel, str);
				} else {
					insertTags("url", saveSel, str, url);
				}
			}
			break;

		case "video":
			insertTags("video", saveSel, str);
			break;

		case "bold":
			insertTags("b", saveSel, str);
			break;

		case "code":
			insertTags("code", saveSel, str);
			break;

		case "quote":
			insertTags("quote", saveSel, str);
			break;

		case "italic":
			insertTags("i", saveSel, str);
			break;

		case "underline":
			insertTags("u", saveSel, str);
			break;

		case "strike":
			insertTags("s", saveSel, str);
			break;

		case "sub":
			insertTags("sub", saveSel, str);
			break;

		case "super":
			insertTags("super", saveSel, str);
			break;

		case "spoiler":
			insertTags("spoiler", saveSel, str);
			break;

		case "fixed":
			insertTags("fixed", saveSel, str);
			break;

		case "listitem":
			insertTags("*", saveSel, str);
			break;

		default : alert("vBcode error! No menu option selected.");
	}
}

function doPreview()
{
	// Get out of here if we don't have a preview window open.
	if (document.getElementById("preview").checked === false)
		return;

	var preview = document.getElementById("previewiframe").contentDocument.getElementById("messagepreview");
	let messageArea = document.getElementById("messagearea");
	var markup = messageArea.value;
	
	markup = markup.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	var vbcode = [];

	// Process BBCode
	markup = XBBCODE.process({text: markup, removeMisalignedTags: false, addInLineBreaks: false}).html;

	// Smileys
	if (!document.getElementById("disablesmilies").checked)
	{
		if (DB.gettingemoticons !== true && 
			(typeof(DB.emoticons) === typeof undefined || DB.emoticons === null))
		{
			DB.gettingemoticons = true;
			getEmoticonsFromServerASync();
		}
		else if (DB.gettingemoticons === false && 
			!(typeof(DB.emoticons) === typeof undefined || DB.emoticons === null))
		{
			vbcode['<img src="http://forumimages.somethingawful.com/images/smilies/emot-goatse.gif"/>'] = /&amp;submit/gi;
			vbcode['<img src="http://forumimages.somethingawful.com/images/smilies/smile.gif"/>'] = /:\)/gi;
			vbcode['<img src="http://forumimages.somethingawful.com/images/smilies/frown.gif"/>'] = /:\(/gi;
			vbcode['<img src="http://forumimages.somethingawful.com/images/smilies/wink.gif"/>'] = /;\)/gi;
			vbcode['<img src="http://i.somethingawful.com/mjolnir/images/livestock~01-14-04-whore.gif"/>'] = /;-\*/gi;

			var matches = markup.match(/\:(\w+|\?)\:/gi);

			if (matches) {
				for (var i = 0; i < matches.length; i++) {
					for (var j = 0; j < DB.emoticons.length; j++) {
						var thisemot = DB.emoticons[j];
						if (thisemot[0] != null && thisemot[0].length>0) {
							if (matches[i] === thisemot[0]) {
								markup = markup.replace(matches[i], '<img src="' + thisemot[1] + '"/>');
							}
						}
					}
				}
			}
		}
	}

	// Process newlines - rough
	markup = markup.replace(/\n/g, "<br />");

	for (let rplc in vbcode)
	{
		if (vbcode.hasOwnProperty(rplc))
			markup = markup.replace(vbcode[rplc], rplc);
	}

    while (preview.firstChild)
        preview.removeChild(preview.firstChild);

    var fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"]
                         .getService(Components.interfaces.nsIScriptableUnescapeHTML)
                         .parseFragment(markup, false, null, preview);
    preview.appendChild(fragment);

	window.setTimeout(function() {
		let innerMessageBox = messageArea.inputField;
		let nearend = (innerMessageBox.scrollHeight - innerMessageBox.scrollTop - innerMessageBox.clientHeight <= 20);
		if (nearend)
			scrollPreviewToEnd();
	}, 10);
}

function scrollPreviewToEnd()
{
	let iframe = document.getElementById("previewiframe").contentWindow;
	let endOfPreview = iframe.document.body.scrollHeight;
	iframe.scrollBy(0, endOfPreview);
}

function togglePreview(doupdatepreview)
{
	if (document.getElementById("preview").checked)
		document.getElementById("previewbox").removeAttribute('collapsed');
	else
		document.getElementById("previewbox").setAttribute('collapsed', 'true');

	Prefs.setPref('quickQuoteLivePreview', document.getElementById("preview").checked);

	window.sizeToContent();
	if (doupdatepreview === true)
		doPreview();
}
