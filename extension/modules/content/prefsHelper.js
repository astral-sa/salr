/**
 * @fileOverview Passes preference requests to chrome code.
 */

let Prefs = exports.Prefs = // eslint-disable-line no-unused-vars
{
	/**
	 * Helper function to set a preference.
	 * Make sure to exclude 'extensions.salastread.'
	 * @param {string} prefName Preference name to set.
	 */
	setPref: function(prefName, prefValue)
	{
		return sendSyncMessage("salastread:SetPref", {prefName, prefValue});
	},

	/**
	 * Helper function to get a preference.
	 * Make sure to exclude 'extensions.salastread.'
	 * @param {string} prefName Preference name to get.
	 */
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
	 * @param {string[]} prefArray Array of prefs to get.
	 * @return {Object} Object with preference values.
	 */
	getMultiplePrefs: function(prefArray)
	{
		return sendSyncMessage("salastread:GetMultiplePrefs", prefArray);
	},

};
