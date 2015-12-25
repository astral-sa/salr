/**
 * @fileOverview Passes db requests to chrome code.
 */

let DB = exports.DB =
{
	setThreadTitle: function(threadid, title)
	{
		sendAsyncMessage("salastread:SetThreadTitle", {threadid, title});
	},

	doWeHaveForumList: function()
	{
		return sendSyncMessage("salastread:DoWeHaveForumList");
	},

	getUserId: function(username)
	{
		return sendSyncMessage("salastread:GetUserId", username);
	},

	setUserName: function(userid, username)
	{
		sendAsyncMessage("salastread:SetUserName", {userid, username});
	},

	toggleAvatarHidden: function(userid, username)
	{
		sendAsyncMessage("salastread:ToggleAvatarHidden", {userid, username});
	},

	isMod: function(userid)
	{
		return sendSyncMessage("salastread:IsMod", userid);
	},

	isAdmin: function(userid)
	{
		return sendSyncMessage("salastread:IsAdmin", userid);
	},

	isUserIgnored: function(userid)
	{
		return sendSyncMessage("salastread:IsUserIgnored", userid);
	},

	isAvatarHidden: function(userid)
	{
		return sendSyncMessage("salastread:IsAvatarHidden", userid);
	},

	isUserIdColored: function(userid)
	{
		return sendSyncMessage("salastread:IsUserIdColored", userid);
	},

	isUsernameColored: function(username)
	{
		return sendSyncMessage("salastread:IsUsernameColored", username);
	},

	addMod: function(userid, username)
	{
		sendAsyncMessage("salastread:AddMod", {userid, username});
	},

	removeMod: function(userid)
	{
		sendAsyncMessage("salastread:RemoveMod", userid);
	},

	removeAdmin: function(userid)
	{
		sendAsyncMessage("salastread:RemoveAdmin", userid);
	},

	addAdmin: function(userid, username)
	{
		sendAsyncMessage("salastread:AddAdmin", {userid, username});
	},

	getPosterNotes: function(userid)
	{
		sendAsyncMessage("salastread:GetPosterNotes", userid);
	},

	didIPostHere: function(threadid)
	{
		return sendSyncMessage("salastread:DidIPostHere", threadid);
	},

	iPostedHere: function(threadid)
	{
		sendAsyncMessage("salastread:IPostedHere", threadid);
	},

	isThreadIgnored: function(threadid)
	{
		return sendSyncMessage("salastread:IsThreadIgnored", threadid);
	},

	isThreadStarred: function(threadid)
	{
		return sendSyncMessage("salastread:IsThreadStarred", threadid);
	},

	// Temporary wrappers to request transaction for forumdisplay
	// will be removed upon conversion to SQLite.jsm
	requestTransactionState: function()
	{
		return sendSyncMessage("salastread:RequestTransactionState");
	},

	beginTransaction: function()
	{
		return sendSyncMessage("salastread:BeginTransaction");
	},

	commitTransaction: function()
	{
		return sendSyncMessage("salastread:CommitTransaction");
	},

};


/* Any DB attrs to access we need to make functions for?
*/
/* Relevant DB functions
		doWeHaveForumList: function()
		getUserId: function(username)
		setUserName: function(userid, username)
	threadExists: function(threadid)
	addThread: function(threadid)
	userExists: function(userid)
	addUser: function(userid, username)
		addMod: function(userid, username)
		removeMod: function(userid)
		addAdmin: function(userid, username)
		removeAdmin: function(userid)
	addSuperIgnored: function (userid, username)
	removeSuperIgnored: function(userid)
		toggleAvatarHidden: function(userid, username)
		isMod: function(userid)
		isAdmin: function(userid)
		isUserIgnored: function(userid)
		isAvatarHidden: function(userid)
		isUserIdColored: function(userid)
		isUsernameColored: function(username)
//	getCustomizedPosters: function()
	getPosterColor: function(userid)
//	setPosterColor: function(userid, color)
	getPosterBackground: function(userid)
//	setPosterBackground: function(userid, color)
		getPosterNotes: function(userid)
//	setPosterNotes: function(userid, note)
	getThreadTitle: function(threadid)
		setThreadTitle: function(threadid, title)
		didIPostHere: function(threadid)
		iPostedHere: function(threadid)
		isThreadStarred: function(threadid)
		isThreadIgnored: function(threadid)
	isThreadOPView: function(threadid)
	toggleThreadOPView: function(threadid)
	toggleThreadStar: function(threadid)
	toggleThreadIgnore: function(threadid)
*/