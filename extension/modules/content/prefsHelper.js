/**
 * @fileOverview Passes preference requests to chrome code.
 */

let Prefs = exports.Prefs = // eslint-disable-line no-unused-vars
{
	setPref: function(prefName, prefValue)
	{
		return sendSyncMessage("salastread:SetPref", {prefName, prefValue});
	},
	getPref: function(prefName)
	{
		return sendSyncMessage("salastread:GetPref", prefName);
	},
	resetPref: function(prefName)
	{
		return sendSyncMessage("salastread:ResetPref", prefName);
	},

	/**
	 * Get multiple preferences in one sync message.
	 * @param {Array.string} prefArray Array of prefs to get.
	 * @return {Object} Object with preference values.
	 */
	getMultiplePrefs: function(prefArray)
	{
		return sendSyncMessage("salastread:GetMultiplePrefs", prefArray);
	},

};
