/*
	// Unused
	//gets the unread posts count for a thread using the built in forum data.
	//@param: document object, title box dom element
	//@return: int number of unread posts
	getThreadUnreadPostCount: function ( doc, titleBox )
	{
		var newPostsBox = this.selectSingleNode(doc,titleBox, "div[contains(@class,'newposts')]");
		var retNewPostCount = 0;

		if ( newPostsBox )
		{
			var countElement = this.selectSingleNode(doc,newPostsBox,"a/b");
			try
			{
				retNewPostCount = parseInt(countElement.innerHTML);
			} catch (e) { }
		}

		return retNewPostCount;
	},

	// Unused
	// Inserts the star
	// @param: doc, TD
	// @return: nothing
	insertStar: function(doc, titleBox)
	{
		try
		{
			var starIcon = doc.createElement("img");
			starIcon.setAttribute("src", "chrome://salastread/skin/star.png");
			starIcon.style.cssFloat = "left";
			starIcon.style.marginRight = "3px";
			starIcon.style.marginLeft = "3px";
			starIcon.style.border = "none";
			titleBox.insertBefore(starIcon, titleBox.getElementsByTagName('a')[0]);
			starIcon.style.marginTop = ((titleBox.clientHeight - 21) / 2) + "px";
		} catch (e) { }
	},
*/