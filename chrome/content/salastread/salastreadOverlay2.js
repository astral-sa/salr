
function SALRClass()
{
    var SALR_CURRENT_VERSION = "1.15.1918";
    var persistObject = null;

    var SALR_QuickQuoteWindow = null;           // Reference to the quick quote window object
    var SALR_QuickQuoteWindowDocument = null;   // The document that the quick quote window is attached to
    var SALR_QuickQuoteSubmitting = false;      // Is the quick quote window currently submitting? (to skip detach on page unload)

    var SALR_setInterval = function(i, f)
    {
        return setInterval(f, i);
    };

    var SALR_setTimeout = function(i, f)
    {
        return setTimeout(f, i);
    };

    var SALR_timerTick = function()
    {
    };

    var SALR_syncTick = function()
    {
    };

    var SALR_checkKillSwitch = function()
    {
        persistObject._killChecked = true;
        if (persistObject.toggle_dontCheckKillSwitch)
            return;

        var kc = new XMLHttpRequest();
        kc.open("GET", "http://static.evercrest.com/www/images2/ext/sa/salastread-kill.xml?rnd="+(new Date().toString()), true);
        kc.onreadystatechange = function()
        {
            try
            {
                if (kc.readyState == 2 && kc.status != 200)
                {
                    kc.abort();
                    kc.onreadystatechange = null;
                    kc = null;
                }
                else if (kc.readyState == 4)
                {
                    var xdoc = kc.responseXML;
                    if (xdoc != null)
                    {
                        var xel = xdoc.documentElement;
                        if (xel != null)
                        {
                            var before = xel.getAttribute("before");
                            if (Number(before) > 1912)
                            {
                                persistObject._killed = true;
                                persistObject._killMessage = "Please upgrade to a newer version of the SA Last Read Extension.\n" +
                                                             "The version you have installed is out of date and has been disabled "+
                                                             "for this browser session.";
                            }
                            for (var x=0; x<xel.childNodes.length; x++)
                            {
                                var thischild = xel.childNodes[x];
                                if (thischild.nodeName == "dev")
                                {
                                    var currentver = thischild.getAttribute("current");
                                    var updateurl = thischild.getAttribute("url");
                                    if (Number(currentver) > 1912)
                                        persistObject._updateURL = updateurl;
                                }
                            }
                        }
                    }
                    kc.onreadystatechange = null;
                    kc = null;
                }
            }
            catch (ex) { }
        };
        kc.send(null);
    };

    var SALR_showChangeLogWindow = function()
    {
        var upVer = persistObject.LastRunVersion;
        persistObject.LastRunVersion = SALR_CURRENT_VERSION;
        SALR_setTimeout(1000, function() {
            var param = { upgradeFromVersion: upVer };
            openDialog("chrome://salastread/content/newfeatures/newfeatures.xul", "SALR_newfeatures",
                "chrome,centerscreen,dialog=no", param);
        });
    };

    var SALR_selectNodes = function(doc, context, xpath)
    {
        var nodes = doc.evaluate(xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        var result = new Array(nodes.snapshotLength);
        for (var x=0; x<result.length; x++)
            result[x] = nodes.snapshotItem(x);
        return result;
    };

    var SALR_selectSingleNode = function(doc, context, xpath)
    {
        var nodeList = doc.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return nodeList.singleNodeValue;
    };

    var SALR_SAMenuPopup_popupshowing = function()
    {
    };

    var SALR_menuItemNavigate = function(e, url, type)
    {
        var target = "none";
        if (type == "command")
            target = "current";
        if (type == "click" && (e.button==2 || e.button==1))
            target = "newtab";

        var targetUrl = "";
        if (typeof url == "string")
            targetUrl = url;
        else
            targetUrl = url.getAttribute("targeturl");

        if (target=="newtab")
            getBrowser().addTab(url);
        else if (target=="current")
            loadURI(url);
    };

    var SALR_showConfigWindow = function(page)
    {
        var data = "";
        if (typeof page == "string")
            data = page;
        openDialog("chrome://salastread/content/pref.xml", "_blank",
            "chrome,titlebar,modal,resizable", data);
    };

    var SALR_StarredThreadMenuPopup_popupshowing = function()
    { //TODO
    };

    var SALR_launchPinHelper = function(elToRemoveArray)
    { // TODO
    };

    var SALR_buildDebugMenu = function(dm)
    {
        var _addItem = function(label, func)
        {
            var menuel = document.createElement("menuitem");
            menuel.setAttribute("label", label);
            menuel.addEventListener("command", func, false);
            dm.appendChild(menuel);
        };

        _addItem("View salastread.xml Data", function() { });
        _addItem("Reset salastread.xml Data", function() { });
        _addItem("Syncxx", function() { });
        _addItem("Normal Sync Call", function() { });
        _addItem("Force Sync Call", function() { });
        _addItem("TRACE CONFIG", function() { });
    };

    var SALR_populateForumMenuFrom = function(nested_menus, target, src, pinnedForumNumbers, pinnedForumElements)
    {
        var _createDelegate = function(url, type)
        {
            return function(e) { SALR_menuItemNavigate(e, url, type); };
        };
        var wasutil = false;
        for (var i=0; i<src.childNodes.length; i++)
        {
            var thisforum = src.childNodes[i];
            if (thisforum.nodeName == "util")
                wasutil = true;
            else if (wasutil && thisforum.nodeType == 1)
            {
                if (nested_menus)
                    target.appendChild(document.createElement("menuseparator"));
                wasutil = false;
            }
            if (thisforum.nodeName == "cat")
            {
                if (!nested_menus)
                {
                    target.appendChild(document.createElement("menuseparator"));
                    SALR_populateForumMenuFrom(nested_menus, target, thisforum, pinnedForumNumbers, pinnedForumElements);
                }
                else
                {
                    var submenu = document.createElement("menu");
                    submenu.setAttribute("label", thisforum.getAttribute("name"));
                    var submenupopup = document.createElement("menupopup");
                    if (persistObject.toggle_useSAForumMenuBackground)
                        submenupopup.setAttribute("class", "SALR_GrenadeBackground");
                    submenu.appendChild(submenupopup);
                    SALR_populateForumMenuFrom(nested_menus, submenupopup, thisforum, pinnedForumNumbers, pinnedForumElements);
                    target.appendChild(submenu);
                }
            }
            else if (thisforum.nodeName == "forum" || thisforum.nodeName == "util")
            {
                var menuel = document.createElement("menuitem");
                var mid = thisforum.getAttribute("id");
                var murl = "http://forums.somethingawful.com/forumdisplay.php?s=&forumid="+mid;
                menuel.setAttribute("label", thisforum.getAttribute("name"));
                menuel.addEventListener('click', _createDelegate(murl, "click"), false);
                menuel.addEventListener('command', _createDelegate(murl, "command"), false);
                if (thisforum.getAttribute("cat") && thisforum.getAttribute("cat").substring(0,3)=="sub")
                    menuel.setAttribute("class", "SALR_Menu_" + thisforum.getAttribute("cat"));
                target.appendChild(menuel);
                if (nested_menus)
                {
                    var thisforumnum = thisforum.getAttribute("id");
                    for (var j=0; j<pinnedForumNumbers.length; j++)
                    {
                        if (pinnedForumNumbers[j]==thisforumnum)
                            pinnedForumElements[j] = thisforum;
                    }
                }
            }
        }
    };

    var SALR_populatePinnedForums = function(menupopup, pinnedForumElements, pinnedForumNumbers)
    {
        var _makeDelegate = function(url, type)
        {
            return function(e) { SALR_menuItemNavigate(e, url, type); };
        };
        for (var j=0; j<pinnedForumElements.length || j<pinnedForumNumbers.length; j++)
        {
            if (pinnedForumElements[j])
            {
                var thisforum = pinnedForumElements[j];
                var menuel = document.createElement("menuitem");
                var forumname = thisforum.getAttribute("name");
                var mid = thisforum.getAttribute("id");
                var murl = "http://forums.somethingawful.com/forumdisplay.php?s=&forumid="+mid;
                while (forumname.substring(0,1)==" ")
                {
                    forumname = forumname.substring(1);
                }
                menuel.setAttribute("label", forumname);
                menuel.setAttribute("class", "SALR_Menu_Pinned");
                menuel.addEventListener('click', _makeDelegate(murl, "click"), false);
                menuel.addEventListener('command', _makeDelegate(murl, "command"), false);
                menupopup.appendChild(menuel);
            }
            else if (pinnedForumNumbers[j]=="sep")
                menupopup.appendChild(document.createElement("menuseparator"));
            else if (typeof pinnedForumNumbers[j] == "string" && pinnedForumNumbers[j].substring(0,3)=="URL")
            {
                var umatch = pinnedForumNumbers[j].match(/^URL\[(.*?)\]\[(.*?)\]$/);
                if (umatch)
                {
                    var menuel = document.createElement("menuitem");
                    menuel.setAttribute("label", persistObject.UnescapeMenuURL(umatch[1]));
                    menuel.setAttribute("class", "SALR_Menu_Pinned");
                    menuel.addEventListener('click', _makeDelegate(persistObject.UnescapeMenuURL(umatch[2]), 'click'), false);
                    menuel.addEventListener('command', _makeDelegate(persistObject.UnescapeMenuURL(umatch[2]), 'command'), false);
                    menupopup.appendChild(menuel);
                }
            }
            else if (pinnedForumNumbers[j]=="starred")
            {
                var menuel = document.createElement("menu");
                menuel.setAttribute("label", "Starred Threads");
                menuel.setAttribute("image", "chrome://salastread/content/star.png");
                menuel.setAttribute("class", "menu-iconic SALR_StarMenu");
                var subpopup = document.createElement("menupopup");
                subpopup.id = "SALR_StarredThreadMenuPopup";
                subpopup.addEventListener('popupshowing', function() { SALR_StarredThreadMenuPopup_popupshowing(); }, false);
                menuel.appendChild(subpopup);
                menupopup.appendChild(menuel);
            }
        }
    }
 
    var SALR_buildForumMenu = function()
    {
        if (!persistObject.toggle_showSAForumMenu || !persistObject.forumListXml || persistObject.forumListXml == null) return;

        //try
        //{
            var menupopup = document.getElementById("SALR_SAMenuPopup");
            if (menupopup==null)
            {
                var iBefore = document.getElementById("bookmarks-menu");
                if (iBefore)
                   iBefore = iBefore.nextSibling;
                if (!iBefore)
                   iBefore = document.getElementById("main-menubar").lastChild;
                var menuel = document.createElement("menu");
                menuel.id = "SALR_SAMenu";
                menuel.setAttribute("label", "SA");
                menuel.setAttribute("accesskey", "S");
                menuel.style.display = "none";
                menupopup = document.createElement("menupopup"); 
                menupopup.id = "SALR_SAMenuPopup";
                menuel.appendChild(menupopup);
                document.getElementById("main-menubar").insertBefore(menuel, iBefore);
                menupopup.addEventListener('popupshowing', SALR_SAMenuPopup_popupshowing, false);
            }
            if (persistObject.toggle_useSAForumMenuBackground)
                menupopup.className = "SALR_GrenadeBackground";
            else
                menupopup.className = "";
            while (menupopup.firstChild)
            {
                menupopup.removeChild(menupopup.firstChild);
            }

            var _makeMenuItem = function(props, events)
            {
                var menuel = document.createElement("menuitem");
                if (typeof pn != "object") pn = {};
                if (typeof en != "object") en = {};
                for (var pn in props)
                {
                    menuel.setAttribute(pn, props[pn]);
                }
                for (var en in events)
                {
                    menuel.addEventListener(en, events[en], false);
                }
                return menuel;
            };
            
            var forumsDoc = persistObject.forumListXml;
            var nested_menus = persistObject.toggle_nestSAForumMenu;
            var pinnedForumNumbers = new Array();
            var pinnedForumElements = new Array();
            if (nested_menus && persistObject.string_menuPinnedForums)
                pinnedForumNumbers = persistObject.string_menuPinnedForums.split(",");

            menupopup.appendChild(_makeMenuItem(
                { "label": "Something Awful",
                  "image": "chrome://salastread/content/sa.png",
                  "class": "menuitem-iconic SALR_MenuFrontPage",
                  "accesskey": "s" },
                { "click": function(e) { SALR_menuItemNavigate(e, "http://www.somethingawful.com/", "click"); },
                  "command": function(e) { SALR_menuItemNavigate(e, "http://www.somethingawful.com/", "command"); } }));
            menupopup.appendChild(document.createElement("menuseparator"));
            menupopup.appendChild(_makeMenuItem(
                { "label": "Configure SALastRead..." },
                { "command": function(e) { SALR_showConfigWindow(); } }));
                  
            if (persistObject.IsDebugEnabled())
            {
                var dmenuel = _makeMenuItem(
                    { "label": "SALR Debug" }, null);
                var dmenupopup = document.createElement("menupopup");
                SALR_buildDebugMenu(dmenupopup);
                dmenuel.appendChild(dmenupopup);
                menupopup.appendChild(dmenuel);
            }
            menupopup.appendChild(document.createElement("menuseparator"));

            SALR_populateForumMenuFrom(nested_menus, menupopup, forumsDoc.documentElement, pinnedForumNumbers, pinnedForumElements);
            if (nested_menus && pinnedForumElements.length > 0)
            {
                menupopup.appendChild(document.createElement("menuseparator"));
                SALR_populatePinnedForums(menupopup, pinnedForumElements, pinnedForumNumbers);
                if (persistObject.toggle_showMenuPinHelper)
                {
                    var ms = document.createElement("menuseparator");
                    ms.id = "SALR_PinHelperSep";
                    menupopup.appendChild(ms);
                    var menuel = document.createElement("menuitem");
                    menuel.id = "SALR_PinHelperItem";
                    menuel.setAttribute("label", "Learn how to pin forums to this menu...");
                    menuel.setAttribute("image", "chrome://salastread/content/eng101-16x16.png");
                    menuel.setAttribute("class", "menuitem-iconic SALR_PinHelper");
                    menuel.addEventListener('command', function() { SALR_launchPinHelper(new Array(ms, menuel)); }, false);
                    menupopup.appendChild(menuel);
                }
            }

            document.getElementById("SALR_SAMenu").style.display = "-moz-box";
        //}
        //catch (ex) { }
    };

    var SALR_reanchorThreadToLink = function(doc)
    {
        if (!doc.location || !doc.location.href) return;

        var href = doc.location.href;
        if (doc.__salastread_processed)
        {
            if (persistObject.toggle_reanchorThreadOnLoad)
            {
                if (href.match(/^http:\/\/forums?\.somethingawful\.com\//i) && href.indexOf("showthread.php?")!=-1)
                {
                    if (persistObject.toggle_reanchorThreadOnLoad)
                    {
                        var hashmatch = href.match(/\#(.*)$/);
                        if (hashmatch)
                        {
                            var anchorNode = SALR_selectSingleNode(doc, doc.body, "//A[@name='"+hashmatch[1]+"']");
                            if (anchorNode)
                                anchorNode.scrollIntoView(true);
                        }
                    }
                }
            }
        }
    };

    var SALR_makeClassSafe = function(unsafestr)
    {
        return unsafestr.replace(/[^A-Za-z0-9]/,"_");
    };

    var SALR_snagForumModerators = function(doc)
    {
        if (persistObject.forumListXml)
        {
            var saveXml = false;
            var fxml = persistObject.forumListXml;
            var mNodeContainer = SALR_selectSingleNode(doc, doc.body,
                    "TABLE/TBODY[1]/TR[1]/TD[1]/TABLE[1]/TBODY[1]/TR[2]/TD[1]/DIV[contains(text(),'(Mods:')]");
            if (mNodeContainer)
            {
                var fidmatch = doc.location.href.match(/forumid=(\d+)/i);
                if (fidmatch)
                {
                    var forumid = fidmatch[1];
                    var mods = new Array();
                    var modnames = new Array();
                    var mNodes = SALR_selectNodes(doc, mNodeContainer, ".//A");
                    for (var i=0; i<mNodes.length; i++)
                    {
                        var xhrefuid = mNodes[i].href.match(/userid=(\d+)/i);
                        if (xhrefuid)
                        {
                            mods.push(xhrefuid[1]);
                            modnames.push( SALR_makeClassSafe(mNodes[i].innerHTML) );
                        }
                    }
                    var flForumEl = SALR_selectSingleNode(fxml, fxml, "//forum[@id='"+forumid+"']");
                    if (flForumEl)
                    {
                        flForumEl.setAttribute("mods", mods.join(","));
                        flForumEl.setAttribute("modnames", modnames.join(","));
                        saveXml = true;
                    }
                }
            }
            if (saveXml)
                persistObject.forumListXml = fxml; // forces a save
        }
    };

    var SALR_stripSpaces = function(str)
    {
        while (str.substring(0,1) > '~' || str.substring(0,1) < '!') str = str.substring(1);
        while (str.substring(str.length-1, str.length) == ' ') str = str.substring(0, str.length-1);
        return str;
    };

    var SALR_setThreadIcons = function(doc, thisel, threadid, lpdate, lptime, topictitletd, topicretd, forumid)
    {
        var lpdtvalue = SALR_convertLpDateTimeToNum(SALR_stripSpaces(lpdate), SALR_stripSpaces(lptime));
        var isunread = SALR_isLpDateTimeNew(true, lpdtvalue, threadid);
        var isignored = SALR_isThreadIgnored(threadid);

        var addClasses = "";

        if (isignored)
        {
            addClasses += " SALR_ThreadRow_Ignored";
        }
        addClasses += " salastread_thread_"+threadid;
        if (isunread == "unread")
        {
            addClasses += " salastread_unreadthread";
        }
        else
        {
            if (isunread == "readwithnew")
                addClasses += " salastread_readwithnewthread";
            else
                addClasses += " salastread_readthread";

            // TODO:
        }
    };

    var SALR_highlightThreadRow = function(doc, thisel, alink)
    {
        var threadratingicon = SALR_selectSingleNode(doc, thisel, "TD/IMG[contains(@src,'stars.gif')]");
        if (threadratingicon)
        {
            threadratingicon.title = threadratingicon.alt;
        }

        var timatch = alink.href.match(/threadid=(\d+)/);
        if (!timatch) return;
        var threadid = timatch[1];

        var lpdtnode = SALR_selectSingleNode(doc, thisel, "TD/TABLE[@id='ltlink']/TBODY/TR/TD/DIV[@class='mainbodytextsmall']");
        if (!lpdtnode) return;

        var lpdttext = lpdtnode.firstChild.nodeValue;
        var lptime = SALR_stripSpaces(lpdttext.substring(0,5));
        var lpdate = SALR_stripSpaces(lpdttext.substring(6));

        var forumid = 0;
        var fidmatch = doc.location.href.match(/forumid=(\d+)/i);
        if (fidmatch)
            forumid = fidmatch[1];
        var isAskTell = (forumid == 158);

        var rowTds = SALR_selectNodes(doc, thisel, "TD");
        var topictitletd = rowTds[1];
        var topicretd = rowTds[3];
        var topicAuthorTDIndex = 3;
        if (isAskTell)
        {
            topictitletd = rowTds[2];
            topidretd = rowTds[4];
            topicAuthorTDIndex = 4;
        }

        SALR_setThreadIcons(doc, thisel, threadid, lpdate, lptime, topictitletd, topicretd, forumid);

        // TODO:
    };

    var SALR_handleForumDisplay = function(doc)
    {
        SALR_snagForumModerators(doc);

        var resarray = SALR_selectNodes(doc, doc, "//A[@class-'thread']");
        for (var x=0; x<resarray.length; x++)
        {
            var thisel = resarray[x];
            while (thisel!=null && thisel.nodeName != "TR")
                thisel = thisel.parentNode;
            if (thisel!=null && thisel.nodeName == "TR")
                SALR_highlightThreadRow(doc, thisel, resarray[x]);
        }
    };

    var SALR_handleShowThread = function(doc) {};
    var SALR_handleNewReply = function(doc) {};
    var SALR_handleEditPost = function(doc) {};
    var SALR_handleSubscriptions = function(doc) {};
    var SALR_handleProfileInsertion = function(doc) {};
    var SALR_handleConfigLinkInsertion = function(doc) {};
    var SALR_handleBodyClassing = function(doc) {};

    var SALR_handlePageTitleRewrite = function(doc)
    {
        var titlematch = doc.title.match(/^The Awful Forums \- (.*)$/);
        if (titlematch)
            doc.title = titlematch[1] + " - The Awful Forums";
    };

    var SALR_handleHeaderFooterHide = function(doc) {};

    var SALR_handleProps = function(doc)
    {
        if (!doc.getElementById("SALR_PropsSheet"))
        {
            var ssel = doc.createElement("LINK");
            ssel.id = "SALR_PropsSheet";
            ssel.setAttribute("rel", "STYLESHEET");
            ssel.setAttribute("type", "text/css");
            ssel.setAttribute("href", "chrome://salastread/content/props.css");
            doc.getElementsByTagName("head")[0].appendChild(ssel);
        }
    };

    var SALR_window_beforeunload = function(e)
    {
        if (persistObject._killed) return true;
        if (e.originalTarget == SALR_QuickQuoteWindowDocument)
        {
            if (SALR_QuickQuoteSubmitting) return true;
            if (SALR_QuickQuoteWindow && !SALR_QuickQuoteWindow.closed)
                SALR_QuickQuoteWindow.detachFromDocument();
            return true;
        };
    };

    var SALR_addUpdateIcon = function(doc)
    {
        try
        {
            if (persistObject._updateURL != "" && !doc.getElementById("SALR_UpdateIconLink"))
            {
                var updlink = doc.createElement("A");
                var updicon = doc.createElement("IMG");
                updlink.id = "SALR_UpdateIconLink";
                updlink.href = persistObject._updateURL;
                if (persistObject._killed == true)
                {
                    updicon.src = "chrome://salastread/content/killedicon.png";
                    updicon.title = "SA Last Read Update REQUIRED";
                }
                else
                {
                    updicon.src = "chrome://salastread/content/updateicon.png";
                    updicon.title = "SA Last Read Update Available";
                }
                updicon.appendChild(updicon);
                doc.body.appendChild(updlink);
            }
        }
        catch (ex) { }
    };

    var SALR_window_load = function(e)
    {
        try
        {
            var doc = e.originalTarget;
            SALR_reanchorThreadToLink(doc);
        }
        catch (ex) { }
    };

    var SALR_appcontent_DOMContentLoaded = function(e)
    {
        var doc = e.originalTarget;
        var location = doc.location;
        var isForumPage = false;

        if (location && location.href)
        {
           if (location.href.match(/^http:\/\/forums?\.somethingawful\.com\//i))
               isForumPage = true;
           else
               return;
        }

        if (isForumPage)
            SALR_addUpdateIcon(doc);
        if (persistObject._killed == true)
        {
            if (persistObject._killMessage != "")
                alert("SA Last Read Message:\n\n" + persistObject._killMessage);
            persistObject._killMessage = "";
            return;
        }

        if (doc.__salastread_processed)
        {
            SALR_reanchorThreadToLink(doc);
            return;
        }
        try
        {
            if (isForumPage && !doc.__salastread_processed)
            {
                var isFyad = false;
                try
                {
                    isFyad = (doc.defaultView.getComputedStyle(doc.body, '').getPropertyValue('background-color')=="rgb(255, 153, 153)");
                }
                catch (ex)
                {
                    var ne = { originalTarget: doc };
                    SALR_setTimeout(10, function() { SALR_appcontent_DOMContentLoaded(ne); });
                    return;
                }
                if (isFyad)
                    return;

                if (location.href.indexOf("forumdisplay.php?") != -1)
                    SALR_handleForumDisplay(doc);
                else if (location.href.indexOf("showthread.php?") != -1)
                    SALR_handleShowThread(doc);
                else if (location.href.indexOf("newreply.php") != -1)
                    SALR_handleNewReply(doc);
                else if (location.href.indexOf("editpost.php") != -1)
                    SALR_handleEditPost(doc);
                else if (location.href.indexOf("member2.php") != -1 || location.href.indexOf("usercp.php") != -1)
                    SALR_handleSubscriptions(doc);
                else if (location.href.indexOf("member.php") != -1 && location.href.indexOf("salr_") != -1)
                    SALR_handleProfileInsertion(doc);

                SALR_handleConfigLinkInsertion(doc);
                SALR_handleBodyClassing(doc);
                SALR_handlePageTitleRewrite(doc);
                SALR_handleHeaderFooterHide(doc);
                SALR_handleProps(doc);
                doc.___salastread_processed = true;
            }
        }
        catch (ex)
        {
        }
    };

    var SALR_contentAreaContextMenu_popupshowing = function() { };

    var SALR_initialize = function()
    {
        persistObject = Components.classes["@evercrest.com/salastread/persist-object;1"]
                            .createInstance(Components.interfaces.nsISupports);
        persistObject = persistObject.wrappedJSObject;
        if (persistObject.SALRversion != SALR_CURRENT_VERSION)
        {
            persistObject = null;
            throw "XPCOM/Overlay version mismatch";
        }
        if (!persistObject._syncTransferObject)
            persistObject.SetSyncTransferObject(new SALR_FTPTransferObject());
        if (!persistObject._PNGCreator)
            persistObject._PNGCreator = new PNGMaker();

        var isWindows = (navigator.platform.indexOf("Win")!=-1);
        persistObject.ProfileInit(isWindows);
        if (persistObject._starterr)
            throw "SALR persistObject startup error:\n\n"+persistObject._starterr;

        SALR_setInterval(1000, SALR_timerTick);
        SALR_setTimeout(10, SALR_syncTick);

        if (!persistObject._killChecked)
            SALR_checkKillSwitch();
        if (persistObject.LastRunVersion != SALR_CURRENT_VERSION)
            SALR_showChangeLogWindow();

        SALR_buildForumMenu();

        document.getElementById("appcontent").addEventListener("DOMContentLoaded", SALR_appcontent_DOMContentLoaded, false);
        document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", SALR_contentAreaContextMenu_popupshowing, false);
        window.addEventListener('load', SALR_window_load, true);
        window.addEventListener('beforeunload', SALR_window_beforeunload, true);
    };

    SALR_initialize();
}

var SALR_object = new SALRClass();
