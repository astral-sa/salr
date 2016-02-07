/**
 * @fileOverview Passes db requests to chrome code.
 */

let DB = exports.DB = // eslint-disable-line no-unused-vars
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
		return sendSyncMessage("salastread:GetPosterNotes", userid);
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

	toggleThreadIgnore: function(threadid)
	{
		sendAsyncMessage("salastread:ToggleThreadIgnore", threadid);
	},

	toggleThreadStar: function(threadid)
	{
		sendAsyncMessage("salastread:ToggleThreadStar", threadid);
	},

	getThreadDBFlags: function(threadid)
	{
		return sendSyncMessage("salastread:GetThreadDBFlags", threadid);
	},

	getUserRole: function(userid)
	{
		return sendSyncMessage("salastread:GetUserRole", userid);
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


/* Unimplemented DB functions
	threadExists: function(threadid)
	addThread: function(threadid)
	userExists: function(userid)
	addUser: function(userid, username)
	addSuperIgnored: function (userid, username)
	removeSuperIgnored: function(userid)
//	getCustomizedPosters: function()
	getPosterColor: function(userid)
//	setPosterColor: function(userid, color)
	getPosterBackground: function(userid)
//	setPosterBackground: function(userid, color)
//	setPosterNotes: function(userid, note)
	getThreadTitle: function(threadid)
	isThreadOPView: function(threadid)
	toggleThreadOPView: function(threadid)
*/