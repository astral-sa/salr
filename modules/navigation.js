/*

	Functions dealing with navigation (gesture + paginator)

*/

let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");

let Navigation = exports.Navigation =
{
	// Add the quick page jump paginator
	addPagination: function(doc)
	{
		var pageList = PageUtils.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
		pageList = pageList[pageList.length-1];
		if (pageList.childNodes.length <= 1)
		{
			// There's only one page
			return;
		}
		if (!pageList.lastChild || !pageList.lastChild.innerHTML)
			return;
		var numPages = pageList.lastChild.innerHTML.match(/(\d+)/);
		var curPage = PageUtils.selectSingleNode(doc, pageList, ".//OPTION[@selected='selected']");
		numPages = parseInt(numPages[1], 10);
		curPage = parseInt(curPage.innerHTML, 10);
		var navDiv = doc.createElement("div");
		navDiv.className = "salastread_pagenavigator";
		var firstButtonImg = doc.createElement("img");
		firstButtonImg.title = "Go to First Page";
		firstButtonImg.src = "chrome://salastread/skin/nav-firstpage.png";
		var prevButtonImg = doc.createElement("img");
		prevButtonImg.title = "Go to Previous Page";
		prevButtonImg.src = "chrome://salastread/skin/nav-prevpage.png";
		if (curPage == 1)
		{
			firstButtonImg.className = "disab";
			navDiv.appendChild(firstButtonImg);
			prevButtonImg.className = "disab";
			navDiv.appendChild(prevButtonImg);
		}
		else
		{
			var firstButton = doc.createElement("a");
			firstButton.href = this.editPageNumIntoURI(doc, "pagenumber=1");
			firstButton.appendChild(firstButtonImg);
			navDiv.appendChild(firstButton);
			var prevButton = doc.createElement("a");
			prevButton.href = this.editPageNumIntoURI(doc, "pagenumber=" + (curPage-1));
			prevButton.appendChild(prevButtonImg);
			navDiv.appendChild(prevButton);
		}
		var pageSel = doc.createElement("select");
		if (pageSel.wrappedJSObject)
			pageSel = pageSel.wrappedJSObject;
		pageSel.size = 1;
		for (var pp=1; pp<=numPages; pp++)
		{
			var topt = doc.createElement("option");
			topt.appendChild(doc.createTextNode(pp));
			topt.value = pp;
			if (pp==curPage) topt.selected = true;
			pageSel.appendChild(topt);
		}
		if (curPage == 1 && !doc.baseURI.match(/pagenumber=(\d+)/))
		{
			pageSel.onchange = function() { doc.location = doc.baseURI + "&pagenumber="+this.value; };
		}
		else
		{
			pageSel.onchange = function() {
				if (doc.location.pathname == "/showthread.php")
				{
					var threadid = doc.evaluate("//DIV[contains(@class,'pages')]//A[contains(@href,'threadid=')]", doc, null, 9, null).singleNodeValue.href.match(/threadid=(\d+)/i)[1];
					var hasuserid = doc.baseURI.match(/userid=(\w+)/);
					var uidstring = (!hasuserid) ? '' : '&' + hasuserid[0];
					doc.location = doc.location.pathname+"?threadid="+threadid+"&pagenumber="+this.value+uidstring;
				}
				else
				{
					doc.location = doc.baseURI.replace(/pagenumber=(\d+)/, "pagenumber="+this.value);
				}
			};
		}
		navDiv.appendChild(pageSel);
		var nextButtonImg = doc.createElement("img");
		nextButtonImg.title = "Go to Next Page";
		nextButtonImg.src = "chrome://salastread/skin/nav-nextpage.png";
		var lastButtonImg = doc.createElement("img");
		lastButtonImg.title = "Go to Last Page";
		lastButtonImg.src = "chrome://salastread/skin/nav-lastpage.png";
		if (curPage == numPages)
		{
			nextButtonImg.className = "disab";
			navDiv.appendChild(nextButtonImg);
			lastButtonImg.className = "disab";
			navDiv.appendChild(lastButtonImg);
		}
		else
		{
			var nextButton = doc.createElement("a");
			nextButton.href = this.editPageNumIntoURI(doc, "pagenumber=" + (curPage+1));
			nextButton.appendChild(nextButtonImg);
			navDiv.appendChild(nextButton);
			var lastButton = doc.createElement("a");
			lastButton.href = this.editPageNumIntoURI(doc, "pagenumber=" + numPages);
			lastButton.appendChild(lastButtonImg);
			navDiv.appendChild(lastButton);
		}
		if (doc.location.pathname == "/showthread.php" )
		{
			if (Prefs.getPref("lastPostOnNavigator"))
			{
				var lastButtonImg = doc.createElement("img");
				lastButtonImg.title = "Go to First Unread Post";
				lastButtonImg.src = "chrome://salastread/skin/lastpost.png";
				var lastButton = doc.createElement("a");
				lastButton.href = this.editPageNumIntoURI(doc, "goto=newpost");
				lastButton.appendChild(lastButtonImg);
				navDiv.appendChild(lastButton);
			}
			var hasAStar = PageUtils.selectSingleNode(doc, doc, "//img[contains(@class,'thread_bookmark')]");
			if (hasAStar)
			{
				var starButton = doc.createElement("img");
				starButton.src = "http://fi.somethingawful.com/images/buttons/button-bookmark.png";
				starButton.setAttribute('class', 'thread_bookmark'); 
				starButton.style.marginLeft = '0';
				starButton.style.marginRight = '2px';
				starButton.style.marginTop = '1px';
				navDiv.appendChild(starButton);
			}
		}

		doc.body.appendChild(navDiv);
	},

	// Helper function for addPagination()
	editPageNumIntoURI: function(doc, replacement)
	{
		var result;
		if (doc.baseURI.search(/pagenumber=(\d+)/) > -1) // Is the pagenumber already in the uri?
		{
			result = doc.baseURI.replace(/pagenumber=(\d+)/, replacement);
			// If we're in showthread, remove the anchor since it's page specific
			if (doc.location.pathname == "/showthread.php")
			{
				result = result.replace(/#.*/, '');
			}
		}
		else
		{
			if (doc.baseURI.search('#') == -1) // If no anchor, just add it to the end
			{
				result = doc.baseURI + "&" + replacement;
			}
			else
			{
				result = doc.location.pathname + doc.location.search + "&" + replacement + doc.location.hash;
				if (doc.location.pathname == "/showthread.php")
				{
					var perpage = PageUtils.selectSingleNode(doc, doc, "//DIV[contains(@class,'pages')]//A[contains(@href,'threadid=')]");
					var threadid = perpage.href.match(/threadid=(\d+)/i)[1];
					result = doc.location.pathname + "?threadid=" + threadid + "&" + replacement;
				}
			}
		}
		return result;
	},
};
