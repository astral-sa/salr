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
		let firstButton = {
			title: "Go to First Page",
			image: "chrome://salastread/skin/nav-firstpage.png",
			linkreq: pages.current !== 1,
			page: "1"
		};
		Navigation.addPaginatorButton(doc, navDiv, firstButton);

		let prevButton = {
			title: "Go to Previous Page",
			image: "chrome://salastread/skin/nav-prevpage.png",
			linkreq: pages.current !== 1,
			page: (pages.current - 1).toString(10)
		};
		Navigation.addPaginatorButton(doc, navDiv, prevButton);

		// Create select element
		Navigation.addPaginatorSelectBox(doc, pages, navDiv);

		// Create next and last page buttons
		let nextButton = {
			title: "Go to Next Page",
			image: "chrome://salastread/skin/nav-nextpage.png",
			linkreq: pages.current !== pages.total,
			page: (pages.current + 1).toString(10)
		};
		Navigation.addPaginatorButton(doc, navDiv, nextButton);

		let lastButton = {
			title: "Go to Last Page",
			image: "chrome://salastread/skin/nav-lastpage.png",
			linkreq: pages.current !== pages.total,
			page: (pages.total).toString(10)
		};
		Navigation.addPaginatorButton(doc, navDiv, lastButton);

		// Extra functionality in threads - Last Post button and bookmark star
		if (doc.location.pathname === "/showthread.php" )
		{
			Navigation.createPaginatorThreadButtons(doc, navDiv);
		}

		doc.body.appendChild(navDiv);
	},

	/**
	 * Attempts to determine the number of pages in a document.
	 * @param  {Element} doc Document element to check.
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
	 * Creates a button and adds it to the paginator.
	 * @param {Element} doc        Document element to build in.
	 * @param {Element} target     Paginator div to add to.
	 * @param {Object}  buttonInfo Object with necessary button information:
	 *                             title:     Tooltip for button.
	 *                             image:     URL of image to use.
	 *                             linkreq:   Whether or not we add URL. (optional)
	 *                             page:      Page number to add URL for. (optional)
	 */
	addPaginatorButton: function(doc, target, buttonInfo)
	{
		if (!buttonInfo.image)
			return;
		let buttonImg = Navigation.createPaginatorButtonImg(doc, buttonInfo.title, buttonInfo.image);
		if (!buttonInfo.linkreq || !buttonInfo.page)
		{
			buttonImg.className = "disab";
			target.appendChild(buttonImg);
			return;
		}
		Navigation.addPaginatorButtonLink(doc, 
				this.editPageNumIntoURI(doc, "pagenumber=" + buttonInfo.page), 
				buttonImg, target);
	},

	/**
	 * Create a button image for a paginator button.
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
	 * Creates a link around a button image and appends it to a paginator.
	 * @param {Element} doc    Document element to build in.
	 * @param {string}  href   Target for link.
	 * @param {Element} image  Image child to append.
	 * @param {Element} target Paginator div.
	 */
	addPaginatorButtonLink: function(doc, href, image, target)
	{
		let newButton = doc.createElement("a");
		newButton.href = href;
		newButton.appendChild(image);
		target.appendChild(newButton);
	},

	/**
	 * Create and append the paginator select box.
	 * @param {Element} doc    Document element to build in.
	 * @param {Object}  pages  Object containing total number of pages and current page.
	 * @param {Element} navDiv Paginator div.
	 */
	addPaginatorSelectBox: function(doc, pages, navDiv)
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
		navDiv.appendChild(pageSel);
	},

	/**
	 * Create the paginator thread buttons (bookmark + last post)
	 * @param {Element} doc    Document element to build thread buttons in.
	 * @param {Element} navDiv Paginator div element to create children for.
	 */
	createPaginatorThreadButtons: function(doc, navDiv)
	{
		if (Prefs.getPref("lastPostOnNavigator"))
		{
			let lastPostButtonImg = Navigation.createPaginatorButtonImg(doc, "Go to First Unread Post", 
				"chrome://salastread/skin/lastpost.png");
			Navigation.addPaginatorButtonLink(doc, 
				this.editPageNumIntoURI(doc, "goto=newpost"), 
				lastPostButtonImg, navDiv);
		}
		let hasAStar = PageUtils.selectSingleNode(doc, doc, "//img[contains(@class,'thread_bookmark')]");
		if (hasAStar)
		{
			let starButton = doc.createElement("img");
			starButton.src = "http://fi.somethingawful.com/images/buttons/button-bookmark.png";
			starButton.className = 'thread_bookmark';
			navDiv.appendChild(starButton);
		}
	},

	/**
	 * Helper function for addPagination()
	 * @param {Element} doc    Document element to build thread buttons in.
	 * @param {[type]} newPageNum [description]
	 */
	editPageNumIntoURI: function(doc, newPageNum)
	{
		if (doc.baseURI.search(/pagenumber=(\d+)/) > -1) // Is the pagenumber already in the uri?
		{
			let newURI = doc.baseURI;
			// If we're in showthread, remove the anchor since it's page specific
			if (doc.location.pathname === "/showthread.php")
			{
				newURI = newURI.replace(/#.*/, '');
			}
			return newURI.replace(/pagenumber=(\d+)/, newPageNum);
		}
		if (doc.baseURI.search('#') === -1) // No anchor, just add pagenumber to the end
		{
			return doc.baseURI + "&" + newPageNum;
		}
		if (doc.location.pathname === "/showthread.php") // In showthread, special handling
		{
			let threadid = PageUtils.getThreadId(doc);
			return doc.location.pathname + "?threadid=" + threadid + "&" + newPageNum;
		}
		// Has an anchor; not in showthread
		return doc.location.pathname + doc.location.search + "&" + newPageNum + doc.location.hash;
	},
};
