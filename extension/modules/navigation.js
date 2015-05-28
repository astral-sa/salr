/*

	Functions dealing with navigation (gesture + paginator)

*/

let {Prefs} = require("prefs");
let {PageUtils} = require("pageUtils");

let Navigation = exports.Navigation = 
{
	/**
	 * Adds the quick page jump paginator to a document.
	 * @param {Element} doc Document element to add paginator to.
	 */
	addPagination: function(doc)
	{
		let pages = Navigation.getPagesForDoc(doc);
		if (pages.total === 1)
			return;

		var navDiv = doc.createElement("div");
		navDiv.className = "salastread_pagenavigator";

		// Create first and previous page buttons
		let firstButtonImg = Navigation.createPaginatorButtonImg(doc, "Go to First Page", 
			"chrome://salastread/skin/nav-firstpage.png");
		let prevButtonImg = Navigation.createPaginatorButtonImg(doc, "Go to Previous Page", 
			"chrome://salastread/skin/nav-prevpage.png");
		if (pages.current === 1)
		{
			firstButtonImg.className = "disab";
			navDiv.appendChild(firstButtonImg);
			prevButtonImg.className = "disab";
			navDiv.appendChild(prevButtonImg);
		}
		else
		{
			let firstButton = doc.createElement("a");
			firstButton.href = this.editPageNumIntoURI(doc, "pagenumber=1");
			firstButton.appendChild(firstButtonImg);
			navDiv.appendChild(firstButton);
			let prevButton = doc.createElement("a");
			prevButton.href = this.editPageNumIntoURI(doc, "pagenumber=" + (pages.current-1));
			prevButton.appendChild(prevButtonImg);
			navDiv.appendChild(prevButton);
		}

		// Create select element
		let pageSel = Navigation.createPaginatorSelectBox(doc, pages);
		navDiv.appendChild(pageSel);

		// Create next and last page buttons
		let nextButtonImg = Navigation.createPaginatorButtonImg(doc, "Go to Next Page", 
			"chrome://salastread/skin/nav-nextpage.png");
		let lastButtonImg = Navigation.createPaginatorButtonImg(doc, "Go to Last Page", 
			"chrome://salastread/skin/nav-lastpage.png");
		if (pages.current === pages.total)
		{
			nextButtonImg.className = "disab";
			navDiv.appendChild(nextButtonImg);
			lastButtonImg.className = "disab";
			navDiv.appendChild(lastButtonImg);
		}
		else
		{
			let nextButton = doc.createElement("a");
			nextButton.href = this.editPageNumIntoURI(doc, "pagenumber=" + (pages.current+1));
			nextButton.appendChild(nextButtonImg);
			navDiv.appendChild(nextButton);
			let lastButton = doc.createElement("a");
			lastButton.href = this.editPageNumIntoURI(doc, "pagenumber=" + pages.total);
			lastButton.appendChild(lastButtonImg);
			navDiv.appendChild(lastButton);
		}

		// Extra functionality in threads - Last Post button and bookmark star
		if (doc.location.pathname === "/showthread.php" )
		{
			if (Prefs.getPref("lastPostOnNavigator"))
			{
				let lastPostButtonImg = Navigation.createPaginatorButtonImg(doc, "Go to First Unread Post", 
					"chrome://salastread/skin/lastpost.png");
				let lastPostButton = doc.createElement("a");
				lastPostButton.href = this.editPageNumIntoURI(doc, "goto=newpost");
				lastPostButton.appendChild(lastPostButtonImg);
				navDiv.appendChild(lastPostButton);
			}
			let hasAStar = PageUtils.selectSingleNode(doc, doc, "//img[contains(@class,'thread_bookmark')]");
			if (hasAStar)
			{
				let starButton = doc.createElement("img");
				starButton.src = "http://fi.somethingawful.com/images/buttons/button-bookmark.png";
				starButton.className = 'thread_bookmark';
				navDiv.appendChild(starButton);
			}
		}

		doc.body.appendChild(navDiv);
	},

	/**
	 * Attempts to determine the number of pages in a document.
	 * @param {Element} doc Document element to check.
	 * @return {Object} Object containing total number of pages and current page.
	 */
	getPagesForDoc: function(doc)
	{
		let pageList = PageUtils.selectNodes(doc, doc, "//DIV[contains(@class,'pages')]");
		pageList = pageList[pageList.length-1];
		// Check if there's only one page
		if (pageList.childNodes.length <= 1)
			return {'total': 1, 'current': 1};
		if (!pageList.lastChild || !pageList.lastChild.innerHTML)
			return {'total': 1, 'current': 1};
		let numPages = pageList.lastChild.innerHTML.match(/(\d+)/);
		let curPage = PageUtils.selectSingleNode(doc, pageList, ".//OPTION[@selected='selected']");
		return {'total': parseInt(numPages[1], 10), 'current': parseInt(curPage.innerHTML, 10)};
	},

	/**
	 * Create a button image for our paginator.
	 * @param  {Element} doc   Document element to build in.
	 * @param  {string}  title Title for the image.
	 * @param  {string}  src   Source URL for the image.
	 * @return {Element} Newly created image element.
	 */
	createPaginatorButtonImg: function(doc, title, src)
	{
		let newImg = doc.createElement("img");
		newImg.title = title;
		newImg.src = src;
		return newImg;
	},

	/**
	 * Create the paginator select box.
	 * @param  {Element} doc   Document element to build in.
	 * @param  {Object} pages  Object containing total number of pages and current page.
	 * @return {Element} Newly created select element.
	 */
	createPaginatorSelectBox: function(doc, pages)
	{
		let pageSel = doc.createElement("select");
		pageSel.size = 1;
		for (let pp = 1; pp <= pages.total; pp++)
		{
			let topt = doc.createElement("option");
			topt.text=pp;
			topt.value = pp;
			if (pp === pages.current)
				topt.selected = true;
			pageSel.add(topt);
		}
		if (pages.current === 1 && !doc.baseURI.match(/pagenumber=(\d+)/))
		{
			pageSel.onchange = function() { doc.location = doc.baseURI + "&pagenumber="+this.value; };
		}
		else
		{
			pageSel.onchange = function() {
				if (doc.location.pathname === "/showthread.php")
				{
					let threadid = doc.evaluate("//DIV[contains(@class,'pages')]//A[contains(@href,'threadid=')]", doc, null, 9, null).singleNodeValue.href.match(/threadid=(\d+)/i)[1];
					let hasuserid = doc.baseURI.match(/userid=(\w+)/);
					let uidstring = (!hasuserid) ? '' : '&' + hasuserid[0];
					doc.location = doc.location.pathname+"?threadid="+threadid+"&pagenumber="+this.value+uidstring;
				}
				else
				{
					doc.location = doc.baseURI.replace(/pagenumber=(\d+)/, "pagenumber="+this.value);
				}
			};
		}
		return pageSel;
	},

	// Helper function for addPagination()
	editPageNumIntoURI: function(doc, replacement)
	{
		let result;
		if (doc.baseURI.search(/pagenumber=(\d+)/) > -1) // Is the pagenumber already in the uri?
		{
			result = doc.baseURI.replace(/pagenumber=(\d+)/, replacement);
			// If we're in showthread, remove the anchor since it's page specific
			if (doc.location.pathname === "/showthread.php")
			{
				result = result.replace(/#.*/, '');
			}
		}
		else
		{
			if (doc.baseURI.search('#') === -1) // If no anchor, just add it to the end
			{
				result = doc.baseURI + "&" + replacement;
			}
			else
			{
				result = doc.location.pathname + doc.location.search + "&" + replacement + doc.location.hash;
				if (doc.location.pathname === "/showthread.php")
				{
					let threadid = PageUtils.getThreadId(doc);
					result = doc.location.pathname + "?threadid=" + threadid + "&" + replacement;
				}
			}
		}
		return result;
	},
};
